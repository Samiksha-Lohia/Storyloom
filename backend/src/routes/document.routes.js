import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema } from '../validators/document.validator.js';
import { sendSuccess } from '../utilities/response.js';
import { DocumentDto } from '../dtos/document.dto.js';

const router = Router();

router.use(authenticate);

router.get(
  '/:documentId',
  validate(documentIdParamSchema),
  requireDocumentOwnership,
  async (req, res, next) => {
    try {
      sendSuccess(res, DocumentDto.toResponse(req.document), 200, 'Document retrieved.');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
