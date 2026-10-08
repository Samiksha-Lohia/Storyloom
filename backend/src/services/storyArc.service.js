import storyArcRepository from '../repositories/story-arc.repository.js';
import { NotFoundError } from '../utilities/custom-errors.js';

const getStoryArcForDocument = async (documentId) => {
  const arc = await storyArcRepository.findByDocumentId(documentId);
  if (!arc) throw new NotFoundError('Story arc has not been generated yet for this document.');
  return arc;
};

export { getStoryArcForDocument };
