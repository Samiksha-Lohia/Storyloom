import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware.js';
import { requireDocumentOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  documentIdParamSchema,
  continuityIssueIdParamSchema,
  updateContinuityStatusSchema,
} from '../validators/document.validator.js';
import * as relationshipService from '../services/relationship.service.js';
import * as timelineService from '../services/timeline.service.js';
import * as dialogueService from '../services/dialogue.service.js';
import * as moodService from '../services/mood.service.js';
import * as storyArcService from '../services/storyArc.service.js';
import * as continuityService from '../services/continuity.service.js';
import { sendSuccess } from '../utilities/response.js';

import { RelationshipDto } from '../dtos/relationship.dto.js';
import { TimelineEventDto } from '../dtos/timeline-event.dto.js';
import { DialogueSummaryDto } from '../dtos/dialogue-summary.dto.js';
import { MoodAnalysisDto } from '../dtos/mood-analysis.dto.js';
import { StoryArcDto } from '../dtos/story-arc.dto.js';
import { ContinuityIssueDto } from '../dtos/continuity-issue.dto.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validate(documentIdParamSchema), requireDocumentOwnership);

router.get('/relationships', async (req, res, next) => {
  try {
    const relationships = await relationshipService.getRelationshipsForDocument(req.params.documentId);
    sendSuccess(res, RelationshipDto.toResponseList(relationships), 200, 'Relationships retrieved.');
  } catch (err) {
    next(err);
  }
});

router.get('/timeline', async (req, res, next) => {
  try {
    const timeline = await timelineService.getTimelineForDocument(req.params.documentId);
    sendSuccess(res, TimelineEventDto.toResponseList(timeline), 200, 'Timeline retrieved.');
  } catch (err) {
    next(err);
  }
});

router.get('/dialogue', async (req, res, next) => {
  try {
    const dialogue = req.query.characterId
      ? await dialogueService.getDialogueForCharacter(req.params.documentId, req.query.characterId)
      : await dialogueService.getDialogueForDocument(req.params.documentId);
    sendSuccess(res, DialogueSummaryDto.toResponseList(dialogue), 200, 'Dialogue summaries retrieved.');
  } catch (err) {
    next(err);
  }
});

router.get('/mood', async (req, res, next) => {
  try {
    const mood = await moodService.getMoodAnalysisForDocument(req.params.documentId);
    sendSuccess(res, MoodAnalysisDto.toResponseList(mood), 200, 'Mood analysis retrieved.');
  } catch (err) {
    next(err);
  }
});

router.get('/arc', async (req, res, next) => {
  try {
    const arc = await storyArcService.getStoryArcForDocument(req.params.documentId);
    sendSuccess(res, StoryArcDto.toResponse(arc), 200, 'Story arc retrieved.');
  } catch (err) {
    next(err);
  }
});

router.get('/continuity', async (req, res, next) => {
  try {
    const issues = await continuityService.getContinuityIssuesForDocument(req.params.documentId);
    sendSuccess(res, ContinuityIssueDto.toResponseList(issues), 200, 'Continuity issues retrieved.');
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/continuity/:id/status',
  validate(continuityIssueIdParamSchema),
  validate(updateContinuityStatusSchema),
  async (req, res, next) => {
    try {
      const updated = await continuityService.updateIssueStatus(
        req.params.id,
        req.params.documentId,
        req.body.status,
      );
      sendSuccess(res, ContinuityIssueDto.toResponse(updated), 200, 'Continuity issue status updated.');
    } catch (err) {
      next(err);
    }
  },
);

export default router;
