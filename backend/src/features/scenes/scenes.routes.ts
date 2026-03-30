import { Router } from 'express';
import * as controller from './scenes.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, controller.getAllScenes);
router.post('/', authMiddleware, controller.createScene);
router.post('/:id/activate', authMiddleware, controller.activateScene);

export default router;
