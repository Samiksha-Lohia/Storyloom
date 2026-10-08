import documentRepository from '../repositories/document.repository.js';
import { ForbiddenError, NotFoundError } from '../utilities/custom-errors.js';

const requireDocumentOwnership = async (req, _res, next) => {
  try {
    const { documentId } = req.params;
    const document = await documentRepository.findById(documentId);

    if (!document) {
      return next(new NotFoundError('Document not found.'));
    }

    if (document.userId.toString() !== req.user.id.toString()) {
      return next(new ForbiddenError('You do not have access to this document.'));
    }

    req.document = document;
    next();
  } catch (err) {
    next(err);
  }
};

export { requireDocumentOwnership };
