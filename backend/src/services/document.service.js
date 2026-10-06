import path from 'path';
import documentRepository from '../repositories/document.repository.js';
import processingJobRepository from '../repositories/processing-job.repository.js';
import sceneRepository from '../repositories/scene.repository.js';
import characterRepository from '../repositories/character.repository.js';
import relationshipRepository from '../repositories/relationship.repository.js';
import timelineEventRepository from '../repositories/timeline-event.repository.js';
import dialogueSummaryRepository from '../repositories/dialogue-summary.repository.js';
import moodAnalysisRepository from '../repositories/mood-analysis.repository.js';
import storyArcRepository from '../repositories/story-arc.repository.js';
import continuityIssueRepository from '../repositories/continuity-issue.repository.js';
import embeddingRepository from '../repositories/embedding.repository.js';
import { uploadFile, deleteFile } from './storage.service.js';
import { pipelineQueue } from '../queues/pipeline.queue.js';
import { DocumentDto } from '../dtos/document.dto.js';
import { NotFoundError } from '../utilities/custom-errors.js';
import STAGES, { STAGE_LIST, STAGE_DEPENDENCIES } from '../constants/stages.js';
import { parseDocumentFile } from '../parsers/document.parser.js';
import { paginate } from './paginator.service.js';
import { wordCount } from '../analysis/local-analyzer.js';
import logger from '../utilities/logger.js';

// STAGE_DEPENDENCIES is imported from constants/stages.js (single source of truth).

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a new document, store the file, prepare text/pagination, and seed job records.
 *
 * @param {string} userId   - Authenticated user's ID
 * @param {Object} file     - Multer file object (req.file)
 * @returns {Promise<DocumentDto>}
 */
const uploadDocument = async (userId, file, options = {}) => {
  const customTitle = typeof options === 'string' ? options : options.title;
  const bookId = typeof options === 'object' ? options.bookId : null;
  const returnRaw = typeof options === 'object' ? Boolean(options.returnRaw) : false;

  const ext = path.extname(file.originalname).toLowerCase().slice(1); // 'pdf' | 'docx' | 'txt'
  const storageKey = `documents/${userId}/${Date.now()}-${file.originalname}`;

  // 1. Persist the file to storage
  const storageUrl = await uploadFile(file, storageKey);

  // 2. Parse text immediately & compute page offsets
  let parsedText = '';
  try {
    parsedText = await parseDocumentFile(storageUrl, ext);
  } catch (parseErr) {
    logger.warn(`Synchronous parse failed, falling back to background parser: ${parseErr.message}`);
  }
  const normalized = parsedText?.trim() || '';
  const pageOffsets = normalized ? paginate(normalized) : [];
  const calculatedWordCount = wordCount(normalized);

  // 3. Create the document record
  const document = await documentRepository.create({
    userId,
    title: customTitle || path.basename(file.originalname, path.extname(file.originalname)),
    originalFilename: file.originalname,
    fileType: ext,
    storageUrl,
    parsedText: normalized,
    wordCount: calculatedWordCount,
    status: normalized ? 'ready' : 'processing',
    ...(bookId && { bookId }),
  });

  // 4. Seed a ProcessingJob record for every stage
  const jobRecords = STAGE_LIST.map((stage) => ({
    documentId: document._id,
    stage,
    status: (stage === STAGES.PARSING && normalized) ? 'completed' : 'queued',
    progress: (stage === STAGES.PARSING && normalized) ? 100 : 0,
    completedAt: (stage === STAGES.PARSING && normalized) ? new Date() : null,
    dependsOn: STAGE_DEPENDENCIES[stage],
  }));
  await processingJobRepository.create(jobRecords);

  // 5. If text parsing failed synchronously, enqueue parsing to BullMQ as fallback
  if (!normalized) {
    await pipelineQueue.add(
      STAGES.PARSING,
      { documentId: document._id.toString(), stage: STAGES.PARSING, storageUrl, fileType: ext },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, jobId: `${document._id}-${STAGES.PARSING}` }
    );
  }

  logger.info(`Document ${document._id} uploaded — manuscript prepared (${pageOffsets.length} pages).`);
  const dto = DocumentDto.toResponse(document);
  return returnRaw ? { document, dto, pageOffsets, pageCount: pageOffsets.length } : dto;
};

/**
 * List all documents belonging to a user, with optional pagination.
 *
 * @param {string} userId
 * @param {number} [page]
 * @param {number} [limit]
 * @returns {Promise<{ results: DocumentDto[], pagination?: object }>}
 */
const getUserDocuments = async (userId, page, limit) => {
  if (page !== undefined && limit !== undefined) {
    const skip = (page - 1) * limit;
    const total = await documentRepository.count({ userId });
    const docs = await documentRepository.findByUserId(userId, { skip, limit });
    return {
      results: DocumentDto.toResponseList(docs),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  const docs = await documentRepository.findByUserId(userId);
  return { results: DocumentDto.toResponseList(docs) };
};

/**
 * Get a single document by ID.
 *
 * @param {string} documentId
 * @returns {Promise<DocumentDto>}
 */
const getDocumentById = async (documentId) => {
  const doc = await documentRepository.findById(documentId);
  if (!doc) throw new NotFoundError('Document not found.');
  return DocumentDto.toResponse(doc);
};

/**
 * Delete a document and cascade-delete all related analysis data.
 *
 * @param {string} documentId
 */
const deleteDocument = async (documentId) => {
  const doc = await documentRepository.findById(documentId);
  if (!doc) throw new NotFoundError('Document not found.');

  // Cascade deletions in parallel
  await Promise.all([
    sceneRepository.deleteMany({ documentId }),
    characterRepository.deleteMany({ documentId }),
    relationshipRepository.deleteMany({ documentId }),
    timelineEventRepository.deleteMany({ documentId }),
    dialogueSummaryRepository.deleteMany({ documentId }),
    moodAnalysisRepository.deleteMany({ documentId }),
    storyArcRepository.deleteMany({ documentId }),
    continuityIssueRepository.deleteMany({ documentId }),
    embeddingRepository.deleteMany({ documentId }),
    processingJobRepository.deleteMany({ documentId }),
  ]);

  // Delete the stored file (best-effort)
  const storageKey = doc.storageUrl.includes('amazonaws.com')
    ? doc.storageUrl.split('.amazonaws.com/')[1]
    : doc.storageUrl;
  await deleteFile(doc.storageUrl, storageKey).catch((err) =>
    logger.warn(`File deletion warning for document ${documentId}: ${err.message}`)
  );

  await documentRepository.deleteById(documentId);
  logger.info(`Document ${documentId} and all related records deleted.`);
};

/**
 * Update a document's title.
 *
 * @param {string} documentId
 * @param {string} userId    - Used to confirm ownership at the service layer.
 * @param {string} title
 * @returns {Promise<DocumentDto>}
 */
const updateDocumentTitle = async (documentId, userId, title) => {
  const doc = await documentRepository.findById(documentId);
  if (!doc) throw new NotFoundError('Document not found.');

  // Service-layer ownership guard (belt-and-suspenders alongside route middleware)
  if (doc.userId.toString() !== userId.toString()) {
    const { ForbiddenError } = await import('../utilities/custom-errors.js');
    throw new ForbiddenError('You do not have access to this document.');
  }

  const updated = await documentRepository.updateById(documentId, { title });
  return DocumentDto.toResponse(updated);
};

export { uploadDocument, getUserDocuments, getDocumentById, deleteDocument, updateDocumentTitle };
