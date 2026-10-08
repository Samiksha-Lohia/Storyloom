import BaseRepository from './base.repository.js';
import Relationship from '../models/relationship.model.js';

class RelationshipRepository extends BaseRepository {
  constructor() {
    super(Relationship);
  }

  async findByDocumentId(documentId, options = {}) {
    return this.find({ documentId }, null, options);
  }

  async findPairRelationship(documentId, charAId, charBId, options = {}) {
    return this.findOne({
      documentId,
      $or: [
        { characterAId: charAId, characterBId: charBId },
        { characterAId: charBId, characterBId: charAId }
      ]
    }, null, options);
  }
}

const relationshipRepositoryInstance = new RelationshipRepository();
export default relationshipRepositoryInstance;
export { RelationshipRepository };
