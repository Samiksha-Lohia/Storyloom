import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const Block = mongoose.model('Block', blockSchema);

export default Block;
export { Block };
