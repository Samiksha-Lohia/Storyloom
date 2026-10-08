import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema, searchQuerySchema, askQuestionSchema } from '../validators/document.validator.js';
import * as searchService from '../services/search.service.js';
import { sendSuccess } from '../utilities/response.js';
import { generateJSON } from '../services/ai-provider.service.js';
import { resolveStoryLanguage, getAnalysisLanguageInstruction } from '../utilities/language.helper.js';
import Scene from '../models/scene.model.js';
import Character from '../models/character.model.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', validate(documentIdParamSchema), validate(searchQuerySchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const { q, character, sceneRange, sceneRangeFrom, sceneRangeTo, mood } = req.query;
    
    const filters = {
      character,
      sceneRange,
      sceneRangeFrom,
      sceneRangeTo,
      mood,
    };

    const results = await searchService.semanticSearch(req.params.documentId, q, filters);
    sendSuccess(res, results, 200, 'Semantic search completed.');
  } catch (err) {
    next(err);
  }
});

router.post('/ask', validate(documentIdParamSchema), validate(askQuestionSchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const { question } = req.body;
    const documentId = req.params.documentId;

    const [allScenes, characters, semanticResults] = await Promise.all([
      Scene.find({ documentId }).sort({ sceneNumber: 1 }).lean(),
      Character.find({ documentId }).lean(),
      searchService.semanticSearch(documentId, question, {}, 6).catch(() => []),
    ]);

    const scenesTimeline = allScenes
      .map((s) => {
        const textSample = s.rawText ? `\nScene excerpt: ${s.rawText.slice(0, 400).replace(/\n+/g, ' ')}` : '';
        return `[Scene ${s.sceneNumber}: "${s.title}"]\nLocation: ${s.location || 'Unspecified'}\nSummary: ${s.summary || 'No summary'}${textSample}`;
      })
      .join('\n\n---\n\n');

    const charactersContext = characters
      .map((c) => `- ${c.name} (Role: ${c.role}): ${c.description || ''} | Traits: ${(c.traits || []).join(', ')} | Arc: ${c.arcSummary || ''}`)
      .join('\n');

    const excerpts = semanticResults
      .map((item) => {
        if (item.sourceType === 'scene' && item.source?.rawText) {
          return `[Scene ${item.source.sceneNumber} Exact Text]: ${item.source.rawText.slice(0, 600)}`;
        }
        if (item.sourceType === 'dialogue_summary') {
          return `[Dialogue]: Summary: ${item.source.summaryText}\nKey Quotes: ${(item.source.keyQuotes || []).join(' | ')}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    const language = await resolveStoryLanguage(documentId);
    const langInstruction = getAnalysisLanguageInstruction(language);

    const prompt = `You are an expert story analysis assistant for SceneCraft. Answer the user's question by analyzing the COMPLETE story scene-by-scene.

IMPORTANT INSTRUCTIONS:
1. Thoroughly examine the entire story progression across all scenes and character interactions.
2. Directly answer the question with precise facts, events, motivations, and scene developments from the narrative.
3. If the user asks about specific characters, motivations, secrets, or outcomes, cross-reference their actions across all scenes.
4. Keep the response natural, highly accurate, and comprehensive. Do not give vague or superficial answers.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}

Complete Story Breakdown (Scene by Scene):
${scenesTimeline || 'No scene details recorded.'}

Characters Overview:
${charactersContext || 'No character profiles recorded.'}
${excerpts ? `\nKey Text Excerpts Matching Query:\n${excerpts}\n` : ''}

User Question:
${question}

Return your response as a JSON object:
{
  "answer": "A detailed, accurate, and comprehensive answer analyzing the full story scenes."
}`;

    const responseObj = await generateJSON(prompt, null, 'continuity');
    
    sendSuccess(res, { answer: responseObj.answer || 'I am sorry, I could not extract an answer.' }, 200, 'Question answered.');
  } catch (err) {
    next(err);
  }
});

export default router;
