import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  getUserById,
  listUsers,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.get('/users', authenticate, listUsers);
router.get('/users/:id', authenticate, getUserById);

export default router;
