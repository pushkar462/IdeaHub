import { Router } from 'express';
import {
  createPost,
  getFeed,
  getPost,
  updateStatus,
  reactToPost,
  deletePost,
} from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', authenticate, getFeed);
router.post('/', authenticate, upload.single('attachment'), createPost);
router.get('/:id', authenticate, getPost);
router.patch('/:id/status', authenticate, updateStatus);
router.post('/:id/react', authenticate, reactToPost);
router.delete('/:id', authenticate, deletePost);

export default router;
