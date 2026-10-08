import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utilities/logger.js';

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URI || config.mongoose.url;
    const conn = await mongoose.connect(mongoUrl, {
      autoIndex: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    try {
      const booksCol = conn.connection.collection('books');
      const indexes = await booksCol.indexes();
      const textIdx = indexes.find((i) => i.name === 'title_text_tags_text');
      if (textIdx && textIdx.language_override !== 'none') {
        logger.info('Migrating books text index to language_override: none');
        await booksCol.dropIndex('title_text_tags_text');
        await booksCol.createIndex(
          { title: 'text', tags: 'text' },
          { default_language: 'english', language_override: 'none', background: true }
        );
      }
    } catch (idxErr) {
      logger.warn(`Books text index check notice: ${idxErr.message}`);
    }

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
