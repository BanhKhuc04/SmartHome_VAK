const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = 'd:/Work/Home Smart/backend/data/home-smart.db';

async function verifyNexus() {
    console.log('--- Nexus OS Verification Suite ---');
    
    let db;
    try {
        db = new Database(DB_PATH);
    } catch (err) {
        console.error('❌ Failed to connect to database:', err.message);
        return;
    }

    // 1. Check Tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    const requiredTables = ['rooms', 'energy_logs', 'notifications', 'devices'];
    
    requiredTables.forEach(table => {
        if (tables.includes(table)) {
            console.log(`✅ Table '${table}' exists.`);
        } else {
            console.error(`❌ Table '${table}' is MISSING.`);
        }
    });

    // 2. Check Device Migration (room_id)
    const deviceCols = db.prepare("PRAGMA table_info(devices)").all().map(c => c.name);
    if (deviceCols.includes('room_id')) {
        console.log("✅ 'devices' table has 'room_id' column.");
    } else {
        console.error("❌ 'devices' table is missing 'room_id' column.");
    }

    // 3. Check Seeding
    const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get().count;
    console.log(`📊 Total Rooms: ${roomCount}`);
    
    if (roomCount > 0) {
        console.log('✅ Room seeding successful.');
    } else {
        console.warn('⚠️ No rooms found in database.');
    }

    const linkedDevices = db.prepare("SELECT COUNT(*) as count FROM devices WHERE room_id IS NOT NULL").get().count;
    console.log(`🔗 Devices Linked to Rooms: ${linkedDevices}`);

    // 4. Check Energy Logs
    const energyCount = db.prepare("SELECT COUNT(*) as count FROM energy_logs").get().count;
    console.log(`⚡ Energy Logs found: ${energyCount}`);

    db.close();
    console.log('--- Verification Complete ---');
}

verifyNexus();
