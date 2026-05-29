import { Router } from 'express';
import { getArchive, archivePost } from '../controllers/archive.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getArchive);
router.patch('/:id/archive', authenticate, archivePost);

export default router;
