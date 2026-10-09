export class SceneDto {
  constructor(scene) {
    this.id = scene._id || scene.id;
    this.documentId = scene.documentId;
    this.sceneNumber = scene.sceneNumber;
    this.title = scene.title;
    this.summary = scene.summary;
    this.location = scene.location || '';
    this.characterIds = scene.characterIds || [];
    this.textRange = scene.textRange || { start: 0, end: 0 };
    this.wordCount = scene.wordCount || 0;
    this.rawText = scene.rawText || '';
    this.createdAt = scene.createdAt;
    this.updatedAt = scene.updatedAt;
  }

  static toResponse(scene) {
    if (!scene) return null;
    return new SceneDto(scene);
  }

  static toResponseList(scenes) {
    if (!Array.isArray(scenes)) return [];
    return scenes.map(scene => new SceneDto(scene));
  }
}
