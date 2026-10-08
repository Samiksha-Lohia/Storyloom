import mongoose from 'mongoose';

const arcPointSchema = new mongoose.Schema(
  {
    sceneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scene',
      required: true,
    },
    tensionScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    label: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const storyArcSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
    },
    arcPoints: [arcPointSchema],
    climaxSceneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scene',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const StoryArc = mongoose.model('StoryArc', storyArcSchema);

export default StoryArc;
export { StoryArc };
