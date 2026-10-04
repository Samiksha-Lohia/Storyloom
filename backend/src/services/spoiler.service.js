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
import { generateJSON } from './ai-provider.service.js';

/**
 * Resolves the effective role of a user for a given book.
 * - 'admin' if user is admin
 * - 'writer' if user is the book's writer/owner
 * - 'publisher' if user has publisher role
 * - 'reader' for readers, guests, or writers viewing other writers' books
 */
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

/**
 * Filter analysis data according to role, book, furthestOffset, and showAll opt-out.
 * Single source of truth for spoiler and role-mode filtering.
 *
 * @param {object} options
 * @param {string} options.feature - One of FEATURES (scenes, characters, relationships, timeline, mood, arc, continuity, pitch)
 * @param {any} options.data - Raw data returned from domain service
 * @param {string} options.role - Effective role ('writer', 'reader', 'publisher', 'admin')
 * @param {object} options.book - Book document (with documentId, pageOffsets, etc.)
 * @param {number} [options.furthestOffset=0] - Viewer's furthest read character offset
 * @param {boolean} [options.showAll=false] - Show all opt-out (readers only)
 * @param {boolean} [options.single=false] - Whether data is a single item (e.g. single character)
 * @returns {Promise<any>} Filtered data
 */
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

  // 1. HIDDEN Mode: 403 Forbidden
  if (mode === FEATURE_ACCESS_MODES.HIDDEN) {
    throw new ForbiddenError(
      `Access to '${feature}' analysis is not permitted for your role.`,
      'FEATURE_ACCESS_RESTRICTED'
    );
  }

  // 2. FULL Mode (Writer owner or Admin)
  if (mode === FEATURE_ACCESS_MODES.FULL) {
    return data;
  }

  // 3. SPOILERS_ALLOWED Mode (Publisher on Arc)
  if (mode === FEATURE_ACCESS_MODES.SPOILERS_ALLOWED) {
    return data;
  }

  // 4. MAIN_CAST Mode (Publisher on Characters)
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

  // 5. SUMMARY Mode (Publisher on Mood)
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

  // 6. FILTERED Mode (Reader)
  // Readers may opt out via showAll=true
  const isReaderOptedOut = role === USER_ROLES.READER && showAll === true;

  if (isReaderOptedOut) {
    // Show all data, but still enforce reader privacy rules: omit arcSummary
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

  // Normal spoiler filtering for readers:
  // Retrieve all scenes for the document to compute the visible cutoff
  const documentId = book.documentId?._id || book.documentId;
  const allScenes = await Scene.find({ documentId })
    .sort({ sceneNumber: 1 })
    .lean();

  const visibleScenes = allScenes.filter(
    (s) => (s.textRange?.start ?? 0) < furthestOffset
  );
  const visibleSceneIdSet = new Set(visibleScenes.map((s) => s._id.toString()));

  // Apply per-feature spoiler filtering
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
        delete copy.arcSummary; // Omit arcSummary for readers
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
      // Find all characters visible up to furthestOffset
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

        // Both characters visible
        if (!visibleCharIdSet.has(charA) || !visibleCharIdSet.has(charB)) {
          return null;
        }

        // At least one visible scene
        const rawSceneIds = copy.sceneIds || [];
        const visibleIds = rawSceneIds.filter((id) =>
          visibleSceneIdSet.has((id._id || id).toString())
        );
        if (visibleIds.length === 0) {
          return null;
        }

        copy.sceneIds = visibleIds;

        // Trim sentimentBySceneId
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

      // Keep points for visible scenes
      copy.arcPoints = (copy.arcPoints || []).filter((pt) =>
        visibleSceneIdSet.has((pt.sceneId?._id || pt.sceneId)?.toString())
      );

      // Null climaxSceneId if not visible
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

/**
 * Semantic search with role-gated spoiler protection.
 */
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

  const isReaderOptedOut = role === USER_ROLES.READER && showAll === true;

  let searchFilters = { ...filters };

  if (mode === FEATURE_ACCESS_MODES.FILTERED && !isReaderOptedOut) {
    const allScenes = await Scene.find({ documentId })
      .sort({ sceneNumber: 1 })
      .lean();
    const visibleScenes = allScenes.filter(
      (s) => (s.textRange?.start ?? 0) < furthestOffset
    );
    const visibleSceneIds = new Set(visibleScenes.map((s) => s._id.toString()));
    searchFilters.visibleSceneIds = visibleSceneIds;
  }

  const results = await searchService.semanticSearch(
    documentId,
    query,
    searchFilters,
    limit
  );

  // Strip arcSummary from character results if reader
  if (role === USER_ROLES.READER) {
    results.forEach((item) => {
      if (item.sourceType === 'character' && item.source) {
        delete item.source.arcSummary;
      }
    });
  }

  return results;
}

/**
 * Ask Questions (Q&A) with role-gated spoiler protection and LLM context boundary.
 */
export async function askWithSpoilerProtection({
  documentId,
  book,
  role = USER_ROLES.READER,
  furthestOffset = 0,
  showAll = false,
  question,
}) {
  const mode = getFeatureAccessMode(FEATURES.ASK, role);

  if (mode === FEATURE_ACCESS_MODES.HIDDEN) {
    throw new ForbiddenError(
      'Story Q&A analysis is not permitted for your role.',
      'FEATURE_ACCESS_RESTRICTED'
    );
  }

  const isReaderOptedOut = role === USER_ROLES.READER && showAll === true;

  let searchFilters = {};
  let maxVisibleSceneNumber = null;

  if (mode === FEATURE_ACCESS_MODES.FILTERED && !isReaderOptedOut) {
    const allScenes = await Scene.find({ documentId })
      .sort({ sceneNumber: 1 })
      .lean();
    const visibleScenes = allScenes.filter(
      (s) => (s.textRange?.start ?? 0) < furthestOffset
    );
    const visibleSceneIds = new Set(visibleScenes.map((s) => s._id.toString()));
    searchFilters.visibleSceneIds = visibleSceneIds;

    if (visibleScenes.length > 0) {
      maxVisibleSceneNumber = Math.max(
        ...visibleScenes.map((s) => s.sceneNumber || 1)
      );
    }
  }

  // 1. Search top 5 matches strictly within visible scenes
  const results = await searchService.semanticSearch(
    documentId,
    question,
    searchFilters,
    5
  );

  // 2. Hydrate context text
  const context = results
    .map((item) => {
      if (item.sourceType === 'scene') {
        return `[Scene ${item.source.sceneNumber}] Title: ${item.source.title}\nSummary: ${item.source.summary}`;
      }
      if (item.sourceType === 'character') {
        return `[Character Profile] Name: ${item.source.name} (Role: ${item.source.role})\nDescription: ${item.source.description}\nTraits: ${(item.source.traits || []).join(', ')}`;
      }
      if (item.sourceType === 'dialogue_summary') {
        return `[Dialogue Summary] Summary: ${item.source.summaryText}\nTone: ${item.source.tone}\nKey Quotes:\n${(item.source.keyQuotes || []).map((q) => `- "${q}"`).join('\n')}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Guard against leaking plot past the cutoff
  const boundaryInstruction =
    maxVisibleSceneNumber !== null
      ? `CRITICAL SPOILER CONSTRAINT: The reader has only read up to Scene ${maxVisibleSceneNumber}. You MUST NOT reveal, mention, or hint at any events, twists, character deaths, or plot developments beyond Scene ${maxVisibleSceneNumber}. If the question asks about events not yet reached, explain that this happens later in the story and is hidden to protect spoilers.`
      : '';

  const prompt = `You are a story analysis assistant for SceneCraft. Answer the user's question about the story based ONLY on the provided analysis context.
${boundaryInstruction}

Context:
${context || 'No specific context found within the pages read so far.'}

Question:
${question}

Return your response as a JSON object matching this schema:
{
  "answer": "A detailed and accurate answer based on the context."
}`;

  try {
    const responseObj = await generateJSON(prompt, null, 'continuity');
    return {
      answer:
        responseObj.answer ||
        'I could not extract an answer from the pages read so far.',
    };
  } catch (err) {
    return {
      answer:
        'Analysis assistant is temporarily unavailable. Please try again later.',
    };
  }
}

export default {
  getEffectiveRole,
  filterAnalysis,
  searchWithSpoilerProtection,
  askWithSpoilerProtection,
};
