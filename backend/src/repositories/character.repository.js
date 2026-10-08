import BaseRepository from './base.repository.js';
import Character from '../models/character.model.js';

class CharacterRepository extends BaseRepository {
  constructor() {
    super(Character);
  }

  async findByDocumentId(documentId, options = {}) {
    return this.find({ documentId }, null, { sort: { name: 1 }, ...options });
  }

  async findByNameOrAlias(documentId, nameQuery, options = {}) {
    return this.findOne({
      documentId,
      $or: [
        { name: new RegExp(`^${nameQuery}$`, 'i') },
        { aliases: { $in: [new RegExp(`^${nameQuery}$`, 'i')] } }
      ]
    }, null, options);
  }

  async searchCharacters(documentId, searchQuery, options = {}) {
    return this.find({
      documentId,
      $text: { $search: searchQuery }
    }, null, options);
  }
}

const characterRepositoryInstance = new CharacterRepository();
export default characterRepositoryInstance;
export { CharacterRepository };
