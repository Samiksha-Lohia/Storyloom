import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { USER_ROLES, USER_ROLES_LIST, USER_STATUSES, USER_STATUSES_LIST } from '../constants/user-roles.js';
import { BOOK_TEMPLATES, BOOK_TEMPLATES_LIST } from '../constants/book.js';

export const generateUsername = (name) => {
  const base = (name || 'user')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'user';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: USER_ROLES_LIST,
      default: USER_ROLES.READER,
      index: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES_LIST,
      default: USER_STATUSES.ACTIVE,
      index: true,
    },
    avatarPublicId: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    publisherProfile: {
      company: { type: String, default: null, trim: true },
      website: { type: String, default: null, trim: true },
      note: { type: String, default: null, trim: true },
      reviewStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      approvedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null, trim: true },
    },
    strikes: {
      type: Number,
      default: 0,
    },
    defaultTemplate: {
      type: String,
      enum: BOOK_TEMPLATES_LIST,
      default: BOOK_TEMPLATES.CLASSIC,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    matureAckAt: {
      type: Date,
      default: null,
    },
    suspensionEndsAt: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readerSettings: {
      fontSize: { type: Number, default: 16, min: 12, max: 32 },
      lineHeight: { type: Number, default: 1.6, min: 1.2, max: 2.5 },
      fontFamily: { type: String, enum: ['serif', 'sans'], default: 'serif' },
      theme: { type: String, enum: ['light', 'sepia', 'dark'], default: 'light' },
    },
    passwordResetToken: {
      type: String,
      default: null,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    termsVersion: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);


// Pre-validate hook to ensure username exists
userSchema.pre('validate', function (next) {
  if (!this.username) {
    this.username = generateUsername(this.name);
  }
  next();
});

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.username) {
    user.username = generateUsername(user.name);
  }
  if (user.isModified('passwordHash')) {
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
  next();
});

// Helper method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
export { User };
