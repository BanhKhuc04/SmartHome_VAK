import { Router } from 'express';
import { getHealth, runDiagnostics, testTelegram } from './system.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/health', authMiddleware, getHealth);
router.post('/diagnostics', authMiddleware, runDiagnostics);
router.post('/test-telegram', authMiddleware, testTelegram);

export default router;
