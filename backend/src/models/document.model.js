import mongoose from 'mongoose';
import { DOCUMENT_STATUS_LIST } from '../constants/index.js';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt'],
      required: true,
    },
    storageUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUS_LIST,
      default: 'uploaded',
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    totalScenes: {
      type: Number,
      default: 0,
    },
    parsedText: {
      type: String,
      default: '',
      select: false,
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'uploadedAt', updatedAt: false },
  }
);

const Document = mongoose.model('Document', documentSchema);

export default Document;
export { Document };
