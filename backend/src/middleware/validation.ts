import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const metadataSchema = z.record(z.string(), z.unknown()).optional().default({});

export const LoginSchema = z.object({
    username: z.string().min(1, 'Username required'),
    password: z.string().min(1, 'Password required'),
});

export const RegisterSchema = z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(100),
});

export const CreateDeviceSchema = z.object({
    device_id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'device_id must be alphanumeric'),
    name: z.string().min(1).max(120),
    type: z.string().min(1).max(80),
    location: z.string().max(120).optional().default(''),
    ip_address: z.string().max(120).nullable().optional().default(null),
    firmware_version: z.string().max(80).nullable().optional().default(null),
    cmd_topic: z.string().min(1).max(255).optional(),
    state_topic: z.string().min(1).max(255).optional(),
    status_topic: z.string().min(1).max(255).optional(),
    telemetry_topic: z.string().min(1).max(255).optional(),
    metadata_json: metadataSchema,
});

export const UpdateDeviceSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    type: z.string().min(1).max(80).optional(),
    location: z.string().max(120).optional(),
    status: z.enum(['online', 'offline', 'unknown']).optional(),
    ip_address: z.string().max(120).nullable().optional(),
    firmware_version: z.string().max(80).nullable().optional(),
    cmd_topic: z.string().min(1).max(255).optional(),
    state_topic: z.string().min(1).max(255).optional(),
    status_topic: z.string().min(1).max(255).optional(),
    telemetry_topic: z.string().min(1).max(255).optional(),
    metadata_json: metadataSchema.optional(),
});

export const DeviceCommandSchema = z.object({
    command: z.enum(['pulse', 'on', 'off']),
});

export const UpsertAutomationSchema = z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(120),
    device_id: z.string().min(1).max(100),
    command: z.enum(['pulse', 'on', 'off']),
    schedule: z.string().min(1).max(100),
    enabled: z.boolean().optional().default(true),
    description: z.string().max(255).optional().default(''),
});

export function validate(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const parsed = schema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
                timestamp: new Date().toISOString(),
            });
            return;
        }

        req.body = parsed.data;
        next();
    };
}
