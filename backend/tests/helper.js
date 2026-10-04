import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { redis } from '../src/config/redis.js';

export const setupTestDB = (before, after, afterEach) => {
  before(async () => {
    // Set environment to test
    process.env.NODE_ENV = 'test';
    // Use test DB to prevent polluting or wiping dev DB
    if (process.env.MONGO_URI) {
      if (process.env.MONGO_URI.includes('.mongodb.net/')) {
        process.env.MONGO_URI = process.env.MONGO_URI.replace(/\.mongodb\.net\/([^?]*)/, '.mongodb.net/scenecraft_test');
      } else if (process.env.MONGO_URI.includes('localhost')) {
        process.env.MONGO_URI = 'mongodb://localhost:27017/scenecraft_test';
      }
    } else {
      process.env.MONGO_URI = 'mongodb://localhost:27017/scenecraft_test';
    }
    // Ensure connection is using test DB
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB();
    // Clean up any stale data from interrupted test runs
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
    await redis.flushdb();
  });

  after(async () => {
    await mongoose.connection.close();
    await redis.quit();
  });

  afterEach(async () => {
    // Reset all database collections
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
    // Clear all Redis keys to reset rate limiters and refresh tokens
    await redis.flushdb();
  });
};
