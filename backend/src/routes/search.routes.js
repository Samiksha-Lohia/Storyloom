import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema, askQuestionSchema } from '../validators/document.validator.js';
import storyQaService from '../services/story-qa.service.js';
import { sendSuccess } from '../utilities/response.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/ask', validate(documentIdParamSchema), validate(askQuestionSchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const { question, history } = req.body;
    const documentId = req.params.documentId;

    const result = await storyQaService.answerStoryQuestion({
      documentId,
      question,
      history,
    });

    sendSuccess(res, result, 200, 'Question answered.');
  } catch (err) {
    next(err);
  }
});

export default router;
