import pool from '../db.js';
import { removePersonFromSchedule } from './cardsService.js';

function mapAbsence(row) {
  return {
    id:        row.id,
    name:      row.name,
    date:      row.date,
    type:      row.type,
    fromDate:  row.from_date ?? null,
    toDate:    row.to_date ?? null,
    reason:    row.reason ?? null,
  };
}

const SELECT_COLUMNS = `id, name,
  DATE_FORMAT(date, '%Y-%m-%d') AS date,
  type,
  DATE_FORMAT(from_date, '%Y-%m-%d') AS from_date,
  DATE_FORMAT(to_date, '%Y-%m-%d') AS to_date,
  reason`;

export async function getAbsences(date) {
  if (date) {
    // An absence covers every day in its [from_date, to_date] range.
    // Rows without a range fall back to the single `date` column.
    const [rows] = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM absences WHERE ? BETWEEN COALESCE(from_date, date) AND COALESCE(to_date, date)`,
      [date]
    );
    return rows.map(mapAbsence);
  }
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM absences ORDER BY date DESC`);
  return rows.map(mapAbsence);
}

export async function createAbsence({ name, date, type, fromDate, toDate, reason }) {
  const [result] = await pool.query(
    'INSERT INTO absences (name, date, type, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [name, date, type, fromDate ?? null, toDate ?? null, reason ?? null]
  );
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM absences WHERE id = ?`, [result.insertId]);
  const absence = mapAbsence(rows[0]);

  // Pull the person off the board for every day this absence covers.
  await removePersonFromSchedule(absence.name, absence.fromDate ?? absence.date, absence.toDate ?? absence.date);

  return absence;
}

export async function getAbsenceById(id) {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM absences WHERE id = ?`, [id]);
  return rows[0] ? mapAbsence(rows[0]) : null;
}

export async function deleteAbsence(id) {
  const [result] = await pool.query('DELETE FROM absences WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
