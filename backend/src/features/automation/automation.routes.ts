import { Router } from 'express';
import { 
    deleteAutomation, 
    getAutomations, 
    upsertAutomation, 
    getAutomationById, 
    toggleAutomation, 
    runAutomation, 
    getAutomationRuns 
} from './automation.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { UpsertAutomationSchema, validate } from '../../middleware/validation';

const router = Router();

router.get('/runs', authMiddleware, getAutomationRuns);
router.get('/', authMiddleware, getAutomations);
router.get('/:id', authMiddleware, getAutomationById);
router.post('/', authMiddleware, validate(UpsertAutomationSchema), upsertAutomation);
router.put('/:id', authMiddleware, validate(UpsertAutomationSchema), upsertAutomation);
router.delete('/:id', authMiddleware, deleteAutomation);

router.post('/:id/:action(enable|disable)', authMiddleware, toggleAutomation);
router.post('/:id/run', authMiddleware, runAutomation);
router.post('/:id/test', authMiddleware, runAutomation); // Alias for now

export default router;
