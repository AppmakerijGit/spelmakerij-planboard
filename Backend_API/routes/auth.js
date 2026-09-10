import { Router } from 'express';
import { login, refreshSession, revokeSession } from '../services/authService.js';

const router = Router();

function cookieOptions(persistent) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    path: '/auth',
    ...(persistent ? { maxAge: 14 * 24 * 60 * 60 * 1000 } : {}),
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe = false } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const result = await login(username, password, rememberMe);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });

    res.cookie('refresh_token', result.refreshToken, cookieOptions(result.persistent));
    res.json({ token: result.token, user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const tokenValue = req.cookies.refresh_token;
    if (!tokenValue) return res.status(401).json({ error: 'No refresh token' });

    const result = await refreshSession(tokenValue);
    if (!result) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    res.cookie('refresh_token', result.newRefreshToken, cookieOptions(result.persistent));
    res.json({ token: result.token, user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const tokenValue = req.cookies.refresh_token;
    await revokeSession(tokenValue);
    res.clearCookie('refresh_token', { path: '/auth' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
