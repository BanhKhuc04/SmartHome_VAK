const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('d:/Work/Home Smart/backend/data/home-smart.db');
db.pragma('foreign_keys = ON');

console.log('--- Manual Reseeding ---');

db.transaction(() => {
    // Clear existing
    db.prepare('DELETE FROM sensors').run();
    db.prepare('DELETE FROM relays').run();
    db.prepare('DELETE FROM devices').run();
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM users').run();

    // User
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (1, ?, ?, ?, ?)').run('admin', 'admin@homesmart.local', hash, 'admin');

    // Rooms
    const rooms = [
        { id: 'room-living', name: 'Phòng khách', type: 'living_room', icon: 'sofa' },
        { id: 'room-bedroom', name: 'Phòng ngủ', type: 'bedroom', icon: 'bed' },
        { id: 'room-kitchen', name: 'Nhà bếp', type: 'kitchen', icon: 'utensils' },
    ];
    const insRoom = db.prepare('INSERT INTO rooms (id, name, type, icon) VALUES (?, ?, ?, ?)');
    rooms.forEach(r => insRoom.run(r.id, r.name, r.type, r.icon));

    // Devices
    const devices = [
        { id: 'esp8266-001', name: 'Living Room Controller', type: 'esp8266', location: 'Phòng khách', room_id: 'room-living', status: 'online' },
        { id: 'esp8266-002', name: 'Bedroom Controller', type: 'esp8266', location: 'Phòng ngủ', room_id: 'room-bedroom', status: 'online' },
        { id: 'esp8266-003', name: 'Kitchen Monitor', type: 'esp8266', location: 'Nhà bếp', room_id: 'room-kitchen', status: 'offline' },
    ];
    const insDev = db.prepare('INSERT INTO devices (id, name, type, location, room_id, status, owner_id) VALUES (?, ?, ?, ?, ?, ?, 1)');
    devices.forEach(d => insDev.run(d.id, d.name, d.type, d.location, d.room_id, d.status));

    // Relays
    const insRelay = db.prepare('INSERT INTO relays (id, device_id, name, pin, state) VALUES (?, ?, ?, ?, ?)');
    insRelay.run('relay-1', 'esp8266-001', 'Đèn chính', 5, 0);
    insRelay.run('relay-2', 'esp8266-001', 'Đèn trang trí', 4, 0);
    insRelay.run('relay-1', 'esp8266-002', 'Đèn trần', 5, 1);
    insRelay.run('relay-2', 'esp8266-002', 'Quạt', 4, 0);

    // Sensors
    const insSensor = db.prepare('INSERT INTO sensors (id, device_id, name, type, unit) VALUES (?, ?, ?, ?, ?)');
    insSensor.run('temp-1', 'esp8266-001', 'Nhiệt độ', 'temperature', '°C');
    insSensor.run('hum-1', 'esp8266-001', 'Độ ẩm', 'humidity', '%');
    insSensor.run('temp-1', 'esp8266-002', 'Nhiệt độ', 'temperature', '°C');
})();

console.log('✅ Reseeding complete.');
db.close();
