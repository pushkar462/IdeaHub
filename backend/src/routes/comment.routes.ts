import { Router } from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  reactToComment,
  getCommentReplies,
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCommentSchema, updateCommentSchema } from '../validations/v1/comment.validation';
import { reactToPostSchema as reactToCommentSchema } from '../validations/v1/post.validation';
import { getRepliesSchema } from '../validations/v1/feed.validation';

const router = Router();

router.post('/', authenticate, validate(createCommentSchema), createComment);
router.patch('/:id', authenticate, validate(updateCommentSchema), updateComment);
router.delete('/:id', authenticate, deleteComment);
router.post('/:id/react', authenticate, validate(reactToCommentSchema), reactToComment);
router.get('/:id/replies', authenticate, validate(getRepliesSchema), getCommentReplies);

export default router;
