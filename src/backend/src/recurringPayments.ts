import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware';
import { sendError } from './http';
import {
  createSubscription,
  deleteSubscription,
  hasSubscriptions,
  listSubscriptions,
  replaceSubscription,
  spendSummary,
  upcomingCharges,
} from './services/subscriptions';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ data: await listSubscriptions(req.user!.id), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to get recurring payments');
  }
});

// Fixed paths must stay above the '/:id' routes.
router.get('/check', async (req: Request, res: Response) => {
  try {
    const hasPayments = await hasSubscriptions(req.user!.id);
    // Dummy row keeps the shape the frontend expects.
    res.json({ data: hasPayments ? [{ id: 'dummy' }] : [], error: null });
  } catch (error) {
    sendError(res, error, 'Failed to check recurring payments');
  }
});

// Charges due in the next ?days= (default 30), with display-currency totals.
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const days = req.query.days === undefined ? 30 : Number(req.query.days);
    res.json({ data: await upcomingCharges(req.user!.id, days), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to get upcoming charges');
  }
});

// Monthly/yearly spend in the display currency, by category.
router.get('/summary', async (req: Request, res: Response) => {
  try {
    res.json({ data: await spendSummary(req.user!.id), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to get spend summary');
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const via = req.principal?.via === 'session' ? 'web' : 'api';
    const created = await createSubscription(req.user!.id, req.body, via);
    res.json({ data: [created], error: null });
  } catch (error) {
    sendError(res, error, 'Failed to create recurring payment');
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await replaceSubscription(req.user!.id, req.params.id, req.body);
    res.json({ data: [updated], error: null });
  } catch (error) {
    sendError(res, error, 'Failed to update recurring payment');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteSubscription(req.user!.id, req.params.id);
    res.json({ data: null, error: null });
  } catch (error) {
    sendError(res, error, 'Failed to delete recurring payment');
  }
});

export default router;
