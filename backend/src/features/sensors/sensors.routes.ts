import { Router } from 'express';
import { getSensorDataDB } from './sensors.controller';

const router = Router();

router.get('/:deviceId/data', getSensorDataDB);

export default router;
