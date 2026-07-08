import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  closeCampaign,
  pickWinner,
} from '../controllers/campaign.controller';

// Handbook B8 · time-boxed themed prompts. Read endpoints are for any
// authenticated user; write endpoints self-guard via requireAdmin.
const router = Router();

router.get('/',    authenticate, listCampaigns);
router.get('/:id', authenticate, getCampaign);
router.post('/',   authenticate, createCampaign);
router.patch('/:id/close',   authenticate, closeCampaign);
router.patch('/:id/winner',  authenticate, pickWinner);

export default router;
