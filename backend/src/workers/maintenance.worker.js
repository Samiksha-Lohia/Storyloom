import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import logger from '../utilities/logger.js';
import { MAINTENANCE_QUEUE_NAME, maintenanceQueue } from '../queues/maintenance.queue.js';
import { rollupStatsForDate, rollupDateRange } from '../services/stats-rollup.service.js';
import { generatePitchCard } from '../services/pitch.service.js';

let maintenanceWorker = null;
export const pitchWorker = {
  get worker() {
    return maintenanceWorker;
  },
};

export const scheduleNightlyRollup = async () => {
  try {
    const cronPattern = process.env.MAINTENANCE_CRON || '0 2 * * *';

    await maintenanceQueue.add(
      'statsRollup',
      {},
      {
        repeat: {
          pattern: cronPattern,
        },
        jobId: 'nightly-stats-rollup',
      }
    );

    logger.info(`[PlatformMaintenance] Nightly statsRollup job registered with pattern "${cronPattern}".`);
  } catch (err) {
    logger.error(`[PlatformMaintenance] Failed to schedule nightly rollup: ${err.message}`);
  }
};

export const startMaintenanceWorker = () => {
  if (maintenanceWorker) return maintenanceWorker;

  maintenanceWorker = new Worker(
    MAINTENANCE_QUEUE_NAME,
    async (job) => {
      logger.info(`[PlatformMaintenance] Processing job "${job.name}" (${job.id})`);

      if (job.name === 'statsRollup') {
        let targetDate = job.data?.date;
        if (!targetDate) {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          targetDate = yesterday.toISOString().slice(0, 10);
        }

        const result = await rollupStatsForDate(targetDate);
        return result;
      }

      if (job.name === 'backfillRollup') {
        const { startDate, endDate } = job.data;
        const result = await rollupDateRange(startDate, endDate);
        return result;
      }

      if (job.name === 'generate-pitch' || job.name === 'pitch') {
        const { bookId } = job.data;
        if (!bookId) {
          logger.warn('[PlatformMaintenance] generate-pitch job missing bookId');
          return { skipped: true };
        }
        const pitchCard = await generatePitchCard(bookId);
        return { success: true, bookId, pitchCard };
      }

      logger.warn(`[PlatformMaintenance] Unknown job name "${job.name}"`);
      return { skipped: true };
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );

  maintenanceWorker.on('completed', (job, returnvalue) => {
    logger.info(`[PlatformMaintenance] Job "${job.name}" (${job.id}) completed successfully.`);
  });

  maintenanceWorker.on('failed', (job, err) => {
    logger.error(`[PlatformMaintenance] Job "${job?.name || 'unknown'}" (${job?.id}) failed: ${err.message}`);
  });

  scheduleNightlyRollup().catch((err) => {
    logger.error(`Error in scheduleNightlyRollup: ${err.message}`);
  });

  logger.info('[PlatformMaintenance] Platform maintenance worker started.');
  return maintenanceWorker;
};

export default {
  startMaintenanceWorker,
  scheduleNightlyRollup,
};
