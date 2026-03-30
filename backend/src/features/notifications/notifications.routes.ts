import { Router } from 'express';
import { 
  getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, 
  getNotificationSettings, getNotifications, markAsRead, deleteNotification, clearAllNotifications 
} from './notifications.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate, CreateAlertRuleSchema } from '../../middleware/validation';

const router = Router();

// Settings & Rules
router.get('/settings', getNotificationSettings);
router.get('/rules', getAlertRules);
router.post('/rules', authMiddleware, validate(CreateAlertRuleSchema), createAlertRule);
router.put('/rules/:id', authMiddleware, updateAlertRule);
router.delete('/rules/:id', authMiddleware, deleteAlertRule);

// Notifications Log
router.get('/', authMiddleware, getNotifications);
router.patch('/:id/read', authMiddleware, markAsRead);
router.delete('/:id', authMiddleware, deleteNotification);
router.delete('/', authMiddleware, clearAllNotifications);

export default router;
