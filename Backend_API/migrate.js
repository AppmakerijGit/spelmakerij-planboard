import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

await conn.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
const [appliedRows] = await conn.query('SELECT filename FROM schema_migrations');
const applied = new Set(appliedRows.map(r => r.filename));

for (const file of readdirSync('migrations').sort().filter(f => f.endsWith('.sql'))) {
  if (applied.has(file)) {
    console.log(`Skipped (already applied): ${file}`);
    continue;
  }
  const sql = readFileSync(`migrations/${file}`, 'utf8');
  await conn.query(sql);
  await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
  console.log(`Applied: ${file}`);
}

await conn.end();
console.log('All migrations complete.');
