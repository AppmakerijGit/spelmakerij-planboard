import pool from '../db.js';

const CATEGORY_TYPE = {
  clienten: 'deelnemer',
  begeleiders: 'sup-blue',
  vrijwilligers: 'sup-green',
  locaties: 'location',
  spellen: 'game',
};

export async function getBuilderData() {
  const [rows] = await pool.query('SELECT * FROM builder_items ORDER BY sort_order ASC');
  return {
    clienten:    rows.filter(r => r.category === 'clienten'),
    begeleiders: [
      ...rows.filter(r => r.category === 'begeleiders'),
      ...rows.filter(r => r.category === 'vrijwilligers'),
    ],
    locaties:    rows.filter(r => r.category === 'locaties'),
    spellen:     rows.filter(r => r.category === 'spellen'),
  };
}

export async function createBuilderItem(category, name) {
  const type = CATEGORY_TYPE[category];
  const [[{ next_order }]] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM builder_items WHERE category = ?',
    [category]
  );
  const [result] = await pool.query(
    'INSERT INTO builder_items (category, name, type, sort_order) VALUES (?, ?, ?, ?)',
    [category, name, type, next_order]
  );
  const [rows] = await pool.query('SELECT * FROM builder_items WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function reorderBuilderItems(category, ids) {
  const orderedIds = ids.map(id => Number(id));
  const hasInvalidIds = orderedIds.some(id => !Number.isInteger(id) || id <= 0);

  if (hasInvalidIds)
    throw new Error('INVALID_REORDER_PAYLOAD');

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id FROM builder_items WHERE category = ? ORDER BY sort_order ASC',
      [category]
    );
    const existingIds = rows.map(row => row.id);

    if (
      orderedIds.length !== existingIds.length
      || orderedIds.some(id => !existingIds.includes(id))
      || new Set(orderedIds).size !== orderedIds.length
    ) {
      throw new Error('INVALID_REORDER_PAYLOAD');
    }

    for (const [index, id] of orderedIds.entries()) {
      await connection.query(
        'UPDATE builder_items SET sort_order = ? WHERE id = ? AND category = ?',
        [index, id, category]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function deleteBuilderItem(category, id) {
  const [result] = await pool.query(
    'DELETE FROM builder_items WHERE id = ? AND category = ?',
    [id, category]
  );
  return result.affectedRows > 0;
}
