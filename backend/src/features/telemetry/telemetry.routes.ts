import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import * as telemetryController from './telemetry.controller';

const router = Router();

router.get('/latest', authMiddleware, telemetryController.getAllLatestTelemetry);
router.get('/sensors', authMiddleware, telemetryController.getSensorSummaries);
router.get('/:deviceId/latest', authMiddleware, telemetryController.getLatestTelemetry);
router.get('/:deviceId/history', authMiddleware, telemetryController.getTelemetryHistory);

export default router;
