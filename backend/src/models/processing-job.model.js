import mongoose from 'mongoose';
import { STAGE_LIST, JOB_STATUS_LIST } from '../constants/index.js';

const processingJobSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    stage: {
      type: String,
      enum: STAGE_LIST,
      required: true,
    },
    status: {
      type: String,
      enum: JOB_STATUS_LIST,
      default: 'queued',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    dependsOn: [
      {
        type: String,
        enum: STAGE_LIST,
      },
    ],
    error: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

processingJobSchema.index({ documentId: 1, status: 1 });
processingJobSchema.index({ documentId: 1, stage: 1 }, { unique: true });

const ProcessingJob = mongoose.model('ProcessingJob', processingJobSchema);

export default ProcessingJob;
export { ProcessingJob };
