import { Router } from 'express';
import * as controller from './automation.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, controller.getAllRules);
router.post('/', authMiddleware, controller.upsertRule);
router.delete('/:id', authMiddleware, controller.deleteRule);

export default router;
