
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Target the correct DB path
const DB_PATH = 'd:/Work/Home Smart/backend/data/home-smart.db';

try {
    const db = new Database(DB_PATH);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    
    if (!user) {
        console.log('--- DIAGNOSTIC RESULTS ---');
        console.log('STATUS: FAILED');
        console.log('REASON: User "admin" NOT FOUND in database');
        
        // List all users to see what we have
        const allUsers = db.prepare('SELECT username FROM users').all();
        console.log('Available users:', allUsers.map(u => u.username).join(', '));
    } else {
        console.log('--- DIAGNOSTIC RESULTS ---');
        console.log('STATUS: USER FOUND');
        console.log('User Details:', { id: user.id, username: user.username, role: user.role });
        
        const match = bcrypt.compareSync('admin123', user.password_hash);
        console.log('Password match test ("admin123"):', match ? 'SUCCESS' : 'FAILED');
        
        if (!match) {
            console.log('Updating password hash to "admin123" for testing...');
            const newHash = bcrypt.hashSync('admin123', 10);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
            console.log('Password hash updated successfully.');
        }
    }
} catch (err) {
    console.error('DIAGNOSTIC ERROR:', err.message);
}
