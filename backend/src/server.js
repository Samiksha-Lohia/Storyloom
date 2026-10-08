import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import config from './config/env.js';
import connectDB from './config/db.js';
import { redis } from './config/redis.js';
import logger from './utilities/logger.js';
import createApp from './app.js';
import { initSocket } from './socket/index.js';
import { startPipelineWorker } from './workers/pipeline.worker.js';
import { startMaintenanceWorker } from './workers/maintenance.worker.js';

const bootstrap = async () => {
  await connectDB();

  redis.on('ready', () => logger.info('Redis ready'));

  const { apiKey1, apiKey2, apiKey3 } = config.ai.openrouter;
  if (!apiKey1) {
    logger.warn('[AI Pipeline] OPENROUTER_API_KEY_1 is empty. Stages running on local fallback: scenes, timeline');
  }
  if (!apiKey2) {
    logger.warn('[AI Pipeline] OPENROUTER_API_KEY_2 is empty. Stages running on local fallback: characters, continuity');
  }
  if (!apiKey3) {
    logger.warn('[AI Pipeline] OPENROUTER_API_KEY_3 is empty. Stages running on local fallback: relationships');
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: config.corsAllowedOrigins },
  });
  initSocket(io);
  app.set('io', io);

  startPipelineWorker(io);
  startMaintenanceWorker();

  httpServer.listen(config.port, () => {
    logger.info(`SceneCraft API listening on port ${config.port} [${config.env}]`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully...`);
    httpServer.close(async () => {
      await redis.quit();
      logger.info('HTTP server and Redis connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
