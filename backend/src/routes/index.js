import { Router } from 'express';

import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import bookRoutes from './book.routes.js';
import uploadRoutes from './upload.routes.js';
import documentRoutes from './document.routes.js';
import sceneRoutes from './scene.routes.js';
import analysisRoutes from './analysis.routes.js';
import characterRoutes from './character.routes.js';
import storyRoutes from './story.routes.js';
import searchRoutes from './search.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import writerRoutes from './writer.routes.js';
import directReviewRoutes from './direct-review.routes.js';
import publishRequestRoutes from './publish-request.routes.js';
import conversationRoutes from './conversation.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/books', bookRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/writer', writerRoutes);
router.use('/writers', writerRoutes);
router.use('/reviews', directReviewRoutes);
router.use('/publish-requests', publishRequestRoutes);
router.use('/conversations', conversationRoutes);

router.use('/documents', documentRoutes);
router.use('/documents/:documentId/scenes', sceneRoutes);
router.use('/documents/:documentId/jobs', analysisRoutes);
router.use('/documents/:documentId/characters', characterRoutes);
router.use('/documents/:documentId/story', storyRoutes);
router.use('/documents/:documentId/search', searchRoutes);

export default router;

