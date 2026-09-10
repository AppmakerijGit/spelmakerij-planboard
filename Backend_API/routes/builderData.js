import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { getBuilderData, createBuilderItem, deleteBuilderItem, reorderBuilderItems } from '../services/builderDataService.js';

const router = Router();
const VALID_CATEGORIES = ['clienten', 'begeleiders', 'locaties', 'spellen', 'vrijwilligers'];

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const data = await getBuilderData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:category', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category } = req.params;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = await createBuilderItem(category, name);
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:category/order', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category } = req.params;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids is required' });
    }

    await reorderBuilderItems(category, ids);
    res.sendStatus(204);
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_REORDER_PAYLOAD') {
      return res.status(400).json({ error: 'Invalid ids' });
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:category/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category, id } = req.params;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const found = await deleteBuilderItem(category, id);
    if (!found) return res.status(404).json({ error: 'Item not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
