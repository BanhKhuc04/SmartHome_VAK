import { Router } from 'express';
import {
    createDevice,
    deleteDevice,
    getAllDevices,
    getDeviceById,
    sendDeviceCommand,
    updateDevice,
} from './devices.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { CreateDeviceSchema, DeviceCommandSchema, UpdateDeviceSchema, validate } from '../../middleware/validation';

const router = Router();

router.get('/', authMiddleware, getAllDevices);
router.post('/', authMiddleware, validate(CreateDeviceSchema), createDevice);
router.get('/:id', authMiddleware, getDeviceById);
router.patch('/:id', authMiddleware, validate(UpdateDeviceSchema), updateDevice);
router.delete('/:id', authMiddleware, deleteDevice);
router.post('/:id/command', authMiddleware, validate(DeviceCommandSchema), sendDeviceCommand);

export default router;
