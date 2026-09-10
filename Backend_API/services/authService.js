import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role,
      initials: user.initials,
      editor_enabled: Boolean(user.editor_enabled),
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function createRefreshToken(userId, persistent) {
  const tokenValue = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
  const lifetimeMs = persistent
    ? 14 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + lifetimeMs);
  await pool.execute(
    'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, persistent) VALUES (?, ?, ?, ?)',
    [tokenHash, userId, expiresAt, persistent]
  );
  return tokenValue;
}

export async function login(username, password, rememberMe = false) {
  const [rows] = await pool.query(
    'SELECT id, password_hash, name, role, initials, active, editor_enabled FROM users WHERE username = ?',
    [username]
  );
  const user = rows[0];
  if (!user || !user.active) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  const token = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id, rememberMe);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      initials: user.initials,
      editorEnabled: Boolean(user.editor_enabled),
    },
    refreshToken,
    persistent: rememberMe,
  };
}

export async function refreshSession(tokenValue) {
  const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, rt.persistent,
              u.name, u.role, u.initials, u.active, u.editor_enabled
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ?
       FOR UPDATE`,
      [tokenHash]
    );
    const stored = rows[0];
    if (!stored || stored.revoked || new Date(stored.expires_at) <= new Date() || !stored.active) {
      await conn.rollback();
      return null;
    }

    await conn.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [stored.id]);

    const newTokenValue = crypto.randomBytes(64).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newTokenValue).digest('hex');
    const persistent = Boolean(stored.persistent);
    const lifetimeMs = persistent ? 14 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + lifetimeMs);
    await conn.execute(
      'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, persistent) VALUES (?, ?, ?, ?)',
      [newTokenHash, stored.user_id, expiresAt, persistent]
    );

    await conn.commit();

    const token = signAccessToken({
      id: stored.user_id,
      name: stored.name,
      role: stored.role,
      initials: stored.initials,
      editor_enabled: stored.editor_enabled,
    });

    return {
      token,
      user: {
        id: stored.user_id,
        name: stored.name,
        role: stored.role,
        initials: stored.initials,
        editorEnabled: Boolean(stored.editor_enabled),
      },
      newRefreshToken: newTokenValue,
      persistent,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function revokeSession(tokenValue) {
  if (!tokenValue) return;
  const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
  await pool.execute(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?',
    [tokenHash]
  );
}
