import { Router } from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  reactToComment,
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createComment);
router.patch('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);
router.post('/:id/react', authenticate, reactToComment);

export default router;
