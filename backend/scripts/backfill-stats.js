import connectDB from '../src/config/db.js';
import { redis } from '../src/config/redis.js';
import mongoose from 'mongoose';
import { rollupDateRange, refreshAllBookStats } from '../src/services/stats-rollup.service.js';
import logger from '../src/utilities/logger.js';

const parseArgs = () => {
  const args = process.argv.slice(2);
  let days = 30;
  let start = null;
  let end = null;

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      days = parseInt(arg.split('=')[1], 10) || 30;
    } else if (arg.startsWith('--start=')) {
      start = arg.split('=')[1];
    } else if (arg.startsWith('--end=')) {
      end = arg.split('=')[1];
    }
  }

  if (!start) {
    const endDateObj = new Date();
    const startDateObj = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    start = startDateObj.toISOString().slice(0, 10);
    end = endDateObj.toISOString().slice(0, 10);
  } else if (!end) {
    end = new Date().toISOString().slice(0, 10);
  }

  return { start, end };
};

const run = async () => {
  try {
    const { start, end } = parseArgs();
    logger.info(`Starting stats backfill from ${start} to ${end}...`);

    await connectDB();

    const results = await rollupDateRange(start, end);
    logger.info(`Backfilled ${results.length} days successfully.`);

    await refreshAllBookStats();
    logger.info('Refreshed all book stats successfully.');

    await mongoose.connection.close();
    await redis.quit();
    logger.info('Done.');
    process.exit(0);
  } catch (err) {
    logger.error(`Backfill failed: ${err.message}`);
    process.exit(1);
  }
};

run();
