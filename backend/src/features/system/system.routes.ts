import { Router } from 'express';
import { getHealth } from './system.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/health', authMiddleware, getHealth);

export default router;
