import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import User from '../src/models/user.model.js';
import { USER_ROLES, USER_STATUSES } from '../src/constants/user-roles.js';
import { BOOK_TEMPLATES } from '../src/constants/book.js';
import logger from '../src/utilities/logger.js';

const DEMO_USERS = [
  {
    name: 'Platform Admin',
    email: 'admin@scenecraft.com',
    password: 'Password123!',
    role: USER_ROLES.ADMIN,
    status: USER_STATUSES.ACTIVE,
    username: 'platform-admin',
    bio: 'SceneCraft system administrator.',
  },
  {
    name: 'Sarah Publisher',
    email: 'publisher@scenecraft.com',
    password: 'Password123!',
    role: USER_ROLES.PUBLISHER,
    status: USER_STATUSES.ACTIVE,
    username: 'sarah-publisher',
    bio: 'Senior acquisitions editor at Apex Literary Publishing.',
    publisherProfile: {
      company: 'Apex Literary Publishing',
      website: 'https://apexlit.example.com',
      note: 'Acquiring high fantasy and speculative fiction.',
      reviewStatus: 'approved',
      approvedAt: new Date('2026-09-01'),
    },
  },
  {
    name: 'Marcus Pending',
    email: 'pending.publisher@scenecraft.com',
    password: 'Password123!',
    role: USER_ROLES.PUBLISHER,
    status: USER_STATUSES.PENDING,
    username: 'marcus-pending',
    bio: 'Independent publisher applicant.',
    publisherProfile: {
      company: 'Starlight Books',
      website: 'https://starlightbooks.example.com',
      note: 'Looking to acquire character-driven sci-fi manuscripts.',
      reviewStatus: 'pending',
    },
  },
  {
    name: 'Elena Vance',
    email: 'writer@scenecraft.com',
    password: 'Password123!',
    role: USER_ROLES.WRITER,
    status: USER_STATUSES.ACTIVE,
    username: 'elena-vance',
    bio: 'Bestselling speculative fiction author and worldbuilder. Writing stories where myth and memory collide.',
    defaultTemplate: BOOK_TEMPLATES.SHOWCASE,
  },
  {
    name: 'Alex Reader',
    email: 'reader@scenecraft.com',
    password: 'Password123!',
    role: USER_ROLES.READER,
    status: USER_STATUSES.ACTIVE,
    username: 'alex-reader',
    bio: 'Avid reader and fiction enthusiast.',
  },
];

export async function seedUsers() {
  try {
    logger.info('Connecting to database for demo users seeding...');
    await connectDB();

    for (const userData of DEMO_USERS) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = new User({
          name: userData.name,
          email: userData.email,
          passwordHash: userData.password,
          role: userData.role,
          status: userData.status,
          username: userData.username,
          bio: userData.bio,
          publisherProfile: userData.publisherProfile || {},
          defaultTemplate: userData.defaultTemplate || BOOK_TEMPLATES.CLASSIC,
        });
        await user.save();
        logger.info(`Created demo user: ${userData.email} (${userData.role})`);
      } else {
        user.name = userData.name;
        user.passwordHash = userData.password;
        user.role = userData.role;
        user.status = userData.status;
        user.username = userData.username;
        user.bio = userData.bio;
        if (userData.publisherProfile) {
          user.publisherProfile = userData.publisherProfile;
        }
        if (userData.defaultTemplate) {
          user.defaultTemplate = userData.defaultTemplate;
        }
        await user.save();
        logger.info(`Updated demo user: ${userData.email} (${userData.role})`);
      }
    }

    logger.info('All demo users successfully seeded/updated.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`User seeding failed: ${err.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed-users.js')) {
  seedUsers();
}
