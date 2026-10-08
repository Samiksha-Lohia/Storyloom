import moodAnalysisRepository from '../repositories/mood-analysis.repository.js';

const getMoodAnalysisForDocument = async (documentId) => {
  return moodAnalysisRepository.findByDocumentId(documentId);
};

export { getMoodAnalysisForDocument };
