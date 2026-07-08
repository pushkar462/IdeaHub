import { Router } from 'express';
import {
  createPost,
  getFeed,
  getPost,
  updatePost,
  updateStatus,
  reactToPost,
  votePost,
  deletePost,
  getPostComments,
  getStats,
  getSlaHealth,
} from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadRaw, validateMagicBytes } from '../middleware/upload.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPostSchema, updatePostSchema, updatePostStatusSchema, reactToPostSchema } from '../validations/v1/post.validation';
import { getFeedSchema, getCommentsSchema } from '../validations/v1/feed.validation';

const router = Router();

router.get('/', authenticate, validate(getFeedSchema), getFeed);
router.get('/stats', authenticate, getStats);
router.get('/sla-health', authenticate, getSlaHealth);
router.post('/', authenticate, uploadLimiter, uploadRaw.single('attachment'), validateMagicBytes, validate(createPostSchema), createPost);
router.get('/:id', authenticate, getPost);
router.get('/:id/comments', authenticate, validate(getCommentsSchema), getPostComments);
router.patch('/:id/status', authenticate, validate(updatePostStatusSchema), updateStatus);
router.patch('/:id', authenticate, uploadLimiter, uploadRaw.single('attachment'), validateMagicBytes, validate(updatePostSchema), updatePost);
router.post('/:id/react', authenticate, validate(reactToPostSchema), reactToPost);
router.post('/:id/vote',  authenticate, votePost);
router.delete('/:id', authenticate, deletePost);

export default router;
