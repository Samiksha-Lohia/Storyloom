import mongoose from 'mongoose';
import {
  PUBLISH_REQUEST_STATUSES,
  PUBLISH_REQUEST_STATUSES_LIST,
  ALLOWED_RIGHTS,
} from '../constants/publish-request.js';

const publishRequestSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    publisherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    writerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },
    proposedTerms: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    rights: {
      type: [String],
      enum: ALLOWED_RIGHTS,
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one right must be specified.',
      },
    },
    status: {
      type: String,
      enum: PUBLISH_REQUEST_STATUSES_LIST,
      default: PUBLISH_REQUEST_STATUSES.PENDING,
      index: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    cooldownUntil: {
      type: Date,
      default: null,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

publishRequestSchema.index(
  { publisherId: 1, bookId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'accepted'] } },
  }
);

publishRequestSchema.index({ writerId: 1, status: 1, createdAt: -1 });
publishRequestSchema.index({ publisherId: 1, status: 1, createdAt: -1 });
publishRequestSchema.index({ bookId: 1, status: 1 });

const PublishRequest = mongoose.model('PublishRequest', publishRequestSchema);

export default PublishRequest;
export { PublishRequest };
