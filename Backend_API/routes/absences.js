import { Router } from 'express';
import { authenticate } from '../auth.js';
import { getAbsences, createAbsence, deleteAbsence, getAbsenceById } from '../services/absencesService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const absences = await getAbsences(req.query.date);
    res.json({ absences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, date, type, fromDate, toDate, reason } = req.body;
    if (!name || !date || !type) {
      return res.status(400).json({ error: 'name, date, and type are required' });
    }
    if (type === 'vakantie' && (!fromDate || !toDate)) {
      return res.status(400).json({ error: 'fromDate and toDate are required for vakantie' });
    }
    const absence = await createAbsence({ name, date, type, fromDate, toDate, reason });
    res.status(201).json({ absence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const absence = await getAbsenceById(req.params.id);
    if (!absence) return res.status(404).json({ error: 'Absence not found' });
    if (req.user.role !== 'admin' && req.user.name !== absence.name) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    await deleteAbsence(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
