import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getCards, getPublishedDays, getPlanStatuses, putCards, publishCards, getRecentGames } from '../services/cardsService.js';

const router = Router();

router.get('/statuses', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }

    const result = await getPlanStatuses(from, to);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/published-days', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }

    const result = await getPublishedDays(from, to);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recent-games', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }

    const result = await getRecentGames(from, to);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:date', authenticate, async (req, res) => {
  try {
    const result = await getCards(req.params.date);
    const notYetVisible = result.visibleFrom && new Date() < new Date(result.visibleFrom);
    const isClient = req.user.role === 'deelnemer';
    const isVolunteer = req.user.role === 'vrijwilliger';
    if ((isClient || isVolunteer) && !result.publishedAt) {
      return res.json({ date: req.params.date, slots: [[], [], [], []], publishedAt: null });
    }
    if (isClient && notYetVisible) {
      return res.json({ date: req.params.date, slots: [[], [], [], []], publishedAt: null });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:date', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { slots, updatedAt } = req.body;
    if (!Array.isArray(slots) || slots.length !== 4) {
      return res.status(400).json({ error: 'slots must be an array of 4 arrays' });
    }
    const newUpdatedAt = await putCards(req.params.date, slots, updatedAt ?? null);
    if (newUpdatedAt === false) return res.status(409).json({ error: 'Conflict: planning was modified by another user' });
    res.status(200).json({ updatedAt: newUpdatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:date/publish', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { visibleFrom } = req.body ?? {};
    const found = await publishCards(req.params.date, visibleFrom ?? null);
    if (!found) return res.status(404).json({ error: 'Planning not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
