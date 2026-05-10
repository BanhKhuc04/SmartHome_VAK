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

    const legacyExists = database.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='automations'").get() as { count: number };
    let legacyRules: any[] = [];
    if (legacyExists.count > 0) {
        console.log('[DB] Found legacy automations table. Starting safe migration...');
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const backupName = `automations_backup_${timestamp}`;
        database.exec(`CREATE TABLE ${backupName} AS SELECT * FROM automations`);
        console.log(`[DB] Created backup table: ${backupName}`);
        
        legacyRules = database.prepare('SELECT * FROM automations').all();
        database.exec('ALTER TABLE automations RENAME TO automations_legacy');
        database.exec('DROP INDEX IF EXISTS idx_automations_enabled');
    }

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

        CREATE TABLE IF NOT EXISTS automation_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            enabled INTEGER NOT NULL DEFAULT 1,
            trigger_type TEXT NOT NULL,
            trigger_config_json TEXT NOT NULL DEFAULT '{}',
            conditions_json TEXT,
            actions_json TEXT NOT NULL DEFAULT '[]',
            cooldown_seconds INTEGER NOT NULL DEFAULT 300,
            last_triggered_at DATETIME,
            last_result TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS automation_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id TEXT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
            status TEXT NOT NULL,
            trigger_snapshot_json TEXT,
            condition_result_json TEXT,
            action_result_json TEXT,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discovered_modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            platform TEXT,
            ip_address TEXT,
            firmware_version TEXT,
            capabilities_json TEXT NOT NULL DEFAULT '[]',
            cmd_topic TEXT NOT NULL,
            state_topic TEXT NOT NULL,
            status_topic TEXT NOT NULL,
            telemetry_topic TEXT NOT NULL,
            raw_payload_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'ignored')),
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS device_telemetry_latest (
            device_id TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
            payload_json TEXT NOT NULL,
            temperature REAL,
            humidity REAL,
            pressure REAL,
            rssi INTEGER,
            battery REAL,
            uptime INTEGER,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS device_telemetry_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
            payload_json TEXT NOT NULL,
            temperature REAL,
            humidity REAL,
            pressure REAL,
            rssi INTEGER,
            battery REAL,
            uptime INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_telemetry_history_device ON device_telemetry_history(device_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
        CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id ON audit_logs(device_id);
        CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_automation_runs_rule_id ON automation_runs(rule_id, created_at DESC);
    `);

    if (legacyRules.length > 0) {
        let migratedCount = 0;
        const insertRule = database.prepare(`
            INSERT INTO automation_rules (id, name, description, enabled, trigger_type, trigger_config_json, actions_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
        `);

        for (const rule of legacyRules) {
            const triggerConfig = JSON.stringify({ cron: rule.schedule });
            const actions = JSON.stringify([{
                type: 'device_command',
                device_id: rule.device_id,
                command: rule.command
            }]);
            
            const result = insertRule.run(
                rule.id,
                rule.name,
                rule.description || '',
                rule.enabled,
                'schedule',
                triggerConfig,
                actions,
                rule.created_at,
                rule.updated_at
            );
            if (result.changes > 0) migratedCount++;
        }
        console.log(`[DB] Successfully migrated ${migratedCount} legacy automation rules to new Smart Rules engine.`);
    }

    seedDefaultAdmin(database);
    ensureDefaultModuleSeed(database);
    ensureDefaultStarterRules(database);
}

function ensureDefaultStarterRules(database: Database.Database): void {
    const rulesExist = database.prepare('SELECT count(*) as count FROM automation_rules').get() as { count: number };
    if (rulesExist.count > 0) return;

    console.log('[DB] Seeding starter automation rules (disabled by default)');
    
    const insertRule = database.prepare(`
        INSERT INTO automation_rules (id, name, description, enabled, trigger_type, trigger_config_json, conditions_json, actions_json, cooldown_seconds)
        VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
    `);

    // 1. High Temp Warning
    insertRule.run(
        'rule_starter_temp_warn',
        'Temperature Warning >= 35°C',
        'Sends a Telegram warning when any sensor reports temperature above 35°C.',
        'telemetry',
        JSON.stringify({ device_id: '*', metric: 'temperature' }),
        JSON.stringify({ all: [{ field: 'temperature', operator: '>=', value: 35 }] }),
        JSON.stringify([{ type: 'telegram', message: '⚠️ High Temperature Warning on {{device_id}}: {{temperature}}°C' }]),
        300
    );

    // 2. Critical Temp
    insertRule.run(
        'rule_starter_temp_crit',
        'Critical Temperature >= 40°C',
        'Sends a critical alert if temperature reaches 40°C.',
        'telemetry',
        JSON.stringify({ device_id: '*', metric: 'temperature' }),
        JSON.stringify({ all: [{ field: 'temperature', operator: '>=', value: 40 }] }),
        JSON.stringify([{ type: 'telegram', message: '🚨 CRITICAL TEMPERATURE on {{device_id}}: {{temperature}}°C' }]),
        300
    );

    // 3. Weak WiFi
    insertRule.run(
        'rule_starter_wifi_weak',
        'Weak Wi-Fi RSSI',
        'Alerts if device Wi-Fi signal drops below -80 dBm.',
        'telemetry',
        JSON.stringify({ device_id: '*', metric: 'rssi' }),
        JSON.stringify({ all: [{ field: 'rssi', operator: '<=', value: -80 }] }),
        JSON.stringify([{ type: 'telegram', message: '📶 Weak Wi-Fi Signal on {{device_id}}: {{rssi}} dBm' }]),
        600
    );
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
