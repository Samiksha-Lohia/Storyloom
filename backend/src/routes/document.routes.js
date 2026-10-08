import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { documentIdParamSchema, updateDocumentBodySchema } from '../validators/document.validator.js';
import * as documentService from '../services/document.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utilities/response.js';
import { DocumentDto } from '../dtos/document.dto.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const { results, pagination } = await documentService.getUserDocuments(req.user.id, page, limit);
    if (pagination) {
      sendPaginated(res, results, pagination, 'Documents retrieved.');
    } else {
      sendSuccess(res, results, 200, 'Documents retrieved.');
    }
  } catch (err) {
    next(err);
  }
});

router.post('/',
   uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const doc = await documentService.uploadDocument(req.user.id, req.file);
    sendCreated(res, doc, 'Document uploaded and processing started.');
  } catch (err) {
    next(err);
  }
});

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

router.get(
  '/:documentId/download',
  validate(documentIdParamSchema),
  requireDocumentOwnership,
  async (req, res, next) => {
    try {
      const doc = req.document;
      if (doc.storageUrl.startsWith('http')) {
        return res.redirect(doc.storageUrl);
      }
      res.sendFile(doc.storageUrl);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:documentId',
  validate(documentIdParamSchema),
  requireDocumentOwnership,
  validate(updateDocumentBodySchema),
  async (req, res, next) => {
    try {
      const doc = await documentService.updateDocumentTitle(
        req.params.documentId,
        req.user.id,
        req.body.title,
      );
      sendSuccess(res, doc, 200, 'Document title updated.');
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:documentId',
  validate(documentIdParamSchema),
  requireDocumentOwnership,
  async (req, res, next) => {
    try {
      await documentService.deleteDocument(req.params.documentId);
      sendSuccess(res, null, 200, 'Document deleted successfully.');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
