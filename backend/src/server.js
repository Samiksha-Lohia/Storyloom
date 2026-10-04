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
  // ─── Connect to MongoDB ───────────────────────────────────────────────────
  await connectDB();

  // ─── Verify Redis connection ───────────────────────────────────────────────
  // redis client is already initialised in config/redis.js; just log its state
  redis.on('ready', () => logger.info('Redis ready'));

  // ─── Create Express App ───────────────────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Initialise Socket.IO ─────────────────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: { origin: config.corsAllowedOrigins },
  });
  initSocket(io);
  app.set('io', io);

  // ─── Start BullMQ Workers ─────────────────────────────────────────────────
  startPipelineWorker(io);
  startMaintenanceWorker();

  // ─── Start HTTP Server ────────────────────────────────────────────────────
  httpServer.listen(config.port, () => {
    logger.info(`SceneCraft API listening on port ${config.port} [${config.env}]`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
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

// ─── Process-Wide Error Handlers ─────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap().catch((err) => {
  // If bootstrap itself throws (e.g. DB connection fails), log and exit.
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
