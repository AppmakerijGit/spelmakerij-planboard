import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

function deriveInitials(name) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

const testPassword = process.env.TEST_USER_PASSWORD || 'Test1234!';
const testUsers = [
  {
    username: 'test.deelnemer',
    name: 'Test Deelnemer',
    role: 'deelnemer',
    email: 'test.deelnemer@example.local',
  },
  {
    username: 'test.admin',
    name: 'Test Admin',
    role: 'admin',
    email: 'test.admin@example.local',
  },
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const passwordHash = await bcrypt.hash(testPassword, 10);

for (const user of testUsers) {
  const initials = deriveInitials(user.name);
  await conn.query(
    `
      INSERT INTO users (username, password_hash, name, role, initials, email, active)
      VALUES (?, ?, ?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        name = VALUES(name),
        role = VALUES(role),
        initials = VALUES(initials),
        email = VALUES(email),
        active = true
    `,
    [user.username, passwordHash, user.name, user.role, initials, user.email]
  );
}

console.log('Seeded test users:');
console.log(`- deelnemer: username="test.deelnemer", password="${testPassword}"`);
console.log(`- admin: username="test.admin", password="${testPassword}"`);

await conn.end();
