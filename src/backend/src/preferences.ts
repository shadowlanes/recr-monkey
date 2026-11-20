import { Router, Request, Response } from 'express';
import { PreferencesDB } from './db-operations';
import { ApiResponse, UserPreferences } from './types';
import { requireAuth } from './middleware';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const prefs = await PreferencesDB.get(req.user!.id);
    const response: ApiResponse<UserPreferences> = { data: prefs, error: null };
    res.json(response);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ data: null, error: { message: 'Failed to get preferences' } });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { display_currency } = req.body;
    if (typeof display_currency !== 'string' || !/^[A-Z]{3}$/.test(display_currency)) {
      return res.status(400).json({
        data: null,
        error: { message: 'display_currency must be a 3-letter currency code' },
      });
    }
    const prefs = await PreferencesDB.upsert(req.user!.id, { display_currency });
    const response: ApiResponse<UserPreferences> = { data: prefs, error: null };
    res.json(response);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ data: null, error: { message: 'Failed to update preferences' } });
  }
});

export default router;
