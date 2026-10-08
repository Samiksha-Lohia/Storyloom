import timelineEventRepository from '../repositories/timeline-event.repository.js';

const getTimelineForDocument = async (documentId) => {
  return timelineEventRepository.findByDocumentIdChronological(documentId);
};

export { getTimelineForDocument };
