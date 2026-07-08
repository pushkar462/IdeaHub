import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { searchSemantic, searchSimilarToPost } from '../controllers/search.controller';

// Handbook Phase 2 · P4 semantic-search surfaces.
const router = Router();

router.get('/semantic',         authenticate, searchSemantic);
router.get('/posts/:id/similar', authenticate, searchSimilarToPost);

export default router;
