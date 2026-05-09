import { Router } from 'express';
import { getHealth, runDiagnostics } from './system.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/health', authMiddleware, getHealth);
router.post('/diagnostics', authMiddleware, runDiagnostics);

export default router;
