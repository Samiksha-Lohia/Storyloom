import continuityIssueRepository from '../repositories/continuity-issue.repository.js';
import { NotFoundError } from '../utilities/custom-errors.js';

const getContinuityIssuesForDocument = async (documentId) => {
  return continuityIssueRepository.findByDocumentId(documentId);
};

const updateIssueStatus = async (issueId, documentId, status) => {
  const issue = await continuityIssueRepository.findOne({ _id: issueId, documentId });

  if (!issue) {
    throw new NotFoundError('Continuity issue not found.');
  }

  const updated = await continuityIssueRepository.updateById(issueId, { status });
  return updated;
};

export { getContinuityIssuesForDocument, updateIssueStatus };
