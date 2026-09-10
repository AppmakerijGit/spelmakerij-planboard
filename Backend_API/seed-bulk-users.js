import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Usage: node seed-bulk-users.js --deelnemers 5 --admins 2
// Defaults: 3 deelnemers, 1 admin

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? parseInt(args[idx + 1], 10) : fallback;
}

const numDeelnemers = getArg('deelnemers', 3);
const numAdmins = getArg('admins', 1);
const password = process.env.TEST_USER_PASSWORD || 'Test1234!';

const FIRST_NAMES = [
  'Lotte', 'Emma', 'Sophie', 'Julia', 'Anna', 'Lisa', 'Nina', 'Sara',
  'Daan', 'Lars', 'Finn', 'Tim', 'Bas', 'Sven', 'Joris', 'Pieter',
  'Noor', 'Fleur', 'Iris', 'Mila', 'Roos', 'Eva', 'Amy', 'Hanna',
  'Tom', 'Max', 'Sem', 'Luuk', 'Bram', 'Koen', 'Rick', 'Jesse',
];

const LAST_NAMES = [
  'de Vries', 'Janssen', 'Bakker', 'Visser', 'Smit', 'Meijer',
  'de Boer', 'Mulder', 'van den Berg', 'van Dijk', 'Bos', 'Hendriks',
  'Peters', 'Vermeer', 'Kok', 'Lammers', 'Dekker', 'Hoekstra',
  'Willems', 'Jacobs', 'van Leeuwen', 'Brouwer', 'Dijkstra', 'van Dam',
];

function deriveInitials(name) {
  return name
    .split(' ')
    .filter((w) => w && !['de', 'van', 'den', 'der'].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

function pickUnique(arr, used) {
  const available = arr.filter((v) => !used.has(v));
  if (available.length === 0) throw new Error(`Ran out of unique values in pool (size ${arr.length})`);
  const pick = available[Math.floor(Math.random() * available.length)];
  used.add(pick);
  return pick;
}

function buildUsers(count, role) {
  const usedFirst = new Set();
  const usedLast = new Set();
  return Array.from({ length: count }, (_, i) => {
    const first = pickUnique(FIRST_NAMES, usedFirst);
    const last = pickUnique(LAST_NAMES, usedLast);
    const name = `${first} ${last}`;
    const slug = name.toLowerCase().replace(/[^a-z]/g, '.');
    return {
      username: `${role}.${slug}.${i + 1}`,
      name,
      role,
      email: `${slug}@example.local`,
      initials: deriveInitials(name),
    };
  });
}

if (numDeelnemers + numAdmins > FIRST_NAMES.length) {
  console.error(`Too many users requested. Max ${FIRST_NAMES.length} total (unique first names).`);
  process.exit(1);
}

const users = [
  ...buildUsers(numDeelnemers, 'deelnemer'),
  ...buildUsers(numAdmins, 'admin'),
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const passwordHash = await bcrypt.hash(password, 10);

for (const user of users) {
  await conn.query(
    `INSERT INTO users (username, password_hash, name, role, initials, email, active)
     VALUES (?, ?, ?, ?, ?, ?, true)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       name          = VALUES(name),
       role          = VALUES(role),
       initials      = VALUES(initials),
       email         = VALUES(email),
       active        = true`,
    [user.username, passwordHash, user.name, user.role, user.initials, user.email]
  );
  console.log(`  [${user.role.padEnd(10)}] ${user.name.padEnd(28)} — ${user.username}`);
}

console.log(`\nDone. Seeded ${numDeelnemers} deelnemer(s) and ${numAdmins} admin(s).`);
console.log(`Password for all: "${password}"`);

await conn.end();
