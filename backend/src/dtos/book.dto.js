export class BookDto {
  constructor(book) {
    this.id = (book._id || book.id).toString();
    this.writerId = book.writerId ? (book.writerId._id || book.writerId).toString() : null;
    if (book.writerId && typeof book.writerId === 'object' && book.writerId.name) {
      this.author = {
        id: (book.writerId._id || book.writerId.id).toString(),
        name: book.writerId.name,
        username: book.writerId.username,
        avatarUrl: book.writerId.avatarUrl || null,
      };
    }
    this.documentId = book.documentId ? (book.documentId._id || book.documentId).toString() : null;
    this.title = book.title;
    this.blurb = book.blurb || '';
    this.coverPublicId = book.coverPublicId || null;
    this.coverUrl = book.coverUrl || null;
    this.genre = book.genre || 'General';
    this.tags = Array.isArray(book.tags) ? book.tags : [];
    this.language = book.language || 'en';
    this.mature = Boolean(book.mature);
    this.status = book.status;
    this.template = book.template || 'classic';
    this.accent = book.accent;
    this.pageCount = book.pageCount || 0;
    this.pageOffsets = Array.isArray(book.pageOffsets) ? book.pageOffsets : [];
    this.pitchCard = book.pitchCard || null;
    this.stats = {
      reads: book.stats?.reads || 0,
      ratingAvg: book.stats?.ratingAvg || 0,
      ratingCount: book.stats?.ratingCount || 0,
      completionRate: book.stats?.completionRate || 0,
      readingListAdds: book.stats?.readingListAdds || 0,
    };
    this.acceptedTermsAt = book.acceptedTermsAt || null;
    this.termsVersion = book.termsVersion || null;
    this.createdAt = book.createdAt;
    this.updatedAt = book.updatedAt;
  }

  static toResponse(book) {
    if (!book) return null;
    return new BookDto(book);
  }

  static toResponseList(books) {
    if (!Array.isArray(books)) return [];
    return books.map((book) => new BookDto(book));
  }
}
