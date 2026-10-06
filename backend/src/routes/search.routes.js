import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema, searchQuerySchema, askQuestionSchema } from '../validators/document.validator.js';
import * as searchService from '../services/search.service.js';
import { sendSuccess } from '../utilities/response.js';
import { generateJSON } from '../services/ai-provider.service.js';
import { resolveStoryLanguage, getAnalysisLanguageInstruction } from '../utilities/language.helper.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', validate(documentIdParamSchema), validate(searchQuerySchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const { q, character, sceneRange, sceneRangeFrom, sceneRangeTo, mood } = req.query;
    
    // Package filters
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

    // 1. Perform semantic search to get context (top 5 matches)
    const results = await searchService.semanticSearch(documentId, question, {}, 5);

    // 2. Hydrate context text
    const context = results
      .map((item) => {
        if (item.sourceType === 'scene') {
          return `[Scene ${item.source.sceneNumber}] Title: ${item.source.title}\nSummary: ${item.source.summary}`;
        }
        if (item.sourceType === 'character') {
          return `[Character Profile] Name: ${item.source.name} (Role: ${item.source.role})\nDescription: ${item.source.description}\nTraits: ${(item.source.traits || []).join(', ')}\nArc: ${item.source.arcSummary || ''}`;
        }
        if (item.sourceType === 'dialogue_summary') {
          return `[Dialogue Summary] Summary: ${item.source.summaryText}\nTone: ${item.source.tone}\nKey Quotes:\n${(item.source.keyQuotes || []).map((q) => `- "${q}"`).join('\n')}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    const language = await resolveStoryLanguage(documentId);
    const langInstruction = getAnalysisLanguageInstruction(language);

    // 3. Prompt AI using existing OpenRouter architecture
    const prompt = `You are a story analysis assistant for SceneCraft. Answer the user's question about the story based on the provided analysis context.
If the context doesn't contain the answer, use your intelligence to deduce the best response based on the available information, but keep it grounded in the provided context.
${langInstruction ? `\nLANGUAGE INSTRUCTION:\n${langInstruction}\n` : ''}
Context:
${context || 'No specific context found.'}

Question:
${question}

Return your response as a JSON object matching this schema:
{
  "answer": "A detailed and accurate answer based on the context."
}`;

    // Call generateJSON using 'continuity' stage settings
    const responseObj = await generateJSON(prompt, null, 'continuity');
    
    sendSuccess(res, { answer: responseObj.answer || 'I am sorry, I could not extract an answer.' }, 200, 'Question answered.');
  } catch (err) {
    next(err);
  }
});

export default router;
