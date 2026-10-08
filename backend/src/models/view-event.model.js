import mongoose from 'mongoose';

export const VIEW_EVENT_TYPES = ['book_view', 'profile_view', 'active'];

const viewEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: VIEW_EVENT_TYPES,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    viewerKey: {
      type: String,
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

viewEventSchema.index(
  { type: 1, targetId: 1, viewerKey: 1, day: 1 },
  { unique: true }
);

viewEventSchema.index({ day: 1, type: 1, targetId: 1 });

const ViewEvent = mongoose.model('ViewEvent', viewEventSchema);

export default ViewEvent;
export { ViewEvent };
