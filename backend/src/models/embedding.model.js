import mongoose from 'mongoose';

const embeddingSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['scene', 'character', 'dialogue_summary'],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sceneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scene',
      default: null,
      index: true,
    },
    vector: {
      type: [Number],
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate vectors per source entity
embeddingSchema.index({ documentId: 1, sourceType: 1, sourceId: 1 }, { unique: true });

const Embedding = mongoose.model('Embedding', embeddingSchema);

export default Embedding;
export { Embedding };
