import dialogueSummaryRepository from '../repositories/dialogue-summary.repository.js';

const getDialogueForScene = async (sceneId) => {
  return dialogueSummaryRepository.findBySceneId(sceneId);
};

const getDialogueForDocument = async (documentId) => {
  return dialogueSummaryRepository.find({ documentId });
};

const getDialogueForCharacter = async (documentId, characterId) => {
  return dialogueSummaryRepository.findByCharacterId(documentId, characterId);
};

export { getDialogueForDocument, getDialogueForScene, getDialogueForCharacter };
