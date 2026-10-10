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

  const isReaderOptedOut = role === USER_ROLES.READER && showAll === true;

  if (isReaderOptedOut) {
    if (feature === FEATURES.CHARACTERS) {
      const stripArc = (c) => {
        const copy = typeof c.toObject === 'function' ? c.toObject() : { ...c };
        delete copy.arcSummary;
        return copy;
      };

      if (single) {
        return stripArc(data);
      }
      if (Array.isArray(data)) {
        return data.map(stripArc);
      }
      if (data && Array.isArray(data.results)) {
        return {
          ...data,
          results: data.results.map(stripArc),
        };
      }
    }
    return data;
  }

  const documentId = book.documentId?._id || book.documentId;
  const allScenes = await Scene.find({ documentId })
    .sort({ sceneNumber: 1 })
    .lean();

  let visibleScenes = allScenes.filter(
    (s) => (s.textRange?.start ?? 0) <= furthestOffset
  );
  if (visibleScenes.length === 0 && allScenes.length > 0) {
    visibleScenes = [allScenes[0]];
  }
  const visibleSceneIdSet = new Set(visibleScenes.map((s) => s._id.toString()));

  switch (feature) {
    case FEATURES.SCENES: {
      const isVisible = (s) =>
        visibleSceneIdSet.has((s._id || s.id)?.toString());

      if (single) {
        if (!isVisible(data)) {
          throw new NotFoundError('Scene not found.');
        }
        return data;
      }
      if (Array.isArray(data)) {
        return data.filter(isVisible);
      }
      if (data && Array.isArray(data.results)) {
        const filtered = data.results.filter(isVisible);
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

    case FEATURES.CHARACTERS: {
      const transformChar = (char) => {
        const copy =
          typeof char.toObject === 'function' ? char.toObject() : { ...char };
        const rawIds = copy.sceneIds || [];
        copy.sceneIds = rawIds.filter((id) =>
          visibleSceneIdSet.has((id._id || id).toString())
        );
        delete copy.arcSummary;
        return copy;
      };

      const isCharVisible = (char) => {
        const rawIds = char.sceneIds || [];
        return rawIds.some((id) =>
          visibleSceneIdSet.has((id._id || id).toString())
        );
      };

      if (single) {
        if (!isCharVisible(data)) {
          throw new NotFoundError('Character not found.');
        }
        return transformChar(data);
      }

      if (Array.isArray(data)) {
        return data.filter(isCharVisible).map(transformChar);
      }
      if (data && Array.isArray(data.results)) {
        const filtered = data.results.filter(isCharVisible).map(transformChar);
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

    case FEATURES.RELATIONSHIPS: {
      const allChars = await Character.find({ documentId }).lean();
      const visibleCharIdSet = new Set(
        allChars
          .filter((c) =>
            (c.sceneIds || []).some((id) =>
              visibleSceneIdSet.has((id._id || id).toString())
            )
          )
          .map((c) => c._id.toString())
      );

      const filterRel = (rel) => {
        const copy =
          typeof rel.toObject === 'function' ? rel.toObject() : { ...rel };
        const charA = (copy.characterAId?._id || copy.characterAId)?.toString();
        const charB = (copy.characterBId?._id || copy.characterBId)?.toString();

        if (!visibleCharIdSet.has(charA) || !visibleCharIdSet.has(charB)) {
          return null;
        }

        const rawSceneIds = copy.sceneIds || [];
        const visibleIds = rawSceneIds.filter((id) =>
          visibleSceneIdSet.has((id._id || id).toString())
        );
        if (visibleIds.length === 0) {
          return null;
        }

        copy.sceneIds = visibleIds;

        if (copy.sentimentBySceneId) {
          if (copy.sentimentBySceneId instanceof Map) {
            const trimmed = new Map();
            for (const [k, v] of copy.sentimentBySceneId.entries()) {
              if (visibleSceneIdSet.has(k.toString())) {
                trimmed.set(k, v);
              }
            }
            copy.sentimentBySceneId = trimmed;
          } else if (typeof copy.sentimentBySceneId === 'object') {
            const trimmed = {};
            for (const [k, v] of Object.entries(copy.sentimentBySceneId)) {
              if (visibleSceneIdSet.has(k.toString())) {
                trimmed[k] = v;
              }
            }
            copy.sentimentBySceneId = trimmed;
          }
        }

        return copy;
      };

      const rawList = Array.isArray(data) ? data : data?.results || [];
      const filtered = rawList.map(filterRel).filter(Boolean);

      if (Array.isArray(data)) {
        return filtered;
      }
      return {
        ...data,
        results: filtered,
        pagination: data.pagination
          ? { ...data.pagination, total: filtered.length }
          : undefined,
      };
    }

    case FEATURES.TIMELINE: {
      const isVisible = (evt) =>
        visibleSceneIdSet.has((evt.sceneId?._id || evt.sceneId)?.toString());

      if (Array.isArray(data)) {
        return data.filter(isVisible);
      }
      if (data && Array.isArray(data.results)) {
        return {
          ...data,
          results: data.results.filter(isVisible),
        };
      }
      return data;
    }

    case FEATURES.MOOD: {
      const isVisible = (m) =>
        visibleSceneIdSet.has((m.sceneId?._id || m.sceneId)?.toString());

      if (Array.isArray(data)) {
        return data.filter(isVisible);
      }
      if (data && Array.isArray(data.results)) {
        return {
          ...data,
          results: data.results.filter(isVisible),
        };
      }
      return data;
    }

    case FEATURES.ARC: {
      const copy =
        typeof data.toObject === 'function' ? data.toObject() : { ...data };

      copy.arcPoints = (copy.arcPoints || []).filter((pt) =>
        visibleSceneIdSet.has((pt.sceneId?._id || pt.sceneId)?.toString())
      );

      const climaxId = (
        copy.climaxSceneId?._id || copy.climaxSceneId
      )?.toString();
      if (climaxId && !visibleSceneIdSet.has(climaxId)) {
        copy.climaxSceneId = null;
      }

      return copy;
    }

    default:
      return data;
  }
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
