export const FEATURES = {
  SCENES: 'scenes',
  CHARACTERS: 'characters',
  RELATIONSHIPS: 'relationships',
  TIMELINE: 'timeline',
  MOOD: 'mood',
  ARC: 'arc',
  SEARCH: 'search',
  ASK: 'ask',
  CONTINUITY: 'continuity',
  PITCH: 'pitch',
};

export const FEATURE_LIST = Object.values(FEATURES);

export const FEATURE_ACCESS_MODES = {
  FULL: 'full',
  FILTERED: 'filtered',
  SUMMARY: 'summary',
  MAIN_CAST: 'main-cast',
  HIDDEN: 'hidden',
  SPOILERS_ALLOWED: 'spoilers-allowed',
};

export const FEATURE_ACCESS_MODES_LIST = Object.values(FEATURE_ACCESS_MODES);

/**
 * Feature Access Matrix from Platform Spec Section 2.
 * Roles: writer (owner), reader, publisher, admin.
 */
export const FEATURE_ACCESS_MATRIX = {
  [FEATURES.SCENES]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.HIDDEN,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.CHARACTERS]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.MAIN_CAST,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.RELATIONSHIPS]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.FULL,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.TIMELINE]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.HIDDEN,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.MOOD]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.SUMMARY,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.ARC]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.SPOILERS_ALLOWED,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.SEARCH]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.HIDDEN,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.ASK]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.FILTERED,
    publisher: FEATURE_ACCESS_MODES.HIDDEN,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.CONTINUITY]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.HIDDEN,
    publisher: FEATURE_ACCESS_MODES.HIDDEN,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
  [FEATURES.PITCH]: {
    writer: FEATURE_ACCESS_MODES.FULL,
    reader: FEATURE_ACCESS_MODES.HIDDEN,
    publisher: FEATURE_ACCESS_MODES.FULL,
    admin: FEATURE_ACCESS_MODES.FULL,
  },
};

/**
 * Get access mode for a specific feature and effective role.
 *
 * @param {string} feature - Feature name (e.g. 'scenes', 'characters')
 * @param {string} effectiveRole - 'writer', 'reader', 'publisher', 'admin'
 * @returns {string} Mode: 'full' | 'filtered' | 'summary' | 'main-cast' | 'hidden' | 'spoilers-allowed'
 */
export function getFeatureAccessMode(feature, effectiveRole = 'reader') {
  const featureRow = FEATURE_ACCESS_MATRIX[feature];
  if (!featureRow) {
    return FEATURE_ACCESS_MODES.HIDDEN;
  }
  return featureRow[effectiveRole] || FEATURE_ACCESS_MODES.HIDDEN;
}

export default FEATURE_ACCESS_MATRIX;
