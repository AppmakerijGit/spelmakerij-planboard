import pool from '../db.js';

export async function getSlotTimes() {
  const [rows] = await pool.query(
    'SELECT id, sort_order AS sortOrder, time_range AS timeRange, period_label AS periodLabel FROM slot_times ORDER BY sort_order'
  );
  return rows;
}

export async function updateSlotTimes(slots) {
  for (const slot of slots) {
    await pool.query(
      'UPDATE slot_times SET time_range = ?, period_label = ? WHERE id = ?',
      [slot.timeRange, slot.periodLabel, slot.id]
    );
  }
}
