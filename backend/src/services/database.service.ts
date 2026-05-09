import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config';

let db: Database.Database;

function ensureDbDirectory(): void {
    const directory = path.dirname(config.db.path);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

export function getDatabase(): Database.Database {
    if (!db) {
        ensureDbDirectory();
        db = new Database(config.db.path);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        console.log(`[DB] Connected to ${config.db.path}`);
    }

    return db;
}

export function initializeDatabase(): void {
    const database = getDatabase();

    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'operator')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            location TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'unknown')),
            ip_address TEXT,
            firmware_version TEXT,
            cmd_topic TEXT NOT NULL,
            state_topic TEXT NOT NULL,
            status_topic TEXT NOT NULL,
            telemetry_topic TEXT NOT NULL,
            last_seen DATETIME,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS device_states (
            device_id TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
            state_value TEXT,
            payload_json TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS device_telemetry (
            device_id TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
            payload_json TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            action TEXT NOT NULL,
            message TEXT NOT NULL,
            device_id TEXT REFERENCES devices(device_id) ON DELETE SET NULL,
            actor TEXT,
            payload_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS automations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
            command TEXT NOT NULL CHECK(command IN ('pulse', 'on', 'off')),
            schedule TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            description TEXT NOT NULL DEFAULT '',
            last_run DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
        CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id ON audit_logs(device_id);
        CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(enabled);
    `);

    seedDefaultAdmin(database);
    ensureDefaultModuleSeed(database);
}

function seedDefaultAdmin(database: Database.Database): void {
    const existing = database.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number } | undefined;
    if (existing) return;

    const passwordHash = bcrypt.hashSync('admin123', 10);
    database.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `).run('admin', 'admin@homecore.local', passwordHash, 'admin');
}

export function ensureDefaultModuleSeed(database: Database.Database = getDatabase()): void {
    database.prepare(`
        INSERT INTO devices (
            device_id, name, type, location, status, cmd_topic, state_topic, status_topic, telemetry_topic, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO NOTHING
    `).run(
        'pc_relay_01',
        'PC Server Power Relay',
        'pc-control',
        'Rack Shelf A',
        'offline',
        'homelab/device/pc_relay_01/cmd',
        'homelab/device/pc_relay_01/state',
        'homelab/device/pc_relay_01/status',
        'homelab/device/pc_relay_01/telemetry',
        JSON.stringify({
            platform: 'ESP8266',
            notes: 'Primary server power relay',
        })
    );
}

export function closeDatabase(): void {
    if (db) {
        db.close();
    }
}
