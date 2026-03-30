import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============ Validation Schemas ============

export const CreateDeviceSchema = z.object({
    id: z.string().min(1, 'ID is required').max(50).regex(/^[a-zA-Z0-9_-]+$/, 'ID must be alphanumeric'),
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['esp8266', 'esp32']).default('esp8266'),
    location: z.string().max(200).optional().default(''),
    relays: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        pin: z.number().int().min(0).max(40).optional().default(0),
    })).optional(),
    sensors: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.string().min(1),
        unit: z.string().optional().default(''),
    })).optional(),
});

export const UpdateDeviceSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(200).optional(),
    type: z.enum(['esp8266', 'esp32']).optional(),
});

export const RelayCommandSchema = z.object({
    relayId: z.string().min(1, 'relayId is required'),
    state: z.boolean(),
});

export const RegisterSchema = z.object({
    username: z.string().min(3, 'Username must be 3+ chars').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric only'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be 6+ chars').max(100),
});

export const LoginSchema = z.object({
    username: z.string().min(1, 'Username required'),
    password: z.string().min(1, 'Password required'),
});

export const CreateScheduleSchema = z.object({
    name: z.string().min(1, 'Name required').max(100),
    deviceId: z.string().min(1),
    relayId: z.string().min(1),
    action: z.enum(['on', 'off', 'toggle']).default('on'),
    cronExpression: z.string().min(1, 'Cron expression required'),
});

export const CreateAlertRuleSchema = z.object({
    name: z.string().min(1).max(100),
    deviceId: z.string().min(1),
    sensorId: z.string().min(1),
    condition: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']).default('gt'),
    threshold: z.number(),
    channel: z.enum(['telegram', 'email', 'webhook']).default('telegram'),
    cooldownMinutes: z.number().int().min(1).max(1440).optional().default(5),
});

export const UploadFirmwareSchema = z.object({
    version: z.string().min(1, 'Version required').regex(/^\d+\.\d+\.\d+$/, 'Format: X.Y.Z'),
    deviceType: z.enum(['esp8266', 'esp32']).optional().default('esp8266'),
    description: z.string().max(500).optional().default(''),
});

// ============ Validation Middleware Factory ============

export function validate(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        req.body = result.data; // Replace with validated & typed data
        next();
    };
}
