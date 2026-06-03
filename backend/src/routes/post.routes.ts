import { Router } from 'express';
import {
  createPost,
  getFeed,
  getPost,
  updateStatus,
  reactToPost,
  deletePost,
  getPostComments,
  getStats,
} from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadRaw, validateMagicBytes } from '../middleware/upload.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPostSchema, updatePostStatusSchema, reactToPostSchema } from '../validations/v1/post.validation';
import { getFeedSchema, getCommentsSchema } from '../validations/v1/feed.validation';

const router = Router();

router.get('/', authenticate, validate(getFeedSchema), getFeed);
router.get('/stats', authenticate, getStats);
router.post('/', authenticate, uploadLimiter, uploadRaw.single('attachment'), validateMagicBytes, validate(createPostSchema), createPost);
router.get('/:id', authenticate, getPost);
router.get('/:id/comments', authenticate, validate(getCommentsSchema), getPostComments);
router.patch('/:id/status', authenticate, validate(updatePostStatusSchema), updateStatus);
router.post('/:id/react', authenticate, validate(reactToPostSchema), reactToPost);
router.delete('/:id', authenticate, deletePost);

export default router;
