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
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validations/v1/auth.validation';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.get('/users', authenticate, listUsers);
router.get('/users/:id', authenticate, getUserById);

export default router;
