import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    followerId: {
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
  },
  {
    timestamps: true,
  }
);

followSchema.index({ followerId: 1, writerId: 1 }, { unique: true });
followSchema.index({ writerId: 1, createdAt: -1 });

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
export { Follow };
