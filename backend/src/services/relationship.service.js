import relationshipRepository from '../repositories/relationship.repository.js';

const getRelationshipsForDocument = async (documentId) => {
  return relationshipRepository.findByDocumentId(documentId);
};

export { getRelationshipsForDocument };
