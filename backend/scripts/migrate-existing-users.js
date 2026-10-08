import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User, { generateUsername } from '../src/models/user.model.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import logger from '../src/utilities/logger.js';

async function migrateExistingUsers() {
  try {
    logger.info('Connecting to database for user migration...');
    await connectDB();

    const users = await User.find({});
    logger.info(`Found ${users.length} user(s) to check/migrate.`);

    let updatedCount = 0;

    for (const user of users) {
      let needsSave = false;

      if (!user.username) {
        let candidate = generateUsername(user.name);
        let exists = await User.findOne({ username: candidate, _id: { $ne: user._id } });
        while (exists) {
          candidate = generateUsername(user.name);
          exists = await User.findOne({ username: candidate, _id: { $ne: user._id } });
        }
        user.username = candidate;
        needsSave = true;
      }

      if (!user.role || user.role === 'reader') {
        user.role = USER_ROLES.WRITER;
        needsSave = true;
      }

      if (!user.status) {
        user.status = USER_STATUSES.ACTIVE;
        needsSave = true;
      }

      if (needsSave) {
        await user.save();
        updatedCount++;
      }
    }

    logger.info(`Migration complete. Successfully migrated ${updatedCount} user(s).`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`User migration failed: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

migrateExistingUsers();
