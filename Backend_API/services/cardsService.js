import pool from '../db.js';

function emptySlots() {
  return [[], [], [], []];
}

function normalizeSlots(slots) {
  if (Array.isArray(slots)) return slots;
  if (typeof slots !== 'string') return emptySlots();

  try {
    const parsed = JSON.parse(slots);
    return Array.isArray(parsed) ? parsed : emptySlots();
  } catch {
    return emptySlots();
  }
}

export async function getCards(date) {
  const [rows] = await pool.query(
    'SELECT slots, published_at AS publishedAt, visible_from AS visibleFrom, updated_at AS updatedAt FROM day_plans WHERE date = ?',
    [date]
  );
  if (!rows.length) return { date, slots: emptySlots(), publishedAt: null, visibleFrom: null, updatedAt: null };
  return { date, slots: normalizeSlots(rows[0].slots), publishedAt: rows[0].publishedAt, visibleFrom: rows[0].visibleFrom, updatedAt: rows[0].updatedAt };
}

export async function getPublishedDays(fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, published_at AS publishedAt
     FROM day_plans
     WHERE published_at IS NOT NULL
       AND date BETWEEN ? AND ?
     ORDER BY date`,
    [fromDate, toDate]
  );

  return rows;
}

export async function getPlanStatuses(fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, 
            (published_at IS NOT NULL) AS isPublished,
            (slots IS NOT NULL AND JSON_VALID(slots) AND JSON_LENGTH(slots) > 0) AS hasPlanning
     FROM day_plans
     WHERE date BETWEEN ? AND ?
     ORDER BY date`,
    [fromDate, toDate]
  );
  return rows.map(row => ({
    date: row.date,
    isPublished: !!row.isPublished,
    hasPlanning: !!row.hasPlanning
  }));
}

export async function putCards(date, slots, updatedAt) {
  if (updatedAt != null) {
    const [rows] = await pool.query(
      'SELECT updated_at FROM day_plans WHERE date = ?',
      [date]
    );
    if (rows.length && rows[0].updated_at?.toISOString() !== new Date(updatedAt).toISOString()) {
      return false;
    }
  }
  await pool.query(
    `INSERT INTO day_plans (date, slots)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE slots = VALUES(slots), published_at = NULL, updated_at = CURRENT_TIMESTAMP`,
    [date, JSON.stringify(slots)]
  );
  const [updated] = await pool.query(
    'SELECT updated_at AS updatedAt FROM day_plans WHERE date = ?',
    [date]
  );
  return updated[0].updatedAt;
}

export async function publishCards(date, visibleFrom) {
  const [result] = await pool.query(
    `UPDATE day_plans
     SET published_at = CURRENT_TIMESTAMP, visible_from = ?
     WHERE date = ?`,
    [visibleFrom ?? null, date]
  );
  return result.affectedRows > 0;
}

export async function getRecentGames(fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, slots
     FROM day_plans
     WHERE date BETWEEN ? AND ?
     ORDER BY date`,
    [fromDate, toDate]
  );

  const results = [];
  for (const row of rows) {
    const slots = normalizeSlots(row.slots);
    for (const slot of slots) {
      for (const card of slot) {
        if (!card.title || !Array.isArray(card.clients)) continue;
        for (const clientName of card.clients) {
          results.push({ clientName, gameTitle: card.title, date: row.date });
        }
      }
    }
  }
  return results;
}

function nameMatches(value, target) {
  return String(value ?? '').trim().toLowerCase() === target;
}

// Pure: remove a person (by name, case-insensitive) from a day's slots.
// - strips the name from every card's `clients` and `supers`
// - drops a card when removing the person leaves it with no deelnemers
// - keeps cards that still have a deelnemer, even without a begeleider
// Returns { slots, changed }; `changed` is only true if something was removed.
export function stripPersonFromSlots(slots, name) {
  const target = String(name ?? '').trim().toLowerCase();
  let changed = false;

  const newSlots = (Array.isArray(slots) ? slots : []).map((slot) => {
    const newSlot = [];
    for (const card of Array.isArray(slot) ? slot : []) {
      const clients = Array.isArray(card.clients) ? card.clients : [];
      const supers = Array.isArray(card.supers) ? card.supers : [];

      const keptClients = clients.filter((c) => !nameMatches(c, target));
      const keptSupers = supers.filter((s) => !nameMatches(s.n, target));

      const cardChanged =
        keptClients.length !== clients.length || keptSupers.length !== supers.length;

      if (!cardChanged) {
        newSlot.push(card);
        continue;
      }

      changed = true;

      // No deelnemers left means there is no activity to keep.
      if (keptClients.length === 0) continue;

      newSlot.push({ ...card, clients: keptClients, supers: keptSupers });
    }
    return newSlot;
  });

  return { slots: newSlots, changed };
}

// Remove a person from every day plan in [fromDate, toDate] (inclusive).
// Preserves published_at so already-published days stay visible to deelnemers.
export async function removePersonFromSchedule(name, fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, slots
     FROM day_plans
     WHERE date BETWEEN ? AND ?`,
    [fromDate, toDate]
  );

  for (const row of rows) {
    const { slots, changed } = stripPersonFromSlots(normalizeSlots(row.slots), name);
    if (!changed) continue;
    await pool.query(
      `UPDATE day_plans SET slots = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`,
      [JSON.stringify(slots), row.date]
    );
  }
}
