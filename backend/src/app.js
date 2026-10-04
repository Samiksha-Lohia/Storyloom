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

  // ─── Security Headers (C5) ────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
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

  // ─── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = config.corsAllowedOrigins;
  const isProduction = config.env === 'production';
  const frontendUrl = process.env.FRONTEND_URL;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        // In production, strictly lock to FRONTEND_URL or allowedOrigins if defined
        if (isProduction && frontendUrl && origin === frontendUrl) {
          return callback(null, true);
        }

        // If config specifies '*', allow all origins dynamically
        if (allowedOrigins === '*') {
          return callback(null, true);
        }

        // If allowedOrigins is an array, check if origin is in the list
        if (Array.isArray(allowedOrigins)) {
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
        }

        // Dynamically allow any vercel.app subdomain or localhost in dev/staging
        const isVercel = /\.vercel\.app$/.test(origin);
        const isLocalhost =
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
        if (!isProduction && (isVercel || isLocalhost)) {
          return callback(null, true);
        }

        if (isProduction && isVercel) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // ─── HTTP Request Logging ──────────────────────────────────────────────────
  if (config.env !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );
  }

  // ─── Body Parsers ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Tiered Rate Limiters (C5) ─────────────────────────────────────────────
  // 1. Strict Auth Limiter (allows at least 10 logins per minute: configured to 30/min)
  const authStrictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: config.env === 'test' ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    message: { success: false, message: 'Too many authentication attempts. Please try again after 1 minute.' },
  });
  app.use(['/api/auth/login', '/api/auth/register'], authStrictLimiter);

  // 2. Lenient Read / Search Limiter (300 per minute)
  const readLenientLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.env === 'test' ? 5000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    skip: (req) => req.method !== 'GET',
    message: { success: false, message: 'High reading traffic, please try again shortly.' },
  });
  app.use(['/api/books', '/api/search'], readLenientLimiter);

  // 3. Standard API Limiter (120 per minute)
  const apiStandardLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.env === 'test' ? 5000 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    skip: (req) => {
      // Bypass for document jobs status checking GET endpoint
      return req.method === 'GET' && req.originalUrl && /\/api\/documents\/[^/]+\/jobs(\?|$)/.test(req.originalUrl);
    },
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiStandardLimiter);

  // ─── Health Check ──────────────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'SceneCraft API is running.',
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
        message: 'SceneCraft API is running.',
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

  // ─── API Routes ────────────────────────────────────────────────────────────
  app.use('/api', router);

  // ─── 404 Handler ──────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;
