import { Router } from 'express';
import { getWeeklyDigest } from '../controllers/digest.controller';

// Handbook C4 / Section 6 · n8n-consumable digest endpoint.
// Header-authenticated via X-Digest-Token — NOT wrapped in the JWT
// authenticate middleware, because n8n has no user session.
const router = Router();

router.get('/weekly', getWeeklyDigest);

export default router;
