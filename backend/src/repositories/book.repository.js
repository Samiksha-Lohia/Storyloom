import BaseRepository from './base.repository.js';
import Book from '../models/book.model.js';

class BookRepository extends BaseRepository {
  constructor() {
    super(Book);
  }

  async findByDocumentId(documentId, projection = null, options = {}) {
    return this.findOne({ documentId }, projection, options);
  }

  async findByWriterId(writerId, options = {}) {
    return this.find({ writerId }, null, options);
  }
}

const bookRepository = new BookRepository();
export default bookRepository;
export { BookRepository };
