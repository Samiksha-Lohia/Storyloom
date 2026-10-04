/**
 * Contact Information Filter per Spec Section 13.
 * Detects emails, phone numbers, and web URLs in messages
 * when contact sharing has not been explicitly enabled by the writer.
 */

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

// URL / Web link regex (protocols, www, or explicit top-level domains)
const PROTOCOL_URL_REGEX = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/i;
const TLD_URL_REGEX = /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(com|org|net|io|co|ai|app|dev|edu|gov|xyz|info|me|tv|biz|online|site|uk|ca|de|fr|in)\b(?:\/\S*)?/i;

// Phone number regex:
// Matches international or domestic phone numbers with 7 to 15 digits,
// optionally separated by spaces, dashes, dots, or parentheses.
// Guarded against plain numbers, years (e.g., 1980-1990), or small sequences.
const PHONE_REGEXES = [
  // Explicit country code format: +1 555-123-4567, +44 20 7946 0958
  /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  // 10 or 11 continuous digits
  /\b(?:\+?\d{1,3})?\d{10}\b/,
  // International format with 2-4 digit area code: +44 (0)20 7946 0958
  /\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/,
];

/**
 * Checks whether text contains contact information (email, phone, or URL).
 * @param {string} text
 * @returns {{ containsContact: boolean, type?: 'email' | 'url' | 'phone' }}
 */
export const detectContactInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { containsContact: false };
  }

  // 1. Check for email
  if (EMAIL_REGEX.test(text)) {
    return { containsContact: true, type: 'email' };
  }

  // 2. Check for URLs
  if (PROTOCOL_URL_REGEX.test(text) || TLD_URL_REGEX.test(text)) {
    return { containsContact: true, type: 'url' };
  }

  // 3. Check for phone numbers
  for (const regex of PHONE_REGEXES) {
    if (regex.test(text)) {
      return { containsContact: true, type: 'phone' };
    }
  }

  return { containsContact: false };
};

export default {
  detectContactInfo,
};
