import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getSlotTimes, updateSlotTimes } from '../services/slotTimesService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const slots = await getSlotTimes();
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const slots = req.body;
    if (!Array.isArray(slots) || slots.length !== 4) {
      return res.status(400).json({ error: 'Expected array of 4 slots' });
    }
    await updateSlotTimes(slots);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
