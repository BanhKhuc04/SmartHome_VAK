import { Router } from 'express';
import { getMe, login, logout, refreshToken, register } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { LoginSchema, RegisterSchema, validate } from '../../middleware/validation';

const router = Router();

router.post('/register', validate(RegisterSchema), register);
router.post('/login', validate(LoginSchema), login);
router.post('/logout', authMiddleware, logout);
router.post('/refresh', refreshToken);
router.get('/me', authMiddleware, getMe);

export default router;
