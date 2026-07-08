import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { recommendAssignee, triggerSummary, checkDuplicate, draftResponse, classifyPost } from '../../controllers/intelligence.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limiting for AI endpoints to prevent budget drain
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 AI requests per windowMs
  message: { success: false, message: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);

// These routes are inherently read-heavy or trigger async side-effects, so they just need auth
router.get('/recommend-assignee/:departmentId', recommendAssignee);
router.post('/summary/:postId', aiRateLimiter, triggerSummary);
router.post('/duplicate-check', aiRateLimiter, checkDuplicate);
router.post('/draft-response/:postId', aiRateLimiter, draftResponse);
router.post('/classify', aiRateLimiter, classifyPost);

export default router;
