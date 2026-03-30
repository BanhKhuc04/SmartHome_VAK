import { Router } from 'express';
import { register, login, logout, refreshToken, getMe } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, RegisterSchema, LoginSchema } from '../../middleware/validation';

const router = Router();

router.post('/register', validate(RegisterSchema), register);
router.post('/login', validate(LoginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.get('/me', authMiddleware, getMe);

export default router;
