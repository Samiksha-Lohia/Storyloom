import mongoose from 'mongoose';
import characterRepository from '../repositories/character.repository.js';
import dialogueSummaryRepository from '../repositories/dialogue-summary.repository.js';
import embeddingRepository from '../repositories/embedding.repository.js';
import sceneRepository from '../repositories/scene.repository.js';
import { buildTextEmbedding, cosineSimilarity } from '../analysis/local-analyzer.js';
import { Embedding } from '../models/embedding.model.js';
import MoodAnalysis from '../models/mood-analysis.model.js';

import { SceneDto } from '../dtos/scene.dto.js';
import { CharacterDto } from '../dtos/character.dto.js';
import { DialogueSummaryDto } from '../dtos/dialogue-summary.dto.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hydrateAndFilterResult = async (embedding, score, filterHelpers) => {
  const {
    matchedCharacter,
    rangeSceneIds,
    moodSceneIds,
    visibleSceneIds,
    hasChar,
    hasRange,
    hasMood,
    hasVisibleScenes,
  } = filterHelpers;
  let source = null;
  let formattedSource = null;

  if (embedding.sourceType === 'scene') {
    source = await sceneRepository.findById(embedding.sourceId);
    if (!source) return null;

    if (hasVisibleScenes && !visibleSceneIds.has(source._id.toString())) return null;
    if (hasRange && !rangeSceneIds.has(source._id.toString())) return null;
    if (hasMood && !moodSceneIds.has(source._id.toString())) return null;
    if (hasChar) {
      if (!matchedCharacter) return null;
      const charIds = (source.characterIds || []).map(id => id.toString());
      if (!charIds.includes(matchedCharacter._id.toString())) return null;
    }

    formattedSource = SceneDto.toResponse(source);

  } else if (embedding.sourceType === 'character') {
    source = await characterRepository.findById(embedding.sourceId);
    if (!source) return null;

    const sceneIds = (source.sceneIds || []).map(id => id.toString());
    if (hasVisibleScenes) {
      const inVisible = sceneIds.some(id => visibleSceneIds.has(id));
      if (!inVisible) return null;
    }

    if (hasChar) {
      if (!matchedCharacter || source._id.toString() !== matchedCharacter._id.toString()) return null;
    }
    if (hasRange) {
      const inRange = sceneIds.some(id => rangeSceneIds.has(id));
      if (!inRange) return null;
    }
    if (hasMood) {
      const inMood = sceneIds.some(id => moodSceneIds.has(id));
      if (!inMood) return null;
    }

    formattedSource = CharacterDto.toResponse(source);
    if (hasVisibleScenes) {
      formattedSource.sceneIds = (formattedSource.sceneIds || []).filter(id =>
        visibleSceneIds.has(id.toString())
      );
    }

  } else if (embedding.sourceType === 'dialogue_summary') {
    source = await dialogueSummaryRepository.findById(embedding.sourceId);
    if (!source) return null;

    if (hasVisibleScenes && !visibleSceneIds.has(source.sceneId.toString())) return null;
    if (hasRange && !rangeSceneIds.has(source.sceneId.toString())) return null;
    if (hasMood && !moodSceneIds.has(source.sceneId.toString())) return null;
    if (hasChar) {
      if (!matchedCharacter || source.characterId.toString() !== matchedCharacter._id.toString()) return null;
    }

    formattedSource = DialogueSummaryDto.toResponse(source);
  }

  return {
    sourceType: embedding.sourceType,
    sourceId: embedding.sourceId,
    score,
    source: formattedSource,
  };
};

const semanticSearch = async (documentId, query, filters = {}, limit = 10) => {
  const queryVector = buildTextEmbedding(query);

  const filterHelpers = {
    matchedCharacter: null,
    rangeSceneIds: new Set(),
    moodSceneIds: new Set(),
    visibleSceneIds: filters.visibleSceneIds
      ? (filters.visibleSceneIds instanceof Set
          ? filters.visibleSceneIds
          : new Set(Array.from(filters.visibleSceneIds).map((id) => id.toString())))
      : null,
    hasChar: !!filters.character,
    hasRange: !!(filters.sceneRange || filters.sceneRangeFrom || filters.sceneRangeTo),
    hasMood: !!filters.mood,
    hasVisibleScenes: Boolean(filters.visibleSceneIds),
  };

  if (filterHelpers.hasChar) {
    const characterName = filters.character.trim();
    filterHelpers.matchedCharacter = await characterRepository.findOne({
      documentId,
      $or: [
        { name: new RegExp(escapeRegex(characterName), 'i') },
        { aliases: new RegExp(escapeRegex(characterName), 'i') }
      ]
    });
  }

  if (filterHelpers.hasMood) {
    const moodName = filters.mood.trim();
    const moodAnalyses = await MoodAnalysis.find({
      documentId,
      primaryMood: new RegExp(`^${escapeRegex(moodName)}$`, 'i')
    });
    filterHelpers.moodSceneIds = new Set(moodAnalyses.map(m => m.sceneId.toString()));
  }

  if (filterHelpers.hasRange) {
    const fromVal = parseInt(filters.sceneRangeFrom || filters.sceneRange?.from, 10) || 1;
    const toVal = parseInt(filters.sceneRangeTo || filters.sceneRange?.to, 10) || 999999;
    const scenesInRange = await sceneRepository.find({
      documentId,
      sceneNumber: { $gte: fromVal, $lte: toVal }
    });
    filterHelpers.rangeSceneIds = new Set(scenesInRange.map(s => s._id.toString()));
  }

  let ranked = [];
  const isOffline = process.env.OFFLINE_VECTOR_SEARCH === 'true';

  if (!isOffline) {
    try {
      ranked = await Embedding.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "vector",
            queryVector,
            numCandidates: 100,
            limit,
            filter: { documentId: new mongoose.Types.ObjectId(documentId) }
          }
        },
        {
          $project: {
            _id: 1,
            documentId: 1,
            sourceType: 1,
            sourceId: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);
    } catch (err) {
      ranked = [];
    }
  }

  if (!ranked || ranked.length === 0) {
    const allEmbeddings = await embeddingRepository.findByDocumentId(documentId);
    ranked = allEmbeddings
      .map((embedding) => ({
        _id: embedding._id,
        documentId: embedding.documentId,
        sourceType: embedding.sourceType,
        sourceId: embedding.sourceId,
        score: cosineSimilarity(queryVector, embedding.vector),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const hydrated = await Promise.all(
    ranked.map((item) => hydrateAndFilterResult(item, item.score, filterHelpers))
  );

  return hydrated.filter((item) => item !== null);
};

export { semanticSearch };
