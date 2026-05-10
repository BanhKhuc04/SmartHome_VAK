import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as discoveryController from './discovery.controller';

const router = Router();

router.get('/', authMiddleware, discoveryController.getDiscoveredModules);
router.post('/:deviceId/approve', authMiddleware, discoveryController.approveDiscoveredModule);
router.post('/:deviceId/ignore', authMiddleware, discoveryController.ignoreDiscoveredModule);
router.post('/:deviceId/reset', authMiddleware, discoveryController.resetDiscoveredModule);
router.delete('/:deviceId', authMiddleware, discoveryController.deleteDiscoveredModule);

export default router;
