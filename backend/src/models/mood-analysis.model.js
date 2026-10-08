import mongoose from 'mongoose';

const moodAnalysisSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    sceneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scene',
      required: true,
      unique: true,
    },
    primaryMood: {
      type: String,
      required: true,
      trim: true,
    },
    emotionScores: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    intensity: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MoodAnalysis = mongoose.model('MoodAnalysis', moodAnalysisSchema);

export default MoodAnalysis;
export { MoodAnalysis };
