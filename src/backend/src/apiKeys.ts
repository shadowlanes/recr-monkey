import { Router, Request, Response } from 'express';
import { requireSession } from './middleware';
import { sendError } from './http';
import { createKey, listKeys, revokeKey } from './services/apiKeys';

const router = Router();

router.use(requireSession);

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ data: await listKeys(req.user!.id), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to list API keys');
  }
});

// The response is the only time the full key is returned.
router.post('/', async (req: Request, res: Response) => {
  try {
    res.json({ data: await createKey(req.user!.id, req.body), error: null });
  } catch (error) {
    sendError(res, error, 'Failed to create API key');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await revokeKey(req.user!.id, req.params.id);
    res.json({ data: null, error: null });
  } catch (error) {
    sendError(res, error, 'Failed to revoke API key');
  }
});

export default router;
