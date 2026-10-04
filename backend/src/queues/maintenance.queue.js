import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const MAINTENANCE_QUEUE_NAME = 'platform-maintenance';

export const maintenanceQueue = new Queue(MAINTENANCE_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export default maintenanceQueue;
