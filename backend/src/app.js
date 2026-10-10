import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import mongoose from 'mongoose';
import { redis } from './config/redis.js';

import config from './config/env.js';
import logger from './utilities/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import router from './routes/index.js';

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
    })
  );

  const allowedOrigins = config.corsAllowedOrigins;
  const isProduction = config.env === 'production';
  const frontendUrl = config.frontendUrl;

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/+$/, '');

        if (frontendUrl && normalizedOrigin === frontendUrl.replace(/\/+$/, '')) {
          return callback(null, true);
        }

        if (allowedOrigins === '*' && !isProduction) {
          return callback(null, true);
        }

        if (Array.isArray(allowedOrigins)) {
          const normalizedAllowed = allowedOrigins.map((o) => o.replace(/\/+$/, ''));
          if (normalizedAllowed.includes(normalizedOrigin)) {
            return callback(null, true);
          }
        }

        if (!isProduction) {
          const isVercel = /\.vercel\.app$/.test(origin);
          const isLocalhost =
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
          if (isVercel || isLocalhost) {
            return callback(null, true);
          }
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  if (config.env !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const readLenientLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.env === 'test' ? 5000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: 'rl:read:',
      sendCommand: (...args) => redis.call(...args),
    }),
    skip: (req) => req.method !== 'GET',
    message: { success: false, message: 'High reading traffic, please try again shortly.' },
  });
  app.use(['/api/books', '/api/search'], readLenientLimiter);

  const apiStandardLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.env === 'test' ? 5000 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: 'rl:api:',
      sendCommand: (...args) => redis.call(...args),
    }),
    skip: (req) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/auth/')) {
        return true;
      }
      return req.method === 'GET' && req.originalUrl && /\/api\/documents\/[^/]+\/jobs(\?|$)/.test(req.originalUrl);
    },
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiStandardLimiter);

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Storyloom API is running.',
      health: '/health',
      apiBase: '/api',
    });
  });

  app.get('/health', async (_req, res) => {
    try {
      const isMongoUp = mongoose.connection.readyState === 1;
      let isRedisUp = false;
      try {
        const ping = await redis.ping();
        isRedisUp = ping === 'PONG';
      } catch (err) {
        isRedisUp = false;
      }

      if (!isMongoUp || !isRedisUp) {
        return res.status(503).json({
          success: false,
          message: 'Services unavailable.',
          services: {
            mongodb: isMongoUp ? 'up' : 'down',
            redis: isRedisUp ? 'up' : 'down',
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Storyloom API is running.',
        services: {
          mongodb: 'up',
          redis: 'up',
        },
      });
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Health check failed.',
        error: err.message,
      });
    }
  });

  app.use('/api', router);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};

export default createApp;
