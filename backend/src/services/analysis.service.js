import processingJobRepository from '../repositories/processing-job.repository.js';
import { pipelineQueue } from '../queues/pipeline.queue.js';
import { AnalysisDto } from '../dtos/analysis.dto.js';
import { NotFoundError, BadRequestError } from '../utilities/custom-errors.js';
import { JOB_STATUSES } from '../constants/job-status.js';
import STAGES from '../constants/stages.js';
import { enqueueReadyStages } from '../workers/pipeline.worker.js';
import logger from '../utilities/logger.js';

const getJobsForDocument = async (documentId) => {
  const jobs = await processingJobRepository.findByDocumentId(documentId);
  return AnalysisDto.toResponseList(jobs);
};

const retryStage = async (documentId, stage) => {
  const job = await processingJobRepository.findStageJob(documentId, stage);
  if (!job) {
    throw new NotFoundError(`No job record found for stage '${stage}' on document '${documentId}'.`);
  }

  if (job.status !== JOB_STATUSES.FAILED) {
    throw new BadRequestError(`Stage '${stage}' cannot be retried — current status is '${job.status}'.`);
  }

  const updated = await processingJobRepository.updateOne(
    { documentId, stage },
    { status: JOB_STATUSES.QUEUED, progress: 0, error: null, startedAt: null, completedAt: null }
  );

  await pipelineQueue.add(
    stage,
    { documentId, stage },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, jobId: `${documentId}-${stage}-${Date.now()}` }
  );

  logger.info(`Stage '${stage}' for document ${documentId} re-queued.`);
  return AnalysisDto.toResponse(updated);
};

const triggerAnalysisIfPending = async (documentId) => {
  if (!documentId) return false;

  const jobs = await processingJobRepository.findByDocumentId(documentId);
  if (!jobs || jobs.length === 0) return false;

  const nonParsingJobs = jobs.filter((j) => j.stage !== STAGES.PARSING);
  const allComplete = nonParsingJobs.length > 0 && nonParsingJobs.every((j) => j.status === JOB_STATUSES.COMPLETED);
  if (allComplete) {
    return false;
  }

  const anyRunning = jobs.some((j) => j.status === JOB_STATUSES.RUNNING);
  if (anyRunning) {
    return false;
  }

  for (const j of jobs) {
    if (j.status === JOB_STATUSES.FAILED) {
      await processingJobRepository.updateOne(
        { documentId, stage: j.stage },
        { status: JOB_STATUSES.QUEUED, progress: 0, error: null }
      );
    }
  }

  await enqueueReadyStages(documentId);

  logger.info(`Narrative insights processing triggered for document ${documentId}`);
  return true;
};

export { getJobsForDocument, retryStage, triggerAnalysisIfPending };
