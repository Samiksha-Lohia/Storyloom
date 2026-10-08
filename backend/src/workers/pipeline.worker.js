import { Worker } from 'bullmq';
import Joi from 'joi';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';
import config from '../config/env.js';
import logger from '../utilities/logger.js';
import STAGES, { STAGE_DEPENDENCIES, STAGE_LIST } from '../constants/stages.js';
import { JOB_STATUSES, DOCUMENT_STATUSES } from '../constants/index.js';
import {
  PIPELINE_QUEUE_NAME,
  pipelineQueue,
} from '../queues/pipeline.queue.js';
import { emitDocumentEvent } from '../socket/index.js';
import { parseDocumentFile } from '../parsers/document.parser.js';
import { generateJSON } from '../services/ai-provider.service.js';
import {
  getAnalysisLanguageInstruction,
  resolveStoryLanguage,
  isHindiLanguage,
  buildWordBoundaryRegex,
} from '../utilities/language.helper.js';

import {
  buildTextEmbedding,
  classifyRole,
  extractCandidateNames,
  moodForScene,
  relationTypeForPair,
  sentimentForText,
  splitIntoScenes,
  summarize,
  traitsForName,
  wordCount,
} from '../analysis/local-analyzer.js';

import Document from '../models/document.model.js';
import Scene from '../models/scene.model.js';
import Character from '../models/character.model.js';
import Relationship from '../models/relationship.model.js';
import TimelineEvent from '../models/timeline-event.model.js';
import DialogueSummary from '../models/dialogue-summary.model.js';
import Book from '../models/book.model.js';
import { maintenanceQueue } from '../queues/maintenance.queue.js';
import MoodAnalysis from '../models/mood-analysis.model.js';
import StoryArc from '../models/story-arc.model.js';
import ContinuityIssue from '../models/continuity-issue.model.js';
import Embedding from '../models/embedding.model.js';
import { BOOK_STATUSES } from '../constants/book.js';

import { paginate } from '../services/paginator.service.js';
import processingJobRepository from '../repositories/processing-job.repository.js';

const normalizeArrayResponse = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    const arrayKey = Object.keys(response).find((key) =>
      Array.isArray(response[key]),
    );

    if (arrayKey) {
      return response[arrayKey];
    }
  }

  return response;
};

let worker = null;

const startPipelineWorker = (io) => {
  if (worker) return worker;

  worker = new Worker(
    PIPELINE_QUEUE_NAME,
    async (job) => processStage(job, io),
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.info(
      `Pipeline stage completed: ${job.name} for document ${job.data.documentId}`,
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      `Pipeline stage failed: ${job?.name || 'unknown'} - ${err.message}`,
    );
  });

  logger.info('SceneCraft pipeline worker started.');

  return worker;
};

const processStage = async (job) => {
  const { documentId, stage } = job.data;

  await markRunning(documentId, stage);

  try {
    const result = await runStage(job);

    await markCompleted(documentId, stage);
    if (stage !== STAGES.PARSING) {
      await enqueueReadyStages(documentId);
    }

    return result;
  } catch (err) {
    await markFailed(documentId, stage, err);
    throw err;
  }
};

const runStage = async (job) => {
  const { stage } = job.data;

  if (stage === STAGES.PARSING) return runParsing(job.data);
  if (stage === STAGES.SCENES) return runScenes(job.data);
  if (stage === STAGES.CHARACTERS) return runCharacters(job.data);
  if (stage === STAGES.RELATIONSHIPS) return runRelationships(job.data);
  if (stage === STAGES.TIMELINE) return runTimeline(job.data);
  if (stage === STAGES.DIALOGUE) return runDialogue(job.data);
  if (stage === STAGES.MOOD) return runMood(job.data);
  if (stage === STAGES.ARC) return runArc(job.data);
  if (stage === STAGES.CONTINUITY) return runContinuity(job.data);
  if (stage === STAGES.EMBEDDINGS) return runEmbeddings(job.data);

  throw new Error(`Unsupported pipeline stage: ${stage}`);
};

const markRunning = async (documentId, stage) => {
  const jobRecord = await processingJobRepository.updateOne(
    { documentId, stage },
    {
      status: JOB_STATUSES.RUNNING,
      progress: 10,
      error: null,
      startedAt: new Date(),
    },
  );

  emitDocumentEvent(documentId, 'pipeline:stage-started', {
    stage,
    job: jobRecord,
  });
};

const markCompleted = async (documentId, stage) => {
  const jobRecord = await processingJobRepository.updateOne(
    { documentId, stage },
    {
      status: JOB_STATUSES.COMPLETED,
      progress: 100,
      completedAt: new Date(),
      error: null,
    },
  );

  emitDocumentEvent(documentId, 'pipeline:stage-completed', {
    stage,
    job: jobRecord,
  });
};

const markFailed = async (documentId, stage, err) => {
  const jobRecord = await processingJobRepository.updateOne(
    { documentId, stage },
    {
      status: JOB_STATUSES.FAILED,
      error: err.message,
      completedAt: new Date(),
    },
  );

  await Document.findByIdAndUpdate(documentId, {
    status: DOCUMENT_STATUSES.FAILED,
  });

  emitDocumentEvent(documentId, 'pipeline:stage-failed', {
    stage,
    job: jobRecord,
    error: err.message,
  });
};

const enqueueReadyStages = async (documentId) => {
  const jobs =
    await processingJobRepository.findByDocumentId(documentId);

  const byStage = new Map(
    jobs.map((item) => [item.stage, item]),
  );

  for (const jobRecord of jobs) {
    if (jobRecord.status !== JOB_STATUSES.QUEUED) continue;

    const dependencies = jobRecord.dependsOn?.length
      ? jobRecord.dependsOn
      : STAGE_DEPENDENCIES[jobRecord.stage] || [];

    const ready = dependencies.every(
      (dependency) =>
        byStage.get(dependency)?.status === JOB_STATUSES.COMPLETED,
    );

    if (!ready) continue;

    await pipelineQueue.add(
      jobRecord.stage,
      {
        documentId: documentId.toString(),
        stage: jobRecord.stage,
      },
      {
        jobId: `${documentId}-${jobRecord.stage}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  const refreshed =
    await processingJobRepository.findByDocumentId(documentId);

  if (
    refreshed.length &&
    refreshed.every(
      (item) => item.status === JOB_STATUSES.COMPLETED,
    )
  ) {
    await Document.findByIdAndUpdate(documentId, {
      status: DOCUMENT_STATUSES.READY,
    });

    emitDocumentEvent(documentId, 'pipeline:document-ready', {
      status: DOCUMENT_STATUSES.READY,
    });

    try {
      const book = await Book.findOne({ documentId });
      if (book) {
        if (book.status === BOOK_STATUSES.PROCESSING) {
          book.status = BOOK_STATUSES.PUBLISHED;
          await book.save();
        }
        await maintenanceQueue.add('generate-pitch', { bookId: book._id.toString() });
      }
    } catch (pitchErr) {
      logger.warn(`Failed to enqueue pitch generation on pipeline ready: ${pitchErr.message}`);
    }
  }
};

const getDocumentWithText = (documentId) =>
  Document.findById(documentId).select('+parsedText');

const getScenesWithText = (documentId) =>
  Scene.find({ documentId })
    .select('+rawText')
    .sort({ sceneNumber: 1 });

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractQuotesForCharacter = (text = '', name) => {
  const quoteRegex = /"([^"]{4,180})"/g;

  return [...text.matchAll(quoteRegex)]
    .map((match) => match[1])
    .filter(
      (quote) =>
        quote.toLowerCase().includes(name.toLowerCase()) ||
        quote.length < 120,
    )
    .slice(0, 3);
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'but',
  'or',
  'for',
  'nor',
  'on',
  'at',
  'to',
  'by',
  'of',
  'he',
  'she',
  'it',
  'they',
  'we',
  'you',
  'i',
  'his',
  'her',
  'its',
  'their',
  'our',
  'your',
  'my',
  'him',
  'them',
  'us',
  'me',
  'this',
  'that',
  'these',
  'those',
  'who',
  'whom',
  'whose',
  'which',
  'what',
  'why',
  'how',
  'when',
  'where',
  'then',
  'there',
  'here',
  'now',
  'so',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'can',
  'could',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'no',
  'not',
  'yes',
  'ok',
  'okay',
  'well',
  'though',
  'although',
  'if',
  'unless',
  'until',
  'since',
  'because',
  'as',
  'than',
  'up',
  'down',
  'out',
  'in',
  'into',
  'over',
  'under',
  'again',
  'once',
  'one',
  'two',
  'three',
  'first',
  'second',
  'third',
]);

const NAME_PATTERN_FROM_TEXT = (text) => {
  const candidates =
    text.match(/\b[A-Z][a-z]+\b/g) || [];

  const firstName = candidates.find(
    (candidate) =>
      !STOPWORDS.has(candidate.toLowerCase()),
  );

  return firstName
    ? new RegExp(
        `\\b${escapeRegex(firstName)}\\b`,
        'i',
      )
    : /$a/;
};

const runParsing = async ({
  documentId,
  storageUrl,
  fileType,
}) => {
  const doc = await getDocumentWithText(documentId);

  const parsedText = storageUrl
    ? await parseDocumentFile(storageUrl, fileType)
    : doc?.parsedText;

  const normalized = parsedText?.trim() || '';

  await Document.findByIdAndUpdate(documentId, {
    parsedText: normalized,
    wordCount: wordCount(normalized),
    status: DOCUMENT_STATUSES.PROCESSING,
  });

  const book = await Book.findOne({ documentId });
  if (book) {
    const pageOffsets = paginate(normalized);
    const pageCount = pageOffsets.length;

    book.pageOffsets = pageOffsets;
    book.pageCount = pageCount;
    if (book.status === BOOK_STATUSES.PROCESSING) {
      book.status = BOOK_STATUSES.DRAFT;
    }
    await book.save();

    emitDocumentEvent(documentId, 'pipeline:paginated', { pageCount });
  }

  return {
    wordCount: wordCount(normalized),
  };
};

const runScenes = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const langInstruction = getAnalysisLanguageInstruction(language);

  if (config.ai.provider === 'local') {
    const doc = await getDocumentWithText(documentId);

    const scenes = splitIntoScenes(
      doc?.parsedText || '',
      language,
    );

    await Scene.deleteMany({ documentId });

    if (scenes.length) {
      await Scene.insertMany(
        scenes.map((scene) => ({
          ...scene,
          documentId,
        })),
      );
    }

    await Document.findByIdAndUpdate(documentId, {
      totalScenes: scenes.length,
    });

    return {
      totalScenes: scenes.length,
    };
  }

  const doc = await getDocumentWithText(documentId);
  const parsedText = doc?.parsedText || '';

  if (!parsedText.trim()) {
    await Scene.deleteMany({ documentId });

    await Document.findByIdAndUpdate(documentId, {
      totalScenes: 0,
    });

    return {
      totalScenes: 0,
    };
  }

  const prompt = `Analyze the following story text and break it down into consecutive scenes.

Return ONLY a valid JSON array.

Each scene object MUST contain EXACTLY these fields:
- sceneNumber: integer
- title: short string
- summary: 2-sentence string
- location: string
- sceneText: exact text copied from the original story

IMPORTANT:
- "title" is REQUIRED for every scene.
- Use "location", NOT "primaryLocation".
- Do NOT include "primaryLocation".
- Do NOT include any fields other than sceneNumber, title, summary, location, and sceneText.
- sceneText must be copied exactly from the original text.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Story text:
${parsedText}`;

  const schemaHint = {
    type: 'ARRAY',
    description:
      'List of consecutive scenes detected in the text.',
    items: {
      type: 'OBJECT',
      properties: {
        sceneNumber: {
          type: 'INTEGER',
        },
        title: {
          type: 'STRING',
        },
        summary: {
          type: 'STRING',
          description:
            'A 2-sentence summary of the scene.',
        },
        location: {
          type: 'STRING',
          description:
            'The location where the scene takes place.',
        },
        sceneText: {
          type: 'STRING',
          description:
            'The exact text corresponding to this scene from the original text.',
        },
      },
      required: [
        'sceneNumber',
        'title',
        'summary',
        'location',
        'sceneText',
      ],
    },
  };

  let processedScenes = [];

  try {
    const rawScenes = await generateJSON(
      prompt,
      schemaHint,
      STAGES.SCENES
    );

    const normalizedScenes =
      normalizeArrayResponse(rawScenes);

    const schemaJoi = Joi.array()
      .items(
        Joi.object({
          sceneNumber: Joi.number()
            .integer()
            .required(),
          title: Joi.string().required(),
          summary: Joi.string().required(),
          location: Joi.string()
            .allow('')
            .default(''),
          sceneText: Joi.string().required(),
        }).unknown(true),
      )
      .required();

    const {
      value: validatedScenes,
      error,
    } = schemaJoi.validate(normalizedScenes);

    if (error) {
      throw new Error(
        `Scene breakdown validation failed: ${error.message}`,
      );
    }

    let lastIndex = 0;
    for (const scene of validatedScenes) {
      const sceneText = scene.sceneText;

      let start = parsedText.indexOf(
        sceneText,
        lastIndex,
      );

      if (start === -1) {
        start = parsedText.indexOf(sceneText);
      }

      const safeStart =
        start !== -1 ? start : lastIndex;

      const end = safeStart + sceneText.length;

      lastIndex = end;

      processedScenes.push({
        documentId,
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        summary: scene.summary,
        location: scene.location,
        textRange: {
          start: safeStart,
          end,
        },
        wordCount: wordCount(sceneText),
        rawText: sceneText,
      });
    }
  } catch (err) {
    logger.warn(`OpenRouter scenes stage failed (${err.message}). Falling back to local scene analyzer.`);
    const scenes = splitIntoScenes(parsedText, language);
    processedScenes = scenes.map((s) => ({
      ...s,
      documentId,
    }));
  }

  await Scene.deleteMany({ documentId });

  if (processedScenes.length) {
    await Scene.insertMany(processedScenes);
  }

  await Document.findByIdAndUpdate(documentId, {
    totalScenes: processedScenes.length,
  });

  return {
    totalScenes: processedScenes.length,
  };
};

const runCharacters = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const langInstruction = getAnalysisLanguageInstruction(language);
  const isHindi = isHindiLanguage(language);

  if (config.ai.provider === 'local') {
    const doc = await getDocumentWithText(documentId);
    const scenes = await getScenesWithText(documentId);

    const candidates = extractCandidateNames(
      doc?.parsedText || '',
      language,
    );

    await Character.deleteMany({ documentId });

    const characters = await Character.insertMany(
      candidates.map((candidate, index) => {
        const sceneIds = scenes
          .filter((scene) =>
            buildWordBoundaryRegex(candidate.name).test(scene.rawText || ''),
          )
          .map((scene) => scene._id);

        return {
          documentId,
          name: candidate.name,
          role: classifyRole(
            index,
            candidates.length,
          ),
          traits: traitsForName(
            candidate.name,
            doc?.parsedText || '',
            language,
          ),
          description: isHindi
            ? `${candidate.name} कहानी के ${sceneIds.length} दृश्य में उपस्थित है।`
            : `${candidate.name} appears in ${sceneIds.length} scene${sceneIds.length === 1 ? '' : 's'}.`,
          sceneIds,
        };
      }),
    );

    for (const scene of scenes) {
      const characterIds = characters
        .filter((character) =>
          buildWordBoundaryRegex(character.name).test(scene.rawText || ''),
        )
        .map((character) => character._id);

      await Scene.findByIdAndUpdate(
        scene._id,
        { characterIds },
      );
    }

    return {
      totalCharacters: characters.length,
    };
  }

  const doc = await getDocumentWithText(documentId);
  const scenes = await getScenesWithText(documentId);
  const parsedText = doc?.parsedText || '';

  const prompt = `Analyze the following story text and identify all actual characters.

Return ONLY a valid JSON array.

Each character object MUST contain EXACTLY these fields:
- name: the character's primary name
- aliases: array of alternative names or references
- role: one of "protagonist", "antagonist", or "supporting"
- traits: array of personality or physical traits
- description: short description of the character
- arcSummary: short summary of the character's narrative development

IMPORTANT:
- "name" is REQUIRED and MUST be a non-empty string.
- Every character object MUST have a valid name.
- Do NOT create character objects without a name.
- Do NOT use "characterName"; use "name".
- Do NOT use "primaryName"; use "name".
- Ignore unnamed/background entities that cannot be given a meaningful name.
- Return ONLY the JSON array.
- Do NOT return markdown or explanations.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Story text:
${parsedText}`;

  const schemaHint = {
    type: 'ARRAY',
    description:
      'List of characters extracted from the story.',
    items: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
        },
        aliases: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
          },
        },
        role: {
          type: 'STRING',
          enum: [
            'protagonist',
            'antagonist',
            'supporting',
          ],
        },
        traits: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
          },
        },
        description: {
          type: 'STRING',
        },
        arcSummary: {
          type: 'STRING',
        },
      },
      required: [
        'name',
        'aliases',
        'role',
        'traits',
        'description',
        'arcSummary',
      ],
    },
  };

  let insertedCharacters = [];

  try {
    const rawCharacters = await generateJSON(
      prompt,
      schemaHint,
      STAGES.CHARACTERS
    );

    const normalizedCharacters =
      normalizeArrayResponse(rawCharacters);

    const characterJoi = Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          aliases: Joi.array()
            .items(Joi.string())
            .default([]),
          role: Joi.string()
            .valid(
              'protagonist',
              'antagonist',
              'supporting',
            )
            .default('supporting'),
          traits: Joi.array()
            .items(Joi.string())
            .default([]),
          description: Joi.string()
            .allow('')
            .default(''),
          arcSummary: Joi.string()
            .allow('')
            .default(''),
        }).unknown(true),
      )
      .required();

    const {
      value: validatedCharacters,
      error,
    } = characterJoi.validate(
      normalizedCharacters,
    );

    if (error) {
      throw new Error(
        `Character extraction validation failed: ${error.message}`,
      );
    }

    await Character.deleteMany({ documentId });

    const charactersToInsert =
      validatedCharacters.map((candidate) => {
        const sceneIds = scenes
          .filter((scene) => {
            const text = scene.rawText || '';
            const nameMatch = buildWordBoundaryRegex(candidate.name).test(text);
            const aliasMatch = candidate.aliases?.some((alias) =>
              buildWordBoundaryRegex(alias).test(text),
            );

            return nameMatch || aliasMatch;
          })
          .map((scene) => scene._id);

        return {
          documentId,
          name: candidate.name,
          aliases: candidate.aliases,
          role: candidate.role,
          traits: candidate.traits,
          description: candidate.description,
          arcSummary: candidate.arcSummary,
          sceneIds,
        };
      });

    insertedCharacters =
      await Character.insertMany(
        charactersToInsert,
      );
  } catch (err) {
    logger.warn(`OpenRouter characters stage failed (${err.message}). Falling back to local character analyzer.`);
    const candidates = extractCandidateNames(doc?.parsedText || '', language);
    await Character.deleteMany({ documentId });

    insertedCharacters = await Character.insertMany(
      candidates.map((candidate, index) => {
        const sceneIds = scenes
          .filter((scene) =>
            buildWordBoundaryRegex(candidate.name).test(scene.rawText || ''),
          )
          .map((scene) => scene._id);

        return {
          documentId,
          name: candidate.name,
          role: classifyRole(index, candidates.length),
          traits: traitsForName(candidate.name, doc?.parsedText || '', language),
          description: isHindi
            ? `${candidate.name} कहानी के ${sceneIds.length} दृश्य में उपस्थित मुख्य पात्र है।`
            : `${candidate.name} is a key figure appearing across ${sceneIds.length} scene(s).`,
          arcSummary: isHindi
            ? `${candidate.name} की भूमिका कहानी के उतार-चढ़ाव में महत्वपूर्ण है।`
            : `${candidate.name}'s trajectory unfolds across the narrative arc.`,
          sceneIds,
        };
      }),
    );
  }

  for (const scene of scenes) {
    const characterIds = insertedCharacters
      .filter((character) => {
        const text = scene.rawText || '';
        const nameMatch = buildWordBoundaryRegex(character.name).test(text);
        const aliasMatch = character.aliases?.some((alias) =>
          buildWordBoundaryRegex(alias).test(text),
        );

        return nameMatch || aliasMatch;
      })
      .map((character) => character._id);

    await Scene.findByIdAndUpdate(
      scene._id,
      { characterIds },
    );
  }

  return {
    totalCharacters: insertedCharacters.length,
  };
};

const runRelationships = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const langInstruction = getAnalysisLanguageInstruction(language);
  const isHindi = isHindiLanguage(language);

  if (config.ai.provider === 'local') {
    const scenes = await getScenesWithText(documentId);

    const characters =
      await Character.find({ documentId }).sort({
        name: 1,
      });

    await Relationship.deleteMany({
      documentId,
    });

    const relationships = [];

    for (
      let i = 0;
      i < characters.length;
      i += 1
    ) {
      for (
        let j = i + 1;
        j < characters.length;
        j += 1
      ) {
        const a = characters[i];
        const b = characters[j];

        const sharedScenes = scenes.filter((scene) => {
          const text = (scene.rawText || '').toLowerCase();
          const matchesChar = (char) => {
            if (char.name && text.includes(char.name.toLowerCase())) return true;
            if (Array.isArray(char.aliases)) {
              for (const alias of char.aliases) {
                if (alias && text.includes(alias.toLowerCase())) return true;
              }
            }
            return false;
          };

          return matchesChar(a) && matchesChar(b);
        });

        if (!sharedScenes.length) continue;

        const combined = sharedScenes
          .map((scene) => scene.rawText)
          .join('\n');

        relationships.push({
          documentId,
          characterAId: a._id,
          characterBId: b._id,
          type: relationTypeForPair(combined),
          sentimentScore:
            sentimentForText(combined),
          sentimentBySceneId:
            Object.fromEntries(
              sharedScenes.map((scene) => [
                scene._id.toString(),
                sentimentForText(
                  scene.rawText,
                ),
              ]),
            ),
          sceneIds: sharedScenes.map(
            (scene) => scene._id,
          ),
        });
      }
    }

    if (relationships.length) {
      await Relationship.insertMany(
        relationships,
      );
    }

    return {
      totalRelationships:
        relationships.length,
    };
  }

  const scenes =
    await getScenesWithText(documentId);

  const characters =
    await Character.find({ documentId }).sort({
      name: 1,
    });

  await Relationship.deleteMany({
    documentId,
  });

  if (!characters.length || !scenes.length) {
    return {
      totalRelationships: 0,
    };
  }

  const charactersListFormatted = characters
    .map((c) => {
      const aliasText = c.aliases?.length ? ` (Aliases / Nicknames: ${c.aliases.join(', ')})` : '';
      const roleText = c.role ? ` [Role: ${c.role}]` : '';
      return `- ${c.name}${aliasText}${roleText}${c.description ? `: ${c.description}` : ''}`;
    })
    .join('\n');

  const scenesListFormatted = scenes
    .map(
      (scene) =>
        `Scene ${scene.sceneNumber}: "${scene.title}" (ID: ${scene._id})\nText:\n${scene.rawText || scene.summary || ''}`,
    )
    .join('\n\n');

  const prompt = `Analyze the relationships and interactions between characters in this story.

Carefully read each scene's text and identify how characters interact, converse, support, oppose, or relate to one another.

Character Name & Alias Handling:
- Characters may be referred to by their primary names or any of their aliases/nicknames (or first-person pronouns if the narrator).
- Always map characters back to their exact primary name from the Characters list for characterAName and characterBName.

For each pair of characters that interact in the story, return:
- characterAName: exact primary name of character A from the Characters list
- characterBName: exact primary name of character B from the Characters list
- type: one of "romantic", "family", "rival", "mentor", "ally", or "other"
- sentimentScore: overall sentiment number from -1.0 (strongly hostile/rival) to 1.0 (strongly positive/loving/supportive)
- interactions: array of objects representing their interactions in specific scenes. Each object must contain:
  * sceneId: The exact ID string (e.g. "60c72b2f9b1d8a25c8d01b52") of the scene from the Scenes list below
  * sentimentScore: sentiment score of their interaction in this scene (number from -1.0 to 1.0)
  * justification: brief explanation of their interaction in this scene

IMPORTANT:
- Return ONLY a valid JSON array.
- Every interacting character pair should have an entry in the array.
- characterAName is REQUIRED.
- characterBName is REQUIRED.
- Use the primary names from the Characters list.
- If there are no relationships or interactions in the story, return [].
- Do NOT return markdown or explanations.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Characters list:
${charactersListFormatted}

Scenes list:
${scenesListFormatted}
`;

  const schemaHint = {
    type: 'ARRAY',
    description:
      'List of relationships between characters.',
    items: {
      type: 'OBJECT',
      properties: {
        characterAName: {
          type: 'STRING',
        },
        characterBName: {
          type: 'STRING',
        },
        type: {
          type: 'STRING',
          enum: [
            'romantic',
            'family',
            'rival',
            'mentor',
            'ally',
            'other',
          ],
        },
        sentimentScore: {
          type: 'NUMBER',
        },
        interactions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              sceneId: {
                type: 'STRING',
                description: 'The exact ID of the scene from the Scenes list (e.g. "60c72b2f9b1d8a25c8d01b52")',
              },
              sentimentScore: {
                type: 'NUMBER',
              },
              justification: {
                type: 'STRING',
              },
            },
            required: [
              'sceneId',
              'sentimentScore',
              'justification',
            ],
          },
        },
      },
      required: [
        'characterAName',
        'characterBName',
        'type',
        'sentimentScore',
        'interactions',
      ],
    },
  };

  let relationshipsToInsert = [];

  try {
    const rawRelationships =
      await generateJSON(
        prompt,
        schemaHint,
        STAGES.RELATIONSHIPS
      );

  const sceneResolverMap = new Map();
  for (const scene of scenes) {
    const sId = scene._id.toString();
    sceneResolverMap.set(sId.toLowerCase(), scene._id);
    sceneResolverMap.set(scene.sceneNumber.toString(), scene._id);
    sceneResolverMap.set(`scene ${scene.sceneNumber}`, scene._id);
    sceneResolverMap.set(scene.title.toLowerCase(), scene._id);
  }

  const resolveSceneId = (value) => {
    if (!value) return null;
    const valStr = String(value).trim().toLowerCase();
    
    if (sceneResolverMap.has(valStr)) {
      return sceneResolverMap.get(valStr);
    }
    
    const objIdMatch = valStr.match(/[0-9a-f]{24}/i);
    if (objIdMatch && sceneResolverMap.has(objIdMatch[0])) {
      return sceneResolverMap.get(objIdMatch[0]);
    }
    
    const sceneNumMatch = valStr.match(/(?:scene|sc)\s*(?:number|no|:)?\s*(\d+)/i);
    if (sceneNumMatch && sceneResolverMap.has(sceneNumMatch[1])) {
      return sceneResolverMap.get(sceneNumMatch[1]);
    }
    
    for (const scene of scenes) {
      if (valStr.includes(scene.title.toLowerCase())) {
        return scene._id;
      }
    }
    
    return null;
  };

  const normalizedRelationships = normalizeArrayResponse(
    rawRelationships,
  ).map((rel) => {
    if (typeof rel === 'string') {
      let characterAName = 'Unknown A';
      let characterBName = 'Unknown B';
      let type = 'other';
      const parts = rel.split(/:| - | is /);
      if (parts.length >= 2) {
        type = parts[parts.length - 1].trim().toLowerCase();
        const namesPart = parts[0];
        const names = namesPart.split(/ and | to | with /i);
        if (names.length >= 2) {
          characterAName = names[0].trim();
          characterBName = names[1].trim();
        }
      }
      return {
        characterAName,
        characterBName,
        type,
        sentimentScore: 0,
        interactions: [],
      };
    }

    if (!rel || typeof rel !== 'object') {
      return {
        characterAName: 'Unknown A',
        characterBName: 'Unknown B',
        type: 'other',
        sentimentScore: 0,
        interactions: [],
      };
    }

    const characterAName =
      rel.characterAName ||
      rel.characterA ||
      rel.charA ||
      rel.nameA ||
      rel.character_a ||
      rel.characterNameA;

    const characterBName =
      rel.characterBName ||
      rel.characterB ||
      rel.charB ||
      rel.nameB ||
      rel.character_b ||
      rel.characterNameB;

    let type = rel.type || 'other';
    if (typeof type === 'string') {
      type = type.toLowerCase().trim();
      const validTypes = ['romantic', 'family', 'rival', 'mentor', 'ally', 'other'];
      if (!validTypes.includes(type)) {
        type = 'other';
      }
    }

    let interactions = rel.interactions;
    if (Array.isArray(interactions)) {
      interactions = interactions.map((inter) => {
        if (typeof inter === 'string') {
          const resolvedId = resolveSceneId(inter);
          if (!resolvedId) return null;
          return {
            sceneId: resolvedId.toString(),
            sentimentScore: typeof rel.sentimentScore === 'number' ? rel.sentimentScore : 0,
            justification: inter,
          };
        }

        if (!inter || typeof inter !== 'object') {
          return null;
        }

        const resolvedId = resolveSceneId(inter.sceneId);
        if (!resolvedId) return null;

        return {
          sceneId: resolvedId.toString(),
          sentimentScore: typeof inter.sentimentScore === 'number' ? inter.sentimentScore : 0,
          justification: inter.justification || '',
        };
      }).filter(Boolean);
    } else {
      interactions = [];
    }

    return {
      characterAName: characterAName || 'Unknown A',
      characterBName: characterBName || 'Unknown B',
      type,
      sentimentScore: typeof rel.sentimentScore === 'number' ? rel.sentimentScore : 0,
      interactions,
    };
  });

  const relationshipJoi = Joi.array()
    .items(
      Joi.object({
        characterAName:
          Joi.string().required(),

        characterBName:
          Joi.string().required(),

        type: Joi.string()
          .valid(
            'romantic',
            'family',
            'rival',
            'mentor',
            'ally',
            'other',
          )
          .default('other'),

        sentimentScore: Joi.number()
          .min(-1)
          .max(1)
          .default(0),

        interactions: Joi.array()
          .items(
            Joi.object({
              sceneId:
                Joi.string().required(),

              sentimentScore:
                Joi.number()
                  .min(-1)
                  .max(1)
                  .required(),

              justification:
                Joi.string()
                  .allow('')
                  .default(''),
            }).unknown(true),
          )
          .default([]),
      }).unknown(true),
    )
    .required();

  const {
    value: validatedRelationships,
    error,
  } = relationshipJoi.validate(
    normalizedRelationships,
  );

  if (error) {
    throw new Error(
      `Relationships validation failed: ${error.message}`,
    );
  }

  const nameToCharMap = new Map(
    characters.map((character) => [
      character.name.toLowerCase().trim(),
      character,
    ]),
  );

  for (const character of characters) {
    if (character.aliases) {
      for (const alias of character.aliases) {
        if (alias && typeof alias === 'string') {
          nameToCharMap.set(
            alias.toLowerCase().trim(),
            character,
          );
        }
      }
    }
  }

  const resolveCharacter = (inputName) => {
    if (!inputName || typeof inputName !== 'string') return null;
    const clean = inputName.trim().toLowerCase();
    if (!clean) return null;

    if (nameToCharMap.has(clean)) {
      return nameToCharMap.get(clean);
    }

    for (const character of characters) {
      const charName = character.name.toLowerCase().trim();
      if (clean === charName || clean.includes(charName) || charName.includes(clean)) {
        return character;
      }
      if (Array.isArray(character.aliases)) {
        for (const alias of character.aliases) {
          if (!alias || typeof alias !== 'string') continue;
          const aliasLower = alias.toLowerCase().trim();
          if (clean === aliasLower || clean.includes(aliasLower) || aliasLower.includes(clean)) {
            return character;
          }
        }
      }
    }

    return null;
  };

  const processedPairs = new Set();

  for (const relationship of validatedRelationships) {
    const charA = resolveCharacter(relationship.characterAName);
    const charB = resolveCharacter(relationship.characterBName);

    if (!charA || !charB) continue;
    if (charA._id.toString() === charB._id.toString()) continue;

    const pairKey = [charA._id.toString(), charB._id.toString()].sort().join('_');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const sentimentBySceneId = new Map();
    const sceneIds = [];

    for (const interaction of relationship.interactions) {
      sentimentBySceneId.set(
        interaction.sceneId,
        interaction.sentimentScore,
      );

      sceneIds.push(
        new mongoose.Types.ObjectId(interaction.sceneId)
      );
    }

    relationshipsToInsert.push({
      documentId,
      characterAId: charA._id,
      characterBId: charB._id,
      type: relationship.type,
      sentimentScore:
        relationship.sentimentScore,
      sentimentBySceneId,
      sceneIds,
    });
  }
  } catch (err) {
    logger.warn(`OpenRouter relationships stage failed (${err.message}). Falling back to local relationship analyzer.`);
    relationshipsToInsert = [];
    for (let i = 0; i < characters.length; i += 1) {
      for (let j = i + 1; j < characters.length; j += 1) {
        const a = characters[i];
        const b = characters[j];

        const sharedScenes = scenes.filter((scene) => {
          const text = (scene.rawText || '').toLowerCase();
          const matchesChar = (char) => {
            if (char.name && text.includes(char.name.toLowerCase())) return true;
            if (Array.isArray(char.aliases)) {
              for (const alias of char.aliases) {
                if (alias && text.includes(alias.toLowerCase())) return true;
              }
            }
            return false;
          };
          return matchesChar(a) && matchesChar(b);
        });

        if (!sharedScenes.length) continue;

        const combinedText = sharedScenes.map((s) => s.rawText || '').join(' ');
        const sentimentScore = sentimentForText(combinedText);
        const type = relationTypeForPair(combinedText);

        relationshipsToInsert.push({
          documentId,
          characterAId: a._id,
          characterBId: b._id,
          type,
          sentimentScore,
          sentimentBySceneId: new Map(sharedScenes.map((s) => [s._id.toString(), sentimentForText(s.rawText || '')])),
          sceneIds: sharedScenes.map((s) => s._id),
        });
      }
    }
  }

  await Relationship.deleteMany({
    documentId,
  });

  if (relationshipsToInsert.length) {
    await Relationship.insertMany(
      relationshipsToInsert,
    );
  }

  return {
    totalRelationships:
      relationshipsToInsert.length,
  };
};

const runTimeline = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const langInstruction = getAnalysisLanguageInstruction(language);
  const isHindi = isHindiLanguage(language);
  const flashbackRegex = /(?:\b(earlier|remembered|flashback|years ago|past|memory)\b|साल पहले|वर्ष पहले|याद आया|स्मृति|अतीत|बचपन में|पहले की बात)/i;

  if (config.ai.provider === 'local') {
    const scenes = await Scene.find({
      documentId,
    }).sort({
      sceneNumber: 1,
    });

    await TimelineEvent.deleteMany({
      documentId,
    });

    if (scenes.length) {
      await TimelineEvent.insertMany(
        scenes.map((scene, index) => {
          const isFlashback = flashbackRegex.test(scene.summary || '');
          const defaultLabel = isHindi ? `दृश्य ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`;
          return {
            documentId,
            sceneId: scene._id,
            chronologicalOrder: index + 1,
            timeLabel: isFlashback ? (isHindi ? 'अतीत की स्मृति' : 'Past memory') : defaultLabel,
            isFlashback,
          };
        }),
      );
    }

    return {
      totalTimelineEvents: scenes.length,
    };
  }

  const scenes = await Scene.find({
    documentId,
  }).sort({
    sceneNumber: 1,
  });

  await TimelineEvent.deleteMany({
    documentId,
  });

  if (!scenes.length) {
    return {
      totalTimelineEvents: 0,
    };
  }

  const prompt = `Analyze the narrative timeline of the following scenes.

Identify any time markers and determine the chronological order of the scenes. Also detect if each scene is a flashback.

Return ONLY a valid JSON array.

Each object MUST contain:
- sceneNumber: the exact scene number from the provided scenes list
- chronologicalOrder: integer representing the chronological position
- timeLabel: string describing the time period or marker
- isFlashback: boolean

IMPORTANT:
- Use the exact sceneNumber provided in the Scenes list.
- Do NOT generate sceneId.
- Do NOT invent or modify scene numbers.
- Every scene should have one timeline object.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Scenes list:
${scenes
  .map(
    (scene) =>
      `Scene ${scene.sceneNumber}: "${scene.title}" (ID: ${scene._id})\nSummary: ${scene.summary}`,
  )
  .join('\n')}
`;

  const schemaHint = {
    type: 'ARRAY',
    description:
      'Chronological ordering and flashback analysis of scenes.',
    items: {
      type: 'OBJECT',
      properties: {
        sceneNumber: {
          type: 'INTEGER',
        },
        chronologicalOrder: {
          type: 'INTEGER',
        },
        timeLabel: {
          type: 'STRING',
        },
        isFlashback: {
          type: 'BOOLEAN',
        },
      },
      required: [
        'sceneNumber',
        'chronologicalOrder',
        'timeLabel',
        'isFlashback',
      ],
    },
  };

  let timelineEventsToInsert = [];

  try {
    const rawTimeline =
      await generateJSON(
        prompt,
        schemaHint,
        STAGES.TIMELINE
      );

    const normalizedTimeline =
      normalizeArrayResponse(
        rawTimeline,
      );

    const timelineJoi = Joi.array()
      .items(
        Joi.object({
          sceneNumber:
            Joi.number().integer().required(),

          chronologicalOrder:
            Joi.number().integer().required(),

          timeLabel: Joi.string()
            .allow('')
            .default(''),

          isFlashback:
            Joi.boolean().default(false),
        }).unknown(true),
      )
      .required();

    const {
      value: validatedTimeline,
      error,
    } = timelineJoi.validate(
      normalizedTimeline,
    );

    if (error) {
      throw new Error(
        `Timeline validation failed: ${error.message}`,
      );
    }

    const sceneByNumber = new Map(
      scenes.map((scene) => [
        scene.sceneNumber,
        scene,
      ]),
    );

    const seenSceneIds = new Set();
    const cleanList = [];

    for (const item of validatedTimeline) {
      const scene = sceneByNumber.get(item.sceneNumber);
      if (!scene) continue;
      const sceneIdStr = scene._id.toString();
      if (seenSceneIds.has(sceneIdStr)) continue;
      seenSceneIds.add(sceneIdStr);

      cleanList.push({
        documentId,
        sceneId: scene._id,
        chronologicalOrder: item.chronologicalOrder || (cleanList.length + 1),
        timeLabel: item.timeLabel || (isHindi ? `दृश्य ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`),
        isFlashback: Boolean(item.isFlashback),
      });
    }

    for (const scene of scenes) {
      const sceneIdStr = scene._id.toString();
      if (!seenSceneIds.has(sceneIdStr)) {
        seenSceneIds.add(sceneIdStr);
        cleanList.push({
          documentId,
          sceneId: scene._id,
          chronologicalOrder: cleanList.length + 1,
          timeLabel: isHindi ? `दृश्य ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`,
          isFlashback: false,
        });
      }
    }

    cleanList.sort((a, b) => a.chronologicalOrder - b.chronologicalOrder);
    cleanList.forEach((ev, idx) => {
      ev.chronologicalOrder = idx + 1;
    });

    timelineEventsToInsert = cleanList;
  } catch (err) {
    logger.warn(`OpenRouter timeline stage failed (${err.message}). Falling back to local timeline analyzer.`);
    timelineEventsToInsert = scenes.map((scene, index) => {
      const isFlashback = flashbackRegex.test(scene.summary || '');
      const defaultLabel = isHindi ? `दृश्य ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`;
      return {
        documentId,
        sceneId: scene._id,
        chronologicalOrder: index + 1,
        timeLabel: isFlashback ? (isHindi ? 'अतीत की स्मृति' : 'Past memory') : defaultLabel,
        isFlashback,
      };
    });
  }

  await TimelineEvent.deleteMany({
    documentId,
  });

  if (timelineEventsToInsert.length) {
    await TimelineEvent.insertMany(
      timelineEventsToInsert,
    );
  }

  return {
    totalTimelineEvents:
      timelineEventsToInsert.length,
  };
};

const runDialogue = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const scenes =
    await getScenesWithText(documentId);

  const characters =
    await Character.find({ documentId });

  await DialogueSummary.deleteMany({
    documentId,
  });

  const summaries = [];

  for (const scene of scenes) {
    for (const character of characters) {
      if (!buildWordBoundaryRegex(character.name).test(scene.rawText || '')) {
        continue;
      }

      summaries.push({
        documentId,
        sceneId: scene._id,
        characterId: character._id,
        summaryText: summarize(
          scene.rawText,
          1,
        ),
        keyQuotes:
          extractQuotesForCharacter(
            scene.rawText,
            character.name,
          ),
        tone:
          moodForScene(
            scene.rawText,
            language,
          ).primaryMood,
      });
    }
  }

  if (summaries.length) {
    await DialogueSummary.insertMany(
      summaries,
    );
  }

  return {
    totalDialogueSummaries:
      summaries.length,
  };
};

const runMood = async ({ documentId }) => {
  const language = await resolveStoryLanguage(documentId);
  const scenes =
    await getScenesWithText(documentId);

  await MoodAnalysis.deleteMany({
    documentId,
  });

  if (!scenes.length) {
    return {
      totalMoodRecords: 0,
    };
  }

  const moodRecords = scenes.map(
    (scene) => {
      const mood =
        moodForScene(
          scene.rawText ||
            scene.summary ||
            '',
          language,
        );

      const emotionScores = new Map(
        Object.entries(
          mood.emotionScores || {},
        ),
      );

      return {
        documentId,
        sceneId: scene._id,
        primaryMood: mood.primaryMood,
        intensity: mood.intensity,
        emotionScores,
      };
    },
  );

  await MoodAnalysis.insertMany(
    moodRecords,
  );

  return {
    totalMoodRecords:
      moodRecords.length,
  };
};

const runArc = async ({ documentId }) => {
  const scenes = await Scene.find({
    documentId,
  }).sort({
    sceneNumber: 1,
  });

  const moods =
    await MoodAnalysis.find({
      documentId,
    });

  const moodByScene = new Map(
    moods.map((mood) => [
      mood.sceneId.toString(),
      mood,
    ]),
  );

  const arcPoints = scenes.map(
    (scene, index) => {
      const positionBoost =
        scenes.length <= 1
          ? 50
          : Math.round(
              (index /
                (scenes.length - 1)) *
                35,
            );

      const mood =
        moodByScene.get(
          scene._id.toString(),
        );

      const tensionScore = Math.min(
        100,
        Math.round(
          (mood?.intensity || 0.25) * 65 +
            positionBoost,
        ),
      );

      return {
        sceneId: scene._id,
        tensionScore,
        label: scene.summary || scene.title,
      };
    },
  );

  const climax = [...arcPoints].sort(
    (a, b) =>
      b.tensionScore -
      a.tensionScore,
  )[0];

  await StoryArc.findOneAndUpdate(
    { documentId },
    {
      documentId,
      arcPoints,
      climaxSceneId:
        climax?.sceneId || null,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  return {
    totalArcPoints:
      arcPoints.length,
  };
};

const runContinuity = async ({
  documentId,
}) => {
  const language = await resolveStoryLanguage(documentId);
  const langInstruction = getAnalysisLanguageInstruction(language);

  if (config.ai.provider === 'local') {
    const scenes =
      await getScenesWithText(
        documentId,
      );

    await ContinuityIssue.deleteMany({
      documentId,
    });

    const issues = [];

    scenes.forEach(
      (scene, index) => {
        const text =
          scene.rawText || '';

        if (/\bdead\b/i.test(text)) {
          const laterScene =
            scenes
              .slice(index + 1)
              .find(
                (candidate) =>
                  candidate.rawText &&
                  candidate.rawText.match(
                    NAME_PATTERN_FROM_TEXT(
                      text,
                    ),
                  ),
              );

          if (laterScene) {
            issues.push({
              documentId,
              type: 'timeline-conflict',
              description:
                `A possible death or disappearance in ${scene.title} may need continuity review later in the story.`,
              sceneIds: [
                scene._id,
                laterScene._id,
              ],
              severity: 'medium',
            });
          }
        }
      },
    );

    if (!scenes.length) {
      issues.push({
        documentId,
        type: 'unexplained-gap',
        description:
          'No scenes were detected, so continuity could not be checked.',
        sceneIds: [],
        severity: 'high',
      });
    }

    if (issues.length) {
      await ContinuityIssue.insertMany(
        issues,
      );
    }

    return {
      totalContinuityIssues:
        issues.length,
    };
  }

  const scenes =
    await getScenesWithText(
      documentId,
    );

  const characters =
    await Character.find({
      documentId,
    });

  await ContinuityIssue.deleteMany({
    documentId,
  });

  if (!scenes.length) {
    await ContinuityIssue.create({
      documentId,
      type: 'unexplained-gap',
      description:
        'No scenes were detected, so continuity could not be checked.',
      sceneIds: [],
      severity: 'high',
    });

    return {
      totalContinuityIssues: 1,
    };
  }

  const charactersFormatted = characters.length
    ? characters
        .map((character) => {
          const aliasList = Array.isArray(character.aliases)
            ? character.aliases.filter(Boolean)
            : [];
          const aliasText = aliasList.length
            ? ` (Aliases / Nicknames: ${aliasList.join(', ')})`
            : '';
          const roleText = character.role ? ` [Role: ${character.role}]` : '';
          return `- ${character.name}${aliasText}${roleText}`;
        })
        .join('\n')
    : 'No explicit character records found.';

  const prompt = `Analyze the following story scenes for continuity errors.

For each character in the list, track their attributes (status e.g. alive/dead/injured, age, physical appearance, clothing, possessions, location) across all scenes in chronological order.

Character Name & Alias Handling:
- Characters may be referred to by different names, nicknames, titles, or aliases across different scenes (see character aliases listed below).
- Do NOT flag the use of alternate names or aliases for the same character as a continuity issue. Treat all aliases for a character as referring to the same individual.
- Only flag an attribute conflict if the story genuinely contradicts itself regarding a character's state, physical traits, appearance, or possessions (e.g. eye color changing, an injured arm suddenly healed without explanation, or appearing in two impossible places simultaneously).

Flag any genuine contradictions, timeline conflicts, or unexplained narrative gaps.

Output Rules:
- If NO continuity errors, contradictions, or unexplained gaps are found, you MUST return an EMPTY JSON array: [].
- Never create dummy, placeholder, or "empty" issue objects.
- If you find one or more actual continuity issues, every issue object in the array MUST contain:
  1. "type": One of "attribute-conflict", "timeline-conflict", or "unexplained-gap".
  2. "description": A required, non-empty, detailed explanation of the exact contradiction or continuity issue, identifying what contradicts what and why.
  3. "sceneIds": Array of scene IDs (from the scenes provided below) where the contradiction occurs.
  4. "severity": One of "low", "medium", or "high".
- The "description" field is STRICTLY REQUIRED for every issue and MUST contain an actual meaningful explanation. Never generate an empty string "", whitespace only, null, or undefined for "description".
- Return ONLY the JSON array (or [] if no issues).
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Characters:
${charactersFormatted}

Scenes:
${scenes
  .map(
    (scene) =>
      `Scene ${scene.sceneNumber}: "${scene.title}" (ID: ${scene._id})\nText:\n${scene.rawText}`,
  )
  .join('\n\n')}
`;

  const schemaHint = {
    type: 'ARRAY',
    description:
      'List of continuity issues found. Return an empty array [] if no issues are detected.',
    items: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          enum: [
            'attribute-conflict',
            'timeline-conflict',
            'unexplained-gap',
          ],
        },
        description: {
          type: 'STRING',
          description:
            'A required, non-empty, detailed explanation of the continuity issue.',
        },
        sceneIds: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
          },
        },
        severity: {
          type: 'STRING',
          enum: [
            'low',
            'medium',
            'high',
          ],
        },
      },
      required: [
        'type',
        'description',
        'sceneIds',
        'severity',
      ],
    },
  };

  let issuesToInsert = [];

  try {
    const rawIssues =
      await generateJSON(
        prompt,
        schemaHint,
        STAGES.CONTINUITY,
      );

  const rawExtracted = normalizeArrayResponse(rawIssues);
  const rawArray = Array.isArray(rawExtracted)
    ? rawExtracted
    : rawExtracted && typeof rawExtracted === 'object' && Array.isArray(rawExtracted.issues)
      ? rawExtracted.issues
      : rawExtracted && typeof rawExtracted === 'object' && Array.isArray(rawExtracted.continuityIssues)
        ? rawExtracted.continuityIssues
        : [];

  const validSceneIdMap = new Map();
  scenes.forEach((scene) => {
    validSceneIdMap.set(String(scene._id), String(scene._id));
    validSceneIdMap.set(String(scene.sceneNumber), String(scene._id));
    validSceneIdMap.set(`scene ${scene.sceneNumber}`, String(scene._id));
    validSceneIdMap.set(`scene_${scene.sceneNumber}`, String(scene._id));
  });

  const normalizedIssues = rawArray
    .map((issue) => {
      if (!issue || typeof issue !== 'object') return null;

      const rawDescription =
        typeof issue.description === 'string'
          ? issue.description.trim()
          : typeof issue.explanation === 'string'
            ? issue.explanation.trim()
            : typeof issue.details === 'string'
              ? issue.details.trim()
              : typeof issue.issue === 'string'
                ? issue.issue.trim()
                : '';

      if (!rawDescription) {
        return null;
      }

      const isNoIssueText =
        /^(none|n\/a|no\s+(issues?|continuity\s+errors?|conflicts?)\s*(found)?\.?)$/i.test(
          rawDescription,
        );
      if (isNoIssueText) {
        return null;
      }

      let type =
        issue.type ||
        issue.issueType ||
        issue.conflictType ||
        issue.category;

      if (typeof type === 'string') {
        type = type.toLowerCase().trim().replace(/[_ ]+/g, '-');
        if (type === 'attribute' || type === 'attributeconflict') {
          type = 'attribute-conflict';
        }
        if (type === 'timeline' || type === 'timelineconflict') {
          type = 'timeline-conflict';
        }
        if (type === 'gap' || type === 'unexplainedgap') {
          type = 'unexplained-gap';
        }
      }

      if (
        typeof type === 'string' &&
        (type === 'none' ||
          type === 'no-issue' ||
          type === 'no-issues' ||
          type === 'no-conflict')
      ) {
        return null;
      }

      const validTypes = [
        'attribute-conflict',
        'timeline-conflict',
        'unexplained-gap',
      ];

      if (!type || !validTypes.includes(type)) {
        type = 'attribute-conflict';
      }

      let severity = issue.severity;
      if (typeof severity === 'string') {
        severity = severity.toLowerCase().trim();
      }
      const validSeverities = ['low', 'medium', 'high'];
      if (!severity || !validSeverities.includes(severity)) {
        severity = 'medium';
      }

      let rawSceneIds = [];
      if (Array.isArray(issue.sceneIds)) {
        rawSceneIds = issue.sceneIds;
      } else if (Array.isArray(issue.scenes)) {
        rawSceneIds = issue.scenes;
      } else if (issue.sceneId) {
        rawSceneIds = [issue.sceneId];
      }

      const resolvedSceneIds = [];
      for (const rawId of rawSceneIds) {
        const strId = String(rawId).trim().toLowerCase();
        if (validSceneIdMap.has(strId)) {
          const mappedId = validSceneIdMap.get(strId);
          if (!resolvedSceneIds.includes(mappedId)) {
            resolvedSceneIds.push(mappedId);
          }
        } else if (mongoose.Types.ObjectId.isValid(rawId)) {
          const strOrig = String(rawId);
          if (!resolvedSceneIds.includes(strOrig)) {
            resolvedSceneIds.push(strOrig);
          }
        }
      }

      return {
        type,
        description: rawDescription,
        sceneIds: resolvedSceneIds,
        severity,
      };
    })
    .filter(Boolean);

  const continuityJoi = Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid(
            'attribute-conflict',
            'timeline-conflict',
            'unexplained-gap',
          )
          .required(),

        description: Joi.string()
          .trim()
          .min(1)
          .required(),

        sceneIds: Joi.array()
          .items(Joi.string())
          .default([]),

        severity: Joi.string()
          .valid(
            'low',
            'medium',
            'high',
          )
          .default('medium'),
      }).unknown(true),
    )
    .required();

  const {
    value: validatedIssues,
    error,
  } = continuityJoi.validate(
    normalizedIssues,
  );

  if (error) {
    throw new Error(
      `Continuity validation failed: ${error.message}`,
    );
  }

  issuesToInsert =
    validatedIssues.map(
      (issue) => ({
        documentId,
        type: issue.type,
        description:
          issue.description,
        sceneIds: issue.sceneIds,
        severity: issue.severity,
      }),
    );
  } catch (err) {
    logger.warn(`OpenRouter continuity stage failed (${err.message}). Falling back to local continuity analyzer.`);
    issuesToInsert = [];
    scenes.forEach((scene, index) => {
      const text = scene.rawText || '';
      if (/\bdead\b/i.test(text)) {
        const laterScene = scenes
          .slice(index + 1)
          .find(
            (candidate) =>
              candidate.rawText &&
              candidate.rawText.match(
                NAME_PATTERN_FROM_TEXT(text),
              ),
          );

        if (laterScene) {
          issuesToInsert.push({
            documentId,
            type: 'timeline-conflict',
            description: `A possible death or disappearance in ${scene.title} may need continuity review later in the story.`,
            sceneIds: [scene._id, laterScene._id],
            severity: 'medium',
          });
        }
      }
    });

    if (!scenes.length) {
      issuesToInsert.push({
        documentId,
        type: 'unexplained-gap',
        description: 'No scenes were detected, so continuity could not be checked.',
        sceneIds: [],
        severity: 'high',
      });
    }
  }

  if (issuesToInsert.length) {
    await ContinuityIssue.insertMany(
      issuesToInsert,
    );
  }

  return {
    totalContinuityIssues:
      issuesToInsert.length,
  };
};

const runEmbeddings = async ({
  documentId,
}) => {
  const scenes =
    await Scene.find({
      documentId,
    }).select('+rawText');

  const characters =
    await Character.find({
      documentId,
    });

  const dialogue =
    await DialogueSummary.find({
      documentId,
    });

  await Embedding.deleteMany({
    documentId,
  });

  const embeddings = [
    ...scenes.map((scene) => ({
      documentId,
      sourceType: 'scene',
      sourceId: scene._id,
      sceneId: scene._id,
      vector: buildTextEmbedding(
        `${scene.title} ${scene.summary} ${scene.rawText || ''}`,
      ),
      model: 'local-hash-64',
    })),

    ...characters.map((character) => ({
      documentId,
      sourceType: 'character',
      sourceId: character._id,
      sceneId: null,
      vector: buildTextEmbedding(
        `${character.name} ${character.description || ''} ${(character.traits || []).join(' ')}`,
      ),
      model: 'local-hash-64',
    })),

    ...dialogue.map((item) => ({
      documentId,
      sourceType: 'dialogue_summary',
      sourceId: item._id,
      sceneId: item.sceneId,
      vector: buildTextEmbedding(
        `${item.summaryText} ${(item.keyQuotes || []).join(' ')} ${item.tone || ''}`,
      ),
      model: 'local-hash-64',
    })),
  ];

  if (embeddings.length) {
    await Embedding.insertMany(
      embeddings,
    );
  }

  return {
    totalEmbeddings:
      embeddings.length,
  };
};

const processDocumentDirectly = async (documentId) => {
  const STAGE_ORDER = [
    STAGES.PARSING,
    STAGES.SCENES,
    STAGES.CHARACTERS,
    STAGES.RELATIONSHIPS,
    STAGES.TIMELINE,
    STAGES.DIALOGUE,
    STAGES.MOOD,
    STAGES.ARC,
    STAGES.CONTINUITY,
    STAGES.EMBEDDINGS,
  ];

  const existingJobs = await processingJobRepository.findByDocumentId(documentId);
  if (!existingJobs || existingJobs.length === 0) {
    const jobRecords = STAGE_LIST.map((stage) => ({
      documentId,
      stage,
      status: JOB_STATUSES.QUEUED,
      dependsOn: STAGE_DEPENDENCIES[stage],
    }));
    await processingJobRepository.create(jobRecords);
  }

  for (const stage of STAGE_ORDER) {
    await markRunning(documentId, stage);
    try {
      await runStage({ data: { documentId: documentId.toString(), stage } });
      await markCompleted(documentId, stage);
    } catch (err) {
      logger.error(`Error in stage ${stage} for document ${documentId}: ${err.message}`);
      await markFailed(documentId, stage, err);
      throw err;
    }
  }

  await Document.findByIdAndUpdate(documentId, {
    status: DOCUMENT_STATUSES.READY,
  });
};

export {
  startPipelineWorker,
  runStage,
  runScenes,
  runCharacters,
  runRelationships,
  runTimeline,
  runDialogue,
  runMood,
  runArc,
  runContinuity,
  runEmbeddings,
  processDocumentDirectly,
  enqueueReadyStages,
};