import Book from '../models/book.model.js';
import Document from '../models/document.model.js';

/**
 * Checks if a language code or string represents Hindi.
 *
 * @param {string} lang
 * @returns {boolean}
 */
export const isHindiLanguage = (lang) => {
  if (!lang) return false;
  const l = String(lang).trim().toLowerCase();
  return l === 'hi' || l === 'hin' || l === 'hindi';
};

/**
 * Centralized reusable backend helper returning prompt instructions
 * for analysis generation based on language.
 *
 * @param {string} language
 * @returns {string}
 */
export const getAnalysisLanguageInstruction = (language) => {
  if (isHindiLanguage(language)) {
    return 'The source story is in Hindi. Generate all human-readable analysis content in Hindi. Preserve character names/proper nouns as they appear in the source story. Keep all machine-readable enum values and JSON structure unchanged. Return valid JSON.';
  }
  return '';
};

/**
 * Safely resolves the language for a document or book.
 * Defaults to 'en' if not set or found.
 *
 * @param {string} documentId
 * @returns {Promise<string>}
 */
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

/**
 * Creates a regex that safely matches character names as whole words
 * in both ASCII/English and Unicode/Devanagari scripts without breaking on combining marks.
 *
 * @param {string} term
 * @returns {RegExp}
 */
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
