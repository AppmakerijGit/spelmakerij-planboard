import pool from '../db.js';
import bcrypt from 'bcryptjs';

function deriveInitials(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(' ').filter(w => w.length > 0);
  const initials = parts.length > 1
    ? parts.map(w => w[0]).join('')
    : trimmed;
  return initials.toUpperCase().slice(0, 2);
}

const SELECT_COLS = 'id, username, name, role, initials, email, active, editor_enabled, created_at';

function normalizeAccount(row) {
  if (!row) return row;

  return {
    ...row,
    active: Boolean(row.active),
    editor_enabled: Boolean(row.editor_enabled)
  };
}

function normalizeIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function addExclusivity(userIdA, userIdB) {
  const [a, b] = normalizeIds(userIdA, userIdB);
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE id IN (?, ?) AND role = 'deelnemer'",
    [a, b]
  );
  if (rows.length < 2) {
    const err = new Error('Both users must be deelnemers');
    err.status = 400;
    throw err;
  }
  await pool.query(
    'INSERT IGNORE INTO user_exclusivities (user_id_a, user_id_b) VALUES (?, ?)',
    [a, b]
  );
}

export async function removeExclusivity(userIdA, userIdB) {
  const [a, b] = normalizeIds(userIdA, userIdB);
  await pool.query(
    'DELETE FROM user_exclusivities WHERE user_id_a = ? AND user_id_b = ?',
    [a, b]
  );
}

export async function getAccounts() {
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users`);
  const [exclusivityRows] = await pool.query(
    'SELECT user_id_a, user_id_b FROM user_exclusivities'
  );

  const exclusivityMap = new Map();
  for (const row of exclusivityRows) {
    if (!exclusivityMap.has(row.user_id_a)) exclusivityMap.set(row.user_id_a, []);
    if (!exclusivityMap.has(row.user_id_b)) exclusivityMap.set(row.user_id_b, []);
    exclusivityMap.get(row.user_id_a).push(row.user_id_b);
    exclusivityMap.get(row.user_id_b).push(row.user_id_a);
  }

  const [locationRows] = await pool.query(
    'SELECT user_id, location_id FROM user_location_restrictions'
  );
  const locationMap = new Map();
  for (const row of locationRows) {
    if (!locationMap.has(row.user_id)) locationMap.set(row.user_id, []);
    locationMap.get(row.user_id).push(row.location_id);
  }

  const [availabilityRows] = await pool.query('SELECT user_id, monday, tuesday, wednesday, thursday, friday, slot_availability FROM user_availability');
  const availabilityMap = new Map();
  for (const row of availabilityRows) {
    availabilityMap.set(row.user_id, {
      monday: Boolean(row.monday),
      tuesday: Boolean(row.tuesday),
      wednesday: Boolean(row.wednesday),
      thursday: Boolean(row.thursday),
      friday: Boolean(row.friday),
      slot_availability: typeof row.slot_availability === 'string'
        ? JSON.parse(row.slot_availability)
        : row.slot_availability ?? null,
    });
  }

  return rows.map(row => {
    const avail = availabilityMap.get(row.id);
    return {
      ...normalizeAccount(row),
      exclusiveWith: exclusivityMap.get(row.id) ?? [],
      locationRestrictions: locationMap.get(row.id) ?? [],
      availability: {
        monday: avail?.monday ?? true,
        tuesday: avail?.tuesday ?? true,
        wednesday: avail?.wednesday ?? true,
        thursday: avail?.thursday ?? true,
        friday: avail?.friday ?? true,
      },
      slot_availability: avail?.slot_availability ?? null,
    };
  });
}

export async function createAccount({ name, username, role, email, password }) {
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    const err = new Error('Username already exists');
    err.status = 400;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const initials = deriveInitials(name);
  const [result] = await pool.query(
    'INSERT INTO users (username, password_hash, name, role, initials, email) VALUES (?, ?, ?, ?, ?, ?)',
    [username, password_hash, name, role, initials, email ?? null]
  );
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [result.insertId]);
  return normalizeAccount(rows[0]);
}

export async function updateAccount(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?', 'initials = ?');
    values.push(updates.name, deriveInitials(updates.name));
  }
  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    fields.push('password_hash = ?');
    values.push(await bcrypt.hash(updates.password, 10));
  }
  if (updates.active !== undefined) { fields.push('active = ?'); values.push(updates.active); }

  if (!fields.length) {
    const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [id]);
    return normalizeAccount(rows[0] ?? null);
  }

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await pool.query(`SELECT ${SELECT_COLS} FROM users WHERE id = ?`, [id]);
  return normalizeAccount(rows[0] ?? null);
}

export async function updateEditorEnabled(id, enabled) {
  const [result] = await pool.query('UPDATE users SET editor_enabled = ? WHERE id = ?', [enabled, id]);
  return result.affectedRows > 0;
}

export async function deleteAccount(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getAvailability(userId) {
  const [rows] = await pool.query(
    'SELECT monday, tuesday, wednesday, thursday, friday, slot_availability FROM user_availability WHERE user_id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    monday: Boolean(row.monday),
    tuesday: Boolean(row.tuesday),
    wednesday: Boolean(row.wednesday),
    thursday: Boolean(row.thursday),
    friday: Boolean(row.friday),
    slot_availability: typeof row.slot_availability === 'string'
      ? JSON.parse(row.slot_availability)
      : row.slot_availability ?? null,
  };
}

export async function saveAvailability(userId, days) {
  const slotJson = days.slot_availability ? JSON.stringify(days.slot_availability) : null;
  await pool.query(
    `INSERT INTO user_availability (user_id, monday, tuesday, wednesday, thursday, friday, slot_availability)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       monday = VALUES(monday), tuesday = VALUES(tuesday),
       wednesday = VALUES(wednesday), thursday = VALUES(thursday),
       friday = VALUES(friday), slot_availability = VALUES(slot_availability)`,
    [userId, days.monday, days.tuesday, days.wednesday, days.thursday, days.friday, slotJson]
  );
}

export async function addLocationRestriction(userId, locationId) {
  const [[loc]] = await pool.query(
    "SELECT id FROM builder_items WHERE id = ? AND category = 'locaties'",
    [locationId]
  );
  if (!loc) {
    const err = new Error('Location not found');
    err.status = 400;
    throw err;
  }
  await pool.query(
    'INSERT IGNORE INTO user_location_restrictions (user_id, location_id) VALUES (?, ?)',
    [userId, locationId]
  );
}

export async function removeLocationRestriction(userId, locationId) {
  await pool.query(
    'DELETE FROM user_location_restrictions WHERE user_id = ? AND location_id = ?',
    [userId, locationId]
  );
}
