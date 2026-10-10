import Scene from '../models/scene.model.js';
import Character from '../models/character.model.js';
import {
  FEATURES,
  FEATURE_ACCESS_MODES,
  getFeatureAccessMode,
} from '../constants/feature-access.js';
import { USER_ROLES } from '../constants/user-roles.js';
import { ForbiddenError, NotFoundError } from '../utilities/custom-errors.js';
import * as searchService from './search.service.js';
import storyQaService from './story-qa.service.js';
import { generateJSON } from './ai-provider.service.js';
import { getAnalysisLanguageInstruction } from '../utilities/language.helper.js';

export function getEffectiveRole(user, book) {
  if (!user) {
    return USER_ROLES.READER;
  }
  if (user.role === USER_ROLES.ADMIN) {
    return USER_ROLES.ADMIN;
  }
  if (
    book &&
    book.writerId &&
    book.writerId.toString() === (user.id || user._id)?.toString()
  ) {
    return USER_ROLES.WRITER;
  }
  if (user.role === USER_ROLES.PUBLISHER) {
    return USER_ROLES.PUBLISHER;
  }
  return USER_ROLES.READER;
}

export async function filterAnalysis({
  feature,
  data,
  role = USER_ROLES.READER,
  book,
  furthestOffset = 0,
  showAll = false,
  single = false,
}) {
  const mode = getFeatureAccessMode(feature, role);

  if (mode === FEATURE_ACCESS_MODES.HIDDEN) {
    throw new ForbiddenError(
      `Access to '${feature}' analysis is not permitted for your role.`,
      'FEATURE_ACCESS_RESTRICTED'
    );
  }

  if (mode === FEATURE_ACCESS_MODES.FULL || role === USER_ROLES.READER) {
    return data;
  }

  if (mode === FEATURE_ACCESS_MODES.MAIN_CAST) {
    const isMainCast = (char) =>
      char && (char.role === 'protagonist' || char.role === 'antagonist');

    if (single) {
      if (!isMainCast(data)) {
        throw new NotFoundError('Character not found.');
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.filter(isMainCast);
    }
    if (data && Array.isArray(data.results)) {
      const filtered = data.results.filter(isMainCast);
      return {
        ...data,
        results: filtered,
        pagination: data.pagination
          ? { ...data.pagination, total: filtered.length }
          : undefined,
      };
    }
    return data;
  }

  if (mode === FEATURE_ACCESS_MODES.SUMMARY) {
    const records = Array.isArray(data) ? data : data?.results || [];
    const moodCounts = {};
    let totalIntensity = 0;
    const emotionSums = {};

    records.forEach((m) => {
      if (m.primaryMood) {
        moodCounts[m.primaryMood] = (moodCounts[m.primaryMood] || 0) + 1;
      }
      totalIntensity += m.intensity || 0;
      if (m.emotionScores) {
        const scores =
          m.emotionScores instanceof Map
            ? Object.fromEntries(m.emotionScores)
            : m.emotionScores;
        for (const [emo, val] of Object.entries(scores)) {
          emotionSums[emo] = (emotionSums[emo] || 0) + Number(val || 0);
        }
      }
    });

    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const dominantMood = sortedMoods[0]?.[0] || 'Neutral';
    const count = records.length || 1;
    const avgIntensity = Math.round((totalIntensity / count) * 100) / 100;
    const aggregatedEmotions = {};
    for (const [emo, sum] of Object.entries(emotionSums)) {
      aggregatedEmotions[emo] = Math.round((sum / count) * 100) / 100;
    }

    return {
      summary: {
        dominantMood,
        averageIntensity: avgIntensity,
        moodDistribution: moodCounts,
        emotionScores: aggregatedEmotions,
        totalScenesAnalyzed: records.length,
      },
      results: [],
    };
  }

  return data;
}

export async function searchWithSpoilerProtection({
  documentId,
  book,
  role = USER_ROLES.READER,
  furthestOffset = 0,
  showAll = false,
  query,
  filters = {},
  limit = 10,
}) {
  const mode = getFeatureAccessMode(FEATURES.SEARCH, role);

  if (mode === FEATURE_ACCESS_MODES.HIDDEN) {
    throw new ForbiddenError(
      'Search analysis is not permitted for your role.',
      'FEATURE_ACCESS_RESTRICTED'
    );
  }

  const results = await searchService.semanticSearch(
    documentId,
    query,
    filters,
    limit
  );

  return results;
}

export async function askWithSpoilerProtection({
  documentId,
  book,
  role = USER_ROLES.READER,
  furthestOffset = 0,
  showAll = false,
  question,
  history = [],
}) {
  const mode = getFeatureAccessMode(FEATURES.ASK, role);

  if (mode === FEATURE_ACCESS_MODES.HIDDEN) {
    throw new ForbiddenError(
      'Story Q&A analysis is not permitted for your role.',
      'FEATURE_ACCESS_RESTRICTED'
    );
  }

  return storyQaService.answerStoryQuestion({
    documentId,
    question,
    history,
    maxVisibleSceneNumber: null,
    book,
    role,
  });
}

export default {
  getEffectiveRole,
  filterAnalysis,
  searchWithSpoilerProtection,
  askWithSpoilerProtection,
};
