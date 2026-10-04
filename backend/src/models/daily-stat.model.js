import mongoose from 'mongoose';

export const STAT_SCOPES = ['book', 'writer', 'platform'];

const dailyStatSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: STAT_SCOPES,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    reads: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    readingListAdds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound unique index ensuring idempotency per date, scope, and target
dailyStatSchema.index(
  { date: 1, scope: 1, targetId: 1 },
  { unique: true }
);

// Range and lookup queries
dailyStatSchema.index({ scope: 1, targetId: 1, date: 1 });

const DailyStat = mongoose.model('DailyStat', dailyStatSchema);

export default DailyStat;
export { DailyStat };
