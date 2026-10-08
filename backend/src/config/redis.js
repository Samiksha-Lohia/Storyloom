import Redis from 'ioredis';
import config from './env.js';
import logger from '../utilities/logger.js';

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.slice(0, targetError.length) === targetError) {
          return true;
        }
        return false;
      },
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 20000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client attempting connection...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client connected and ready.');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed.');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms...`);
    });
  }
  return redisClient;
};

const redisInstance = getRedisClient();

export {
  getRedisClient,
  redisInstance as redis
};
