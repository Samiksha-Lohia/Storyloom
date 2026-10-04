import mongoose from 'mongoose';

const READING_STATUSES = ['reading', 'want_to_read', 'finished', 'dropped'];

const readingListSchema = new mongoose.Schema(
  {
    readerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      enum: READING_STATUSES,
      default: 'reading',
      index: true,
    },
    currentOffset: {
      type: Number,
      default: 0,
      min: 0,
    },
    furthestOffset: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookmarks: [
      {
        offset: {
          type: Number,
          required: true,
          min: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Unique compound index: a reader has at most one entry per book
readingListSchema.index({ readerId: 1, bookId: 1 }, { unique: true });
// Index for drop-off aggregation and reader progress queries
readingListSchema.index({ bookId: 1, furthestOffset: 1 });

const ReadingList = mongoose.model('ReadingList', readingListSchema);

export default ReadingList;
export { ReadingList, READING_STATUSES };
