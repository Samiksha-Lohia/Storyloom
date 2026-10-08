import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/user.model.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import logger from '../src/utilities/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : '';
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
  }

  if (password.length < 12) {
    logger.error('ADMIN_PASSWORD must be at least 12 characters.');
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  logger.info(`Checking admin account for email: ${email}...`);
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === USER_ROLES.ADMIN) {
      logger.info(`Admin user with email ${email} already exists and is configured. No changes made.`);
      return existing;
    }

    existing.role = USER_ROLES.ADMIN;
    existing.status = USER_STATUSES.ACTIVE;
    await existing.save();
    logger.info(`Existing user ${email} upgraded to admin.`);
    return existing;
  }

  const admin = await User.create({
    name: 'Platform Admin',
    email,
    passwordHash: password,
    role: USER_ROLES.ADMIN,
    status: USER_STATUSES.ACTIVE,
  });

  logger.info(`Admin account successfully created for ${email}.`);
  return admin;
}

if (process.argv[1] && process.argv[1].endsWith('seed-admin.js')) {
  seedAdmin()
    .then(async () => {
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error(`Admin seeding failed: ${err.message}`);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      process.exit(1);
    });
}
