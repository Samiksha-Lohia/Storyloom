import mongoose from 'mongoose';
import {
  CONVERSATION_STATUSES,
  CONVERSATION_STATUSES_LIST,
} from '../constants/publish-request.js';

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: 'A conversation must have exactly two participants.',
      },
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublishRequest',
      required: true,
      unique: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CONVERSATION_STATUSES_LIST,
      default: CONVERSATION_STATUSES.OPEN,
      index: true,
    },
    contactSharingEnabled: {
      type: Boolean,
      default: false,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, status: 1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
export { Conversation };
