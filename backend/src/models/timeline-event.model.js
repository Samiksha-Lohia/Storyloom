import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema(
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
    chronologicalOrder: {
      type: Number,
      required: true,
    },
    timeLabel: {
      type: String,
      default: '',
      trim: true,
    },
    isFlashback: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

timelineEventSchema.index({ documentId: 1, chronologicalOrder: 1 }, { unique: true });

const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);

export default TimelineEvent;
export { TimelineEvent };
