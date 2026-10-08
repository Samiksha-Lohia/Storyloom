import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { redis } from '../src/config/redis.js';

export const setupTestDB = (before, after, afterEach) => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    if (process.env.MONGO_URI) {
      if (process.env.MONGO_URI.includes('.mongodb.net/')) {
        process.env.MONGO_URI = process.env.MONGO_URI.replace(/\.mongodb\.net\/([^?]*)/, '.mongodb.net/scenecraft_test');
      } else if (process.env.MONGO_URI.includes('localhost')) {
        process.env.MONGO_URI = 'mongodb://localhost:27017/scenecraft_test';
      }
    } else {
      process.env.MONGO_URI = 'mongodb://localhost:27017/scenecraft_test';
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB();
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
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
    await redis.flushdb();
  });
};
