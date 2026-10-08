import Book from '../models/book.model.js';
import Document from '../models/document.model.js';

export const isHindiLanguage = (lang) => {
  if (!lang) return false;
  const l = String(lang).trim().toLowerCase();
  return l === 'hi' || l === 'hin' || l === 'hindi';
};

export const getAnalysisLanguageInstruction = (language) => {
  if (isHindiLanguage(language)) {
    return 'The source story is in Hindi. Generate all human-readable analysis content in Hindi. Preserve character names/proper nouns as they appear in the source story. Keep all machine-readable enum values and JSON structure unchanged. Return valid JSON.';
  }
  return '';
};

export const resolveStoryLanguage = async (documentId) => {
  if (!documentId) return 'en';
  try {
    const book = await Book.findOne({ documentId }).select('language');
    if (book?.language) return book.language;

    const doc = await Document.findById(documentId).select('bookId language');
    if (doc?.bookId) {
      const parentBook = await Book.findById(doc.bookId).select('language');
      if (parentBook?.language) return parentBook.language;
    }
    return doc?.language || 'en';
  } catch {
    return 'en';
  }
};

export const buildWordBoundaryRegex = (term) => {
  if (!term || typeof term !== 'string') return /(?!)/;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_])${escaped}(?=[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
};

export default {
  isHindiLanguage,
  getAnalysisLanguageInstruction,
  resolveStoryLanguage,
  buildWordBoundaryRegex,
};
