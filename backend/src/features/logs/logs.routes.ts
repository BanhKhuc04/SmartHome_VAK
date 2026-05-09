import { Router } from 'express';
import { getLogs } from './logs.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getLogs);

export default router;
