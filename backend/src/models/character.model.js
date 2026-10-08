import mongoose from 'mongoose';
import { CHARACTER_ROLE_LIST } from '../constants/index.js';

const characterSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
      },
    ],
    role: {
      type: String,
      enum: CHARACTER_ROLE_LIST,
      default: 'supporting',
    },
    traits: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      default: '',
    },
    arcSummary: {
      type: String,
      default: '',
    },
    sceneIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene',
      },
    ],
  },
  {
    timestamps: true,
  }
);

characterSchema.index({ name: 'text', aliases: 'text' }, { default_language: 'english', language_override: 'none' });

const Character = mongoose.model('Character', characterSchema);

export default Character;
export { Character };
