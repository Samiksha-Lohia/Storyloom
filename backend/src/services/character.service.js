import characterRepository from '../repositories/character.repository.js';
import { NotFoundError } from '../utilities/custom-errors.js';
import { CharacterDto } from '../dtos/character.dto.js';

const getCharactersForDocument = async (documentId, page, limit) => {
  if (page !== undefined && limit !== undefined) {
    const skip = (page - 1) * limit;
    const total = await characterRepository.count({ documentId });
    const characters = await characterRepository.find(
      { documentId },
      null,
      { sort: { name: 1 }, skip, limit }
    );
    return {
      results: CharacterDto.toResponseList(characters),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const characters = await characterRepository.findByDocumentId(documentId);
  return { results: CharacterDto.toResponseList(characters) };
};

const getCharacterById = async (characterId) => {
  const character = await characterRepository.findById(characterId);
  if (!character) throw new NotFoundError('Character not found.');
  return CharacterDto.toResponse(character);
};

const searchCharacters = async (documentId, query) => {
  const characters = await characterRepository.searchCharacters(documentId, query);
  return CharacterDto.toResponseList(characters);
};

export { getCharactersForDocument, getCharacterById, searchCharacters };
