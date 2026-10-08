import mongoose from 'mongoose';

const dialogueSummarySchema = new mongoose.Schema(
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
    },
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      required: true,
    },
    summaryText: {
      type: String,
      required: true,
    },
    keyQuotes: [
      {
        type: String,
        trim: true,
      },
    ],
    tone: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

dialogueSummarySchema.index({ sceneId: 1, characterId: 1 }, { unique: true });
dialogueSummarySchema.index({ documentId: 1, characterId: 1 });

const DialogueSummary = mongoose.model('DialogueSummary', dialogueSummarySchema);

export default DialogueSummary;
export { DialogueSummary };
