import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  updateEditorEnabled,
  deleteAccount,
  addExclusivity,
  removeExclusivity,
  addLocationRestriction,
  removeLocationRestriction,
  getAvailability,
  saveAvailability
} from '../services/accountsService.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const accounts = await getAccounts();
    res.json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, role, email, password } = req.body;
    if (!name || !username || !role || !password) {
      return res.status(400).json({ error: 'name, username, role, and password are required' });
    }
    const account = await createAccount({ name, username, role, email, password });
    res.status(201).json({ account });
  } catch (err) {
    console.error('Error creating account:', err);
    const status = err.status || 500;
    const message = status === 500 ? 'Internal server error' : err.message;
    res.status(status).json({ error: message, details: err.message });
  }
});

router.put('/:id/editor', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    const found = await updateEditorEnabled(req.params.id, enabled);
    if (!found) return res.status(404).json({ error: 'Account not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/availability', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const availability = await getAvailability(req.params.id);
    res.json({ availability: availability ?? {
      monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: true
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/availability', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { monday, tuesday, wednesday, thursday, friday, slot_availability } = req.body;
    if ([monday, tuesday, wednesday, thursday, friday].some(v => typeof v !== 'boolean')) {
      return res.status(400).json({ error: 'All day fields must be booleans' });
    }
    await saveAvailability(req.params.id, { monday, tuesday, wednesday, thursday, friday, slot_availability });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const account = await updateAccount(req.params.id, req.body);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const found = await deleteAccount(req.params.id);
    if (!found) return res.status(404).json({ error: 'Account not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/exclusivities', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partnerId = parseInt(req.body.partnerId);
    if (!partnerId || isNaN(partnerId)) {
      return res.status(400).json({ error: 'partnerId is required' });
    }
    if (id === partnerId) {
      return res.status(400).json({ error: 'Cannot add exclusivity with self' });
    }
    await addExclusivity(id, partnerId);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    const message = status === 500 ? 'Internal server error' : err.message;
    res.status(status).json({ error: message });
  }
});

router.delete('/:id/exclusivities/:partnerId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partnerId = parseInt(req.params.partnerId);
    await removeExclusivity(id, partnerId);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/location-restrictions/:locationId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const locationId = parseInt(req.params.locationId);
    if (isNaN(userId) || isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid id or locationId' });
    }
    await addLocationRestriction(userId, locationId);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    const message = status === 500 ? 'Internal server error' : err.message;
    res.status(status).json({ error: message });
  }
});

router.delete('/:id/location-restrictions/:locationId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const locationId = parseInt(req.params.locationId);
    await removeLocationRestriction(userId, locationId);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
