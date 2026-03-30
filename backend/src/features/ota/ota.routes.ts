import { Router } from 'express';
import { listFirmwares, uploadFirmware, deleteFirmware, checkForUpdate, downloadFirmware } from './ota.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, UploadFirmwareSchema } from '../../middleware/validation';

const router = Router();

router.get('/check/:deviceType', checkForUpdate);
router.get('/download/:id', downloadFirmware);
router.get('/firmwares', listFirmwares);
router.post('/upload', authMiddleware, validate(UploadFirmwareSchema), uploadFirmware);
router.delete('/firmwares/:id', authMiddleware, deleteFirmware);

export default router;
