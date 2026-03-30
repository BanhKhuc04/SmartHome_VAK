import { Router } from 'express';
import * as controller from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.post('/chat', authMiddleware, controller.handleAIChat);

export default router;
