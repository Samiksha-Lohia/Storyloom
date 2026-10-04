import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['visible', 'hidden', 'removed'],
      default: 'visible',
      index: true,
    },
    readByWriter: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One review per reader per book
reviewSchema.index({ readerId: 1, bookId: 1 }, { unique: true });
// Compound index for fast catalogue & sorting queries
reviewSchema.index({ bookId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ bookId: 1, status: 1, rating: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
export { Review };
