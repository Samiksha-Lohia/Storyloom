import characterRepository from '../repositories/character.repository.js';
import { NotFoundError } from '../utilities/custom-errors.js';
import { CharacterDto } from '../dtos/character.dto.js';

const ROLE_PRIORITY = { protagonist: 1, antagonist: 2, supporting: 3 };

const sortCharactersByRole = (characters = []) => {
  return [...characters].sort((a, b) => {
    const priorityA = ROLE_PRIORITY[a.role?.toLowerCase()] || 99;
    const priorityB = ROLE_PRIORITY[b.role?.toLowerCase()] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    const scenesA = Array.isArray(a.sceneIds) ? a.sceneIds.length : 0;
    const scenesB = Array.isArray(b.sceneIds) ? b.sceneIds.length : 0;
    if (scenesA !== scenesB) return scenesB - scenesA;
    return (a.name || '').localeCompare(b.name || '');
  });
};

const getCharactersForDocument = async (documentId, page, limit) => {
  if (page !== undefined && limit !== undefined) {
    const allCharacters = await characterRepository.find({ documentId });
    const sorted = sortCharactersByRole(allCharacters);
    const total = sorted.length;
    const skip = (page - 1) * limit;
    const paged = sorted.slice(skip, skip + limit);

    return {
      results: CharacterDto.toResponseList(paged),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const rawCharacters = await characterRepository.findByDocumentId(documentId);
  const sorted = sortCharactersByRole(rawCharacters);
  return { results: CharacterDto.toResponseList(sorted) };
};

const getCharacterById = async (characterId) => {
  const character = await characterRepository.findById(characterId);
  if (!character) throw new NotFoundError('Character not found.');
  return CharacterDto.toResponse(character);
};

const searchCharacters = async (documentId, query) => {
  const characters = await characterRepository.searchCharacters(documentId, query);
  const sorted = sortCharactersByRole(characters);
  return CharacterDto.toResponseList(sorted);
};

export { getCharactersForDocument, getCharacterById, searchCharacters, sortCharactersByRole };
