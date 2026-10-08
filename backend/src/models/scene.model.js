import mongoose from 'mongoose';

const sceneSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    sceneNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    characterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
      },
    ],
    textRange: {
      start: {
        type: Number,
        required: true,
      },
      end: {
        type: Number,
        required: true,
      },
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    rawText: {
      type: String,
      default: '',
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

sceneSchema.index({ documentId: 1, sceneNumber: 1 }, { unique: true });

const Scene = mongoose.model('Scene', sceneSchema);

export default Scene;
export { Scene };
