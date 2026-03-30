import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { initializeDatabase, closeDatabase } from './services/database.service';
import { mqttService } from './services/mqtt.service';
import { wsService } from './services/websocket.service';
import { errorHandler, requestLogger, notFoundHandler } from './middleware';
import { checkAlertRules } from './features/notifications/notification.service';
import { initScheduler } from './features/schedules/scheduler.service';
import { updateDeviceStatusDB, updateSensorDataDB, updateRelayStateDB } from './features/devices/devices.controller';
import { recordSensorDataDB } from './features/sensors/sensors.controller';
import { energyService } from './services/energy.service';
import { mqttBridgeService } from './services/mqtt-bridge.service';
import { deviceService } from './services/device.service';
import { automationService } from './services/automation.service';

// Route imports
import authRoutes from './features/auth/auth.routes';
import deviceRoutes from './features/devices/devices.routes';
import sensorRoutes from './features/sensors/sensors.routes';
import scheduleRoutes from './features/schedules/schedules.routes';
import notificationRoutes from './features/notifications/notifications.routes';
import otaRoutes from './features/ota/ota.routes';
import automationRoutes from './features/automation/automation.routes';
import aiRoutes from './features/ai/ai.routes';
import sceneRoutes from './features/scenes/scenes.routes';

// ============================================
// Initialize Database
// ============================================
initializeDatabase();

// ============================================
// Express App Setup
// ============================================
const app = express();
const server = createServer(app);

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA
app.use(cors({
    origin: (origin, callback) => {
        // Allow all localhost origins in development
        if (!config.isProduction && (!origin || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            callback(null, true);
        } else {
            callback(null, config.cors.origin);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Rate limiting for auth endpoints
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    message: { success: false, error: 'Too many attempts, try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ota', otaRoutes);
app.use('/api/rules', automationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scenes', sceneRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'healthy',
        mqtt: mqttService.getConnectionStatus(),
        wsClients: wsService.getClientCount(),
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use('/api/*', notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// WebSocket Setup
// ============================================
wsService.initialize(server);

// ============================================
// Initialize Modular Services
// ============================================
mqttBridgeService.init();
energyService.init(mqttBridgeService);
deviceService.init();
automationService.start();

// ============================================
// Legacy Initializations (Scheduled for Refactor)
// ============================================
initScheduler();

// ============================================
// System Metrics Heartbeat
// ============================================
import os from 'os';

setInterval(() => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
    
    // Simple CPU Load (Load avg for last min)
    const cpus = os.cpus();
    const cpuLoad = Math.round(os.loadavg()[0] * 100 / cpus.length);
    
    wsService.broadcast('system_metrics', {
        cpu: Math.min(cpuLoad, 100),
        ram: memUsage,
        uptime: Math.round(os.uptime()),
        temp: 42, // Dummy CPU temp as Node.js can't get it easily without native deps
    });
}, 5000);

// ============================================
// Start Server
// ============================================
server.listen(config.port, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║       Home Smart IoT Backend Server          ║
  ╠══════════════════════════════════════════════╣
  ║  REST API:    http://localhost:${config.port}          ║
  ║  WebSocket:   ws://localhost:${config.port}${config.ws.path}        ║
  ║  Environment: ${config.nodeEnv.padEnd(30)}║
  ║                                              ║
  ║  Features:                                   ║
  ║  ✓ Authentication (JWT)                      ║
  ║  ✓ Device Management (CRUD)                  ║
  ║  ✓ Sensor Data (SQLite)                      ║
  ║  ✓ Scheduling (Cron)                         ║
  ║  ✓ Notifications (Telegram)                  ║
  ║  ✓ OTA Updates                               ║
  ╚══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down...');
    automationService.stop();
    mqttService.disconnect();
    closeDatabase();
    server.close(() => {
        console.log('[Server] Closed');
        process.exit(0);
    });
});
