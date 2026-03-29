/**
 * Seed Script - Demo Users
 * Run: node seed-users.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const users = [
    { name: 'Admin User', email: 'admin@default-college.com', password: 'Admin@1234', role: 'tenant_admin' },
    { name: 'Prof. Teacher', email: 'teacher@default-college.com', password: 'Teacher@1234', role: 'teacher' },
    { name: 'Alice Student', email: 'alice@default-college.com', password: 'Student@1234', role: 'student' },
    { name: 'Bob Student', email: 'bob@default-college.com', password: 'Student@1234', role: 'student' },
];

async function seed() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'exam_system',
    });

    console.log('Connected to database.\n');

    // Ensure tenant 1 exists
    const [tenants] = await conn.execute('SELECT tenant_id FROM Tenants WHERE tenant_id = 1');
    if (tenants.length === 0) {
        await conn.execute(
            "INSERT INTO Tenants (name, subdomain) VALUES ('Default College', 'default')"
        );
        console.log('Created default tenant.');
    }

    console.log('Seeding users...\n');
    for (const u of users) {
        const hash = await bcrypt.hash(u.password, ROUNDS);
        try {
            await conn.execute(
                `INSERT INTO Users (tenant_id, name, email, password_hash, role)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
                [u.name, u.email, hash, u.role]
            );
            console.log(`  ✅  [${u.role.padEnd(12)}] ${u.email}  →  ${u.password}`);
        } catch (err) {
            console.error(`  ❌  Failed for ${u.email}:`, err.message);
        }
    }

    await conn.end();
    console.log('\nDone!');
}

seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
