import { Router } from 'express';
import { getAllDevicesDB, getDeviceByIdDB, createDevice, updateDevice, deleteDevice, toggleRelayDB } from './devices.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, CreateDeviceSchema, UpdateDeviceSchema, RelayCommandSchema } from '../../middleware/validation';

const router = Router();

router.get('/', getAllDevicesDB);
router.get('/:id', getDeviceByIdDB);
router.post('/', authMiddleware, validate(CreateDeviceSchema), createDevice);
router.put('/:id', authMiddleware, validate(UpdateDeviceSchema), updateDevice);
router.delete('/:id', authMiddleware, deleteDevice);
router.post('/:id/relay', validate(RelayCommandSchema), toggleRelayDB);

export default router;
