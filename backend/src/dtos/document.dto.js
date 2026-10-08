export class DocumentDto {
  constructor(doc) {
    this.id = doc._id || doc.id;
    this.userId = doc.userId;
    this.title = doc.title;
    this.originalFilename = doc.originalFilename;
    this.fileType = doc.fileType;
    this.status = doc.status;
    this.wordCount = doc.wordCount || 0;
    this.totalScenes = doc.totalScenes || 0;
    this.uploadedAt = doc.uploadedAt;

    if (doc.storageUrl && !doc.storageUrl.startsWith('http')) {
      this.storageUrl = `/api/documents/${this.id}/download`;
    } else {
      this.storageUrl = doc.storageUrl || '';
    }
  }

  static toResponse(doc) {
    if (!doc) return null;
    return new DocumentDto(doc);
  }

  static toResponseList(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(doc => new DocumentDto(doc));
  }
}
