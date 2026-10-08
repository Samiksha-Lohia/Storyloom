import ReadingList from '../models/reading-list.model.js';
import processingJobRepository from '../repositories/processing-job.repository.js';
import STAGES from '../constants/stages.js';
import { FEATURES } from '../constants/feature-access.js';
import * as spoilerService from '../services/spoiler.service.js';
import * as sceneService from '../services/scene.service.js';
import * as characterService from '../services/character.service.js';
import * as relationshipService from '../services/relationship.service.js';
import * as timelineService from '../services/timeline.service.js';
import * as moodService from '../services/mood.service.js';
import * as storyArcService from '../services/storyArc.service.js';
import * as continuityService from '../services/continuity.service.js';
import * as pitchService from '../services/pitch.service.js';
import { triggerAnalysisIfPending, getJobsForDocument } from '../services/analysis.service.js';
import logger from '../utilities/logger.js';
import { BadRequestError } from '../utilities/custom-errors.js';

const FEATURE_TO_STAGE = {
  [FEATURES.SCENES]: STAGES.SCENES,
  [FEATURES.CHARACTERS]: STAGES.CHARACTERS,
  [FEATURES.RELATIONSHIPS]: STAGES.RELATIONSHIPS,
  [FEATURES.TIMELINE]: STAGES.TIMELINE,
  [FEATURES.MOOD]: STAGES.MOOD,
  [FEATURES.ARC]: STAGES.ARC,
  [FEATURES.SEARCH]: STAGES.EMBEDDINGS,
  [FEATURES.ASK]: STAGES.EMBEDDINGS,
  [FEATURES.CONTINUITY]: STAGES.CONTINUITY,
  [FEATURES.PITCH]: STAGES.ARC,
};

async function getAnalysisStatusForFeature(documentId, feature) {
  const stage = FEATURE_TO_STAGE[feature] || feature;
  try {
    const job = await processingJobRepository.findStageJob(documentId, stage);
    if (!job) {
      return {
        stage,
        status: 'queued',
        progress: 0,
        isComplete: false,
      };
    }
    return {
      stage,
      status: job.status,
      progress: job.progress || 0,
      isComplete: job.status === 'completed',
    };
  } catch (_err) {
    return {
      stage,
      status: 'completed',
      progress: 100,
      isComplete: true,
    };
  }
}

async function resolveRequestContext(req) {
  const user = req.user;
  const book = req.book;
  const role = spoilerService.getEffectiveRole(user, book);
  const showAll = req.query.showAll === 'true' || req.query.showAll === true;

  let furthestOffset = 0;

  if (user) {
    const readingEntry = await ReadingList.findOne({
      readerId: user.id,
      bookId: book._id,
    }).lean();
    if (readingEntry && typeof readingEntry.furthestOffset === 'number') {
      furthestOffset = readingEntry.furthestOffset;
    }
  }

  if (req.query.upto) {
    const pageNum = parseInt(req.query.upto, 10);
    if (pageNum > 0 && Array.isArray(book.pageOffsets)) {
      if (book.pageOffsets[pageNum] !== undefined) {
        furthestOffset = book.pageOffsets[pageNum];
      } else {
        furthestOffset = (book.pageOffsets[pageNum - 1] ?? 0) + 1800;
      }
    }
  }

  if (req.query.offset !== undefined) {
    furthestOffset = parseInt(req.query.offset, 10) || 0;
  }

  const documentId = book.documentId?._id || book.documentId;

  if (documentId) {
    triggerAnalysisIfPending(documentId).catch((err) => {
      logger.warn(`Failed to auto-trigger analysis on request for ${documentId}: ${err.message}`);
    });
  }

  return {
    user,
    book,
    documentId,
    role,
    furthestOffset,
    showAll,
  };
}

export class AnalysisController {
  static async triggerProcessing(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const triggered = await triggerAnalysisIfPending(ctx.documentId);
      res.status(200).json({
        success: true,
        message: triggered
          ? 'Narrative insights processing started.'
          : 'Narrative insights processing already active or complete.',
      });
    } catch (err) {
      next(err);
    }
  }
  static async getScenes(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

      const raw = await sceneService.getScenesForDocument(ctx.documentId, page, limit);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.SCENES,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.SCENES);

      res.status(200).json({
        success: true,
        message: 'Scenes retrieved successfully.',
        data: filtered.results !== undefined ? filtered.results : filtered,
        pagination: filtered.pagination,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCharacters(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

      const raw = await characterService.getCharactersForDocument(ctx.documentId, page, limit);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.CHARACTERS,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.CHARACTERS);

      res.status(200).json({
        success: true,
        message: 'Characters retrieved successfully.',
        data: filtered.results !== undefined ? filtered.results : filtered,
        pagination: filtered.pagination,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCharacterById(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const { characterId } = req.params;

      const raw = await characterService.getCharacterById(characterId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.CHARACTERS,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
        single: true,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.CHARACTERS);

      res.status(200).json({
        success: true,
        message: 'Character details retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRelationships(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const raw = await relationshipService.getRelationshipsForDocument(ctx.documentId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.RELATIONSHIPS,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.RELATIONSHIPS);

      res.status(200).json({
        success: true,
        message: 'Relationships retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTimeline(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const raw = await timelineService.getTimelineForDocument(ctx.documentId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.TIMELINE,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.TIMELINE);

      res.status(200).json({
        success: true,
        message: 'Timeline retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMood(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const raw = await moodService.getMoodAnalysisForDocument(ctx.documentId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.MOOD,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.MOOD);

      res.status(200).json({
        success: true,
        message: 'Mood analysis retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getArc(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const raw = await storyArcService.getStoryArcForDocument(ctx.documentId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.ARC,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.ARC);

      res.status(200).json({
        success: true,
        message: 'Story arc retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      if (err.name === 'NotFoundError' || err.status === 404) {
        const ctx = await resolveRequestContext(req).catch(() => ({}));
        const analysisStatus = ctx.documentId
          ? await getAnalysisStatusForFeature(ctx.documentId, FEATURES.ARC)
          : { stage: 'arc', status: 'queued', progress: 0, isComplete: false };
        return res.status(200).json({
          success: true,
          message: 'Story arc has not been generated yet.',
          data: { arcPoints: [], climaxSceneId: null },
          analysisStatus,
        });
      }
      next(err);
    }
  }

  static async getContinuity(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const raw = await continuityService.getContinuityIssuesForDocument(ctx.documentId);
      const filtered = await spoilerService.filterAnalysis({
        feature: FEATURES.CONTINUITY,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.CONTINUITY);

      res.status(200).json({
        success: true,
        message: 'Continuity issues retrieved successfully.',
        data: filtered,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async search(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const query = req.query.q;
      if (!query || !query.trim()) {
        throw new BadRequestError('Query parameter "q" is required for search.');
      }

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      const results = await spoilerService.searchWithSpoilerProtection({
        documentId: ctx.documentId,
        book: ctx.book,
        role: ctx.role,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
        query: query.trim(),
        filters: req.query,
        limit,
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.SEARCH);

      res.status(200).json({
        success: true,
        message: 'Search completed.',
        data: results,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async ask(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const question = req.body?.question;
      if (!question || !question.trim()) {
        throw new BadRequestError('Field "question" is required in request body.');
      }

      const answer = await spoilerService.askWithSpoilerProtection({
        documentId: ctx.documentId,
        book: ctx.book,
        role: ctx.role,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
        question: question.trim(),
      });

      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.ASK);

      res.status(200).json({
        success: true,
        message: 'Question answered.',
        data: answer,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPitch(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const book = ctx.book;
      const raw = await pitchService.getPitchPayload(book._id, req.user);
      const pitchPayload = await spoilerService.filterAnalysis({
        feature: FEATURES.PITCH,
        data: raw,
        role: ctx.role,
        book: ctx.book,
        furthestOffset: ctx.furthestOffset,
        showAll: ctx.showAll,
      });
      const analysisStatus = await getAnalysisStatusForFeature(ctx.documentId, FEATURES.PITCH);

      res.status(200).json({
        success: true,
        message: 'Pitch analysis retrieved successfully.',
        data: pitchPayload,
        analysisStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPipelineStatus(req, res, next) {
    try {
      const ctx = await resolveRequestContext(req);
      const jobs = await getJobsForDocument(ctx.documentId);
      res.status(200).json({
        success: true,
        message: 'Pipeline status retrieved successfully.',
        data: { jobs },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalysisController;

