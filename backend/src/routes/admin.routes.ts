import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getLoopHealth } from '../controllers/post.controller';

// Handbook C4 · Admin surfaces. Auth is via `authenticate` + per-controller
// ADMIN/FOUNDER checks (see getLoopHealth).
const router = Router();

router.get('/loop-health', authenticate, getLoopHealth);

export default router;
