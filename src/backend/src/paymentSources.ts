import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware';
import { sendError } from './http';
import { createSource, deleteSource, listSources, updateSource } from './services/paymentSources';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ data: await listSources(req.user!.id), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to get payment sources');
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    res.json({ data: [await createSource(req.user!.id, req.body)], error: null });
  } catch (error) {
    sendError(res, error, 'Failed to create payment source');
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    res.json({ data: [await updateSource(req.user!.id, req.params.id, req.body)], error: null });
  } catch (error) {
    sendError(res, error, 'Failed to update payment source');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteSource(req.user!.id, req.params.id);
    res.json({ data: null, error: null });
  } catch (error) {
    sendError(res, error, 'Failed to delete payment source');
  }
});

export default router;
