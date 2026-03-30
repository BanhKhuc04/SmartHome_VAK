import { Router } from 'express';
import { getAllSchedules, createSchedule, updateSchedule, deleteSchedule } from './schedules.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, CreateScheduleSchema } from '../../middleware/validation';

const router = Router();

router.get('/', getAllSchedules);
router.post('/', authMiddleware, validate(CreateScheduleSchema), createSchedule);
router.put('/:id', authMiddleware, updateSchedule);
router.delete('/:id', authMiddleware, deleteSchedule);

export default router;
