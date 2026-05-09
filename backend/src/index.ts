import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import { initializeDatabase, closeDatabase } from './services/database.service';
import { mqttService } from './services/mqtt.service';
import { wsService } from './services/websocket.service';
import { deviceSyncService } from './services/device-sync.service';
import { automationService } from './services/automation.service';
import { getSystemHealth } from './services/system.service';

import authRoutes from './features/auth/auth.routes';
import deviceRoutes from './features/devices/devices.routes';
import logRoutes from './features/logs/logs.routes';
import systemRoutes from './features/system/system.routes';
import automationRoutes from './features/automation/automation.routes';

initializeDatabase();

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/automations', automationRoutes);

app.get('/api/health', authMiddleware, (_req, res) => {
    res.json({
        success: true,
        data: getSystemHealth(),
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/*', notFoundHandler);
app.use(errorHandler);

wsService.initialize(server);
mqttService.connect();
deviceSyncService.start();
automationService.start();

setInterval(() => {
    wsService.broadcast('system_health', getSystemHealth());
}, 10000);

server.listen(config.port, () => {
    console.log(`${config.app.name} backend listening on http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
    automationService.stop();
    mqttService.disconnect();
    closeDatabase();
    server.close(() => process.exit(0));
});
