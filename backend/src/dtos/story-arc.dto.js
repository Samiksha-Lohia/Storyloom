const THREE_ACT_KEYFRAMES = [
  { x: 0.0, y: 10 },
  { x: 0.15, y: 25 },
  { x: 0.25, y: 50 },
  { x: 0.5, y: 45 },
  { x: 0.75, y: 70 },
  { x: 0.9, y: 95 },
  { x: 1.0, y: 15 },
];

const HEROS_JOURNEY_KEYFRAMES = [
  { x: 0.0, y: 10 },
  { x: 0.1, y: 20 },
  { x: 0.2, y: 30 },
  { x: 0.3, y: 45 },
  { x: 0.5, y: 60 },
  { x: 0.7, y: 75 },
  { x: 0.8, y: 65 },
  { x: 0.9, y: 90 },
  { x: 1.0, y: 15 },
];

const interpolate = (keyframes, x) => {
  if (keyframes.length === 0) return 0;
  if (x <= keyframes[0].x) return keyframes[0].y;
  if (x >= keyframes[keyframes.length - 1].x) return keyframes[keyframes.length - 1].y;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (x >= k1.x && x <= k2.x) {
      const ratio = (x - k1.x) / (k2.x - k1.x);
      return Math.round(k1.y + ratio * (k2.y - k1.y));
    }
  }
  return 0;
};

export class StoryArcDto {
  constructor(arc) {
    this.id = arc._id || arc.id;
    this.documentId = arc.documentId;
    this.climaxSceneId = arc.climaxSceneId || null;
    this.arcPoints = arc.arcPoints || [];
    this.createdAt = arc.createdAt;
    this.updatedAt = arc.updatedAt;

    const N = this.arcPoints.length;
    const threeAct = [];
    const herosJourney = [];

    for (let i = 0; i < N; i++) {
      const x = N > 1 ? i / (N - 1) : 0;
      threeAct.push(interpolate(THREE_ACT_KEYFRAMES, x));
      herosJourney.push(interpolate(HEROS_JOURNEY_KEYFRAMES, x));
    }

    this.overlay = {
      threeAct,
      herosJourney,
    };
  }

  static toResponse(arc) {
    if (!arc) return null;
    return new StoryArcDto(arc);
  }

  static toResponseList(arcs) {
    if (!Array.isArray(arcs)) return [];
    return arcs.map(arc => new StoryArcDto(arc));
  }
}
