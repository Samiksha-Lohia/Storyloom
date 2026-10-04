import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    publisherId: {
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
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: each publisher can wishlist a book at most once
wishlistSchema.index({ publisherId: 1, bookId: 1 }, { unique: true });
wishlistSchema.index({ publisherId: 1, createdAt: -1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
export { Wishlist };
