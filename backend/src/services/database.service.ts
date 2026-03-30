import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/home-smart.db');

let db: Database.Database;

export function getDatabase(): Database.Database {
    if (!db) {
        // Ensure directory exists
        const dir = path.dirname(DB_PATH);
        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        console.log(`[DB] Connected to SQLite: ${DB_PATH}`);
    }
    return db;
}

export function initializeDatabase(): void {
    const database = getDatabase();

    database.exec(`
    -- Users table for authentication
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Rooms table
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'living_room',
      icon TEXT DEFAULT 'sofa',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Devices table
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'esp8266' CHECK(type IN ('esp8266', 'esp32')),
      location TEXT DEFAULT '',
      room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      config JSON DEFAULT '{}',
      firmware_version TEXT DEFAULT '1.0.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Energy Logs table for high-density tracking
    CREATE TABLE IF NOT EXISTS energy_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      power_usage REAL NOT NULL, -- in Watts
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('info', 'warning', 'danger', 'success')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Relays table
    CREATE TABLE IF NOT EXISTS relays (
      id TEXT NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pin INTEGER NOT NULL,
      state INTEGER DEFAULT 0,
      PRIMARY KEY (id, device_id)
    );

    -- Sensors table
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('temperature', 'humidity', 'light', 'motion', 'gas')),
      unit TEXT DEFAULT '',
      PRIMARY KEY (id, device_id)
    );

    -- Sensor history (time-series data)
    CREATE TABLE IF NOT EXISTS sensor_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      sensor_id TEXT NOT NULL,
      value REAL NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sensor_id, device_id) REFERENCES sensors(id, device_id) ON DELETE CASCADE
    );

    -- Schedules table
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      relay_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('on', 'off', 'toggle')),
      cron_expression TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_run DATETIME,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Automation Rules (Nexus Logic Builder)
    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_json JSON NOT NULL,
      conditions_json JSON DEFAULT '[]',
      actions_json JSON NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_triggered DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Smart Scenes
    CREATE TABLE IF NOT EXISTS smart_scenes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      actions_json JSON NOT NULL,
      icon TEXT DEFAULT 'sparkles',
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Alert rules table
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      sensor_id TEXT NOT NULL,
      condition TEXT NOT NULL CHECK(condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
      threshold REAL NOT NULL,
      channel TEXT DEFAULT 'telegram' CHECK(channel IN ('telegram', 'email')),
      enabled INTEGER DEFAULT 1,
      last_triggered DATETIME,
      cooldown_minutes INTEGER DEFAULT 5,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Firmware table for OTA
    CREATE TABLE IF NOT EXISTS firmwares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      device_type TEXT DEFAULT 'esp8266',
      filename TEXT NOT NULL,
      file_size INTEGER,
      checksum TEXT,
      description TEXT DEFAULT '',
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sensor_history_device ON sensor_history(device_id, sensor_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_history_time ON sensor_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_energy_logs_device ON energy_logs(device_id);
    CREATE INDEX IF NOT EXISTS idx_energy_logs_time ON energy_logs(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_id);
    CREATE INDEX IF NOT EXISTS idx_devices_room ON devices(room_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_device ON schedules(device_id);
    CREATE INDEX IF NOT EXISTS idx_alert_rules_device ON alert_rules(device_id);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
  `);

    // Migration: Add room_id to devices if not exists
    const deviceTableInfo = database.pragma('table_info(devices)') as any[];
    const hasRoomId = deviceTableInfo.some(col => col.name === 'room_id');
    if (!hasRoomId) {
        console.log('[DB] Migrating devices table: adding room_id...');
        database.exec('ALTER TABLE devices ADD COLUMN room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL');
    }

    console.log('[DB] Schema initialized');
    seedDemoData(database);
}

function seedDemoData(database: Database.Database): void {
    const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count > 0) return;

    console.log('[DB] Seeding demo data...');

    // Default admin user (password: admin123)
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    database.prepare(`
    INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)
  `).run('admin', 'admin@homesmart.local', hash, 'admin');

    // Demo Rooms
    const roomsData = [
        { id: 'room-living', name: 'Phòng khách', type: 'living_room', icon: 'sofa' },
        { id: 'room-bedroom', name: 'Phòng ngủ', type: 'bedroom', icon: 'bed' },
        { id: 'room-kitchen', name: 'Nhà bếp', type: 'kitchen', icon: 'utensils' },
    ];

    const insertRoom = database.prepare(`
        INSERT INTO rooms (id, name, type, icon) VALUES (?, ?, ?, ?)
    `);

    for (const r of roomsData) {
        insertRoom.run(r.id, r.name, r.type, r.icon);
    }

    // Demo devices
    const devicesData = [
        { id: 'esp8266-001', name: 'Living Room Controller', type: 'esp8266', location: 'Phòng khách', room_id: 'room-living', status: 'online' },
        { id: 'esp8266-002', name: 'Bedroom Controller', type: 'esp8266', location: 'Phòng ngủ', room_id: 'room-bedroom', status: 'online' },
        { id: 'esp8266-003', name: 'Kitchen Monitor', type: 'esp8266', location: 'Nhà bếp', room_id: 'room-kitchen', status: 'offline' },
    ];

    const insertDevice = database.prepare(`
    INSERT INTO devices (id, name, type, location, room_id, status, owner_id) VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

    const insertRelay = database.prepare(`
    INSERT INTO relays (id, device_id, name, pin, state) VALUES (?, ?, ?, ?, ?)
  `);

    const insertSensor = database.prepare(`
    INSERT INTO sensors (id, device_id, name, type, unit) VALUES (?, ?, ?, ?, ?)
  `);

    for (const d of devicesData) {
        insertDevice.run(d.id, d.name, d.type, d.location, d.room_id, d.status);
    }

    // Relays
    insertRelay.run('relay-1', 'esp8266-001', 'Đèn chính', 5, 0);
    insertRelay.run('relay-2', 'esp8266-001', 'Đèn trang trí', 4, 0);
    insertRelay.run('relay-1', 'esp8266-002', 'Đèn trần', 5, 1);
    insertRelay.run('relay-2', 'esp8266-002', 'Quạt', 4, 0);
    insertRelay.run('relay-1', 'esp8266-003', 'Đèn bếp', 5, 0);

    // Sensors
    insertSensor.run('temp-1', 'esp8266-001', 'Nhiệt độ', 'temperature', '°C');
    insertSensor.run('hum-1', 'esp8266-001', 'Độ ẩm', 'humidity', '%');
    insertSensor.run('temp-1', 'esp8266-002', 'Nhiệt độ', 'temperature', '°C');
    insertSensor.run('hum-1', 'esp8266-002', 'Độ ẩm', 'humidity', '%');
    insertSensor.run('light-1', 'esp8266-002', 'Ánh sáng', 'light', 'lux');
    insertSensor.run('temp-1', 'esp8266-003', 'Nhiệt độ', 'temperature', '°C');
    insertSensor.run('gas-1', 'esp8266-003', 'Khí gas', 'gas', 'ppm');

    // Seed some sensor history
    const insertHistory = database.prepare(`
    INSERT INTO sensor_history (device_id, sensor_id, value, recorded_at) VALUES (?, ?, ?, ?)
  `);

    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
        const ts = new Date(now - i * 60000).toISOString();
        insertHistory.run('esp8266-001', 'temp-1', 25 + Math.sin(i * 0.3) * 5 + Math.random() * 2, ts);
        insertHistory.run('esp8266-001', 'hum-1', 60 + Math.cos(i * 0.2) * 10 + Math.random() * 3, ts);
        insertHistory.run('esp8266-002', 'temp-1', 24 + Math.sin(i * 0.25) * 4 + Math.random() * 1.5, ts);
    }

    console.log('[DB] Demo data seeded');
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log('[DB] Connection closed');
    }
}
