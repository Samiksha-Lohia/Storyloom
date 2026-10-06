import { Router } from 'express';
import { authenticateOptional } from '../middleware/auth.middleware.js';
import { resolveBook } from '../middleware/resolveBook.js';
import { requireMatureAck } from '../middleware/mature-gate.middleware.js';
import AnalysisController from '../controllers/analysis.controller.js';

export const PUBLIC_ROUTES = [
  'GET /scenes',
  'GET /characters',
  'GET /characters/:characterId',
  'GET /relationships',
  'GET /timeline',
  'GET /mood',
  'GET /arc',
  'GET /continuity',
  'GET /pitch',
  'GET /search',
  'GET /pipeline-status',
  'POST /ask',
  'POST /process',
];

const router = Router({ mergeParams: true });

// Middleware stack for all book analysis routes
router.use(authenticateOptional);
router.use(resolveBook);
router.use(requireMatureAck);

// Feature analysis endpoints
router.post('/process', AnalysisController.triggerProcessing);
router.get('/pipeline-status', AnalysisController.getPipelineStatus);
router.get('/scenes', AnalysisController.getScenes);
router.get('/characters', AnalysisController.getCharacters);
router.get('/characters/:characterId', AnalysisController.getCharacterById);
router.get('/relationships', AnalysisController.getRelationships);
router.get('/timeline', AnalysisController.getTimeline);
router.get('/mood', AnalysisController.getMood);
router.get('/arc', AnalysisController.getArc);
router.get('/continuity', AnalysisController.getContinuity);
router.get('/pitch', AnalysisController.getPitch);
router.get('/search', AnalysisController.search);
router.post('/ask', AnalysisController.ask);

export default router;

