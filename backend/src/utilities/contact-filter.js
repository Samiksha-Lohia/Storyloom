const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

const PROTOCOL_URL_REGEX = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/i;
const TLD_URL_REGEX = /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(com|org|net|io|co|ai|app|dev|edu|gov|xyz|info|me|tv|biz|online|site|uk|ca|de|fr|in)\b(?:\/\S*)?/i;

const PHONE_REGEXES = [
  /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b(?:\+?\d{1,3})?\d{10}\b/,
  /\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/,
];

export const detectContactInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { containsContact: false };
  }

  if (EMAIL_REGEX.test(text)) {
    return { containsContact: true, type: 'email' };
  }

  if (PROTOCOL_URL_REGEX.test(text) || TLD_URL_REGEX.test(text)) {
    return { containsContact: true, type: 'url' };
  }

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
