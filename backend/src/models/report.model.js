import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['book', 'review', 'user', 'conversation'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['copyright', 'plagiarism', 'abuse', 'spam', 'other'],
      required: true,
      index: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
      maxlength: 3000,
    },
    claimantName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    claimantContact: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    source: {
      type: String,
      enum: ['app', 'public'],
      default: 'app',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'reviewing', 'closed'],
      default: 'open',
      index: true,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
    outcome: {
      type: String,
      default: null,
    },
    adminNotes: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index to quickly check active reports by a reporter for duplicate guard
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1, status: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
export { Report };
