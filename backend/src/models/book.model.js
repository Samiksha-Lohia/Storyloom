import mongoose from 'mongoose';
import { BOOK_STATUSES, BOOK_STATUSES_LIST, BOOK_TEMPLATES, BOOK_TEMPLATES_LIST, BOOK_ACCENTS } from '../constants/book.js';

const bookSchema = new mongoose.Schema(
  {
    writerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    blurb: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    coverPublicId: {
      type: String,
      default: null,
    },
    coverUrl: {
      type: String,
      default: null,
    },
    genre: {
      type: String,
      default: 'General',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    mature: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: BOOK_STATUSES_LIST,
      default: BOOK_STATUSES.PROCESSING,
      index: true,
    },
    template: {
      type: String,
      enum: BOOK_TEMPLATES_LIST,
      default: BOOK_TEMPLATES.CLASSIC,
    },
    accent: {
      type: String,
      enum: BOOK_ACCENTS,
      default: BOOK_ACCENTS[0],
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    pageOffsets: {
      type: [Number],
      default: [],
    },
    pitchCard: {
      logline: { type: String, default: '' },
      genre: { type: String, default: '' },
      tone: { type: String, default: '' },
      targetAudience: { type: String, default: '' },
      audience: { type: String, default: '' },
      forFansOf: { type: [String], default: [] },
      comparableTitles: { type: [String], default: [] },
      generatedAt: { type: Date, default: null },
      inputHash: { type: String, default: null },
    },
    pitchCardCleared: {
      type: Boolean,
      default: false,
    },
    stats: {
      reads: { type: Number, default: 0 },
      ratingAvg: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      readingListAdds: { type: Number, default: 0 },
    },
    acceptedTermsAt: {
      type: Date,
      default: null,
    },
    termsVersion: {
      type: String,
      default: null,
    },
    seeded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound and catalogue indexes
bookSchema.index({ status: 1, genre: 1 });
bookSchema.index({ status: 1, createdAt: -1 });
bookSchema.index({ status: 1, 'stats.ratingAvg': -1 });
bookSchema.index({ status: 1, 'stats.completionRate': -1 });
bookSchema.index({ status: 1, pageCount: 1 });
bookSchema.index({ writerId: 1 });
bookSchema.index({ title: 'text', tags: 'text' });

const Book = mongoose.model('Book', bookSchema);

export default Book;
export { Book };
