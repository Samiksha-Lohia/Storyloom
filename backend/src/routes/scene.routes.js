import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema, sceneIdParamSchema } from '../validators/document.validator.js';
import * as sceneService from '../services/scene.service.js';
import { sendSuccess, sendPaginated } from '../utilities/response.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', validate(documentIdParamSchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const { results, pagination } = await sceneService.getScenesForDocument(req.params.documentId, page, limit);
    if (pagination) {
      sendPaginated(res, results, pagination, 'Scenes retrieved.');
    } else {
      sendSuccess(res, results, 200, 'Scenes retrieved.');
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:sceneId', validate(sceneIdParamSchema), requireDocumentOwnership, async (req, res, next) => {
  try {
    const scene = await sceneService.getSceneById(req.params.sceneId);
    sendSuccess(res, scene, 200, 'Scene retrieved.');
  } catch (err) {
    next(err);
  }
});

export default router;
