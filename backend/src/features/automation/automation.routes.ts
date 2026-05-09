import { Router } from 'express';
import { deleteAutomation, getAutomations, upsertAutomation } from './automation.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { UpsertAutomationSchema, validate } from '../../middleware/validation';

const router = Router();

router.get('/', authMiddleware, getAutomations);
router.post('/', authMiddleware, validate(UpsertAutomationSchema), upsertAutomation);
router.patch('/:id', authMiddleware, validate(UpsertAutomationSchema), upsertAutomation);
router.delete('/:id', authMiddleware, deleteAutomation);

export default router;
