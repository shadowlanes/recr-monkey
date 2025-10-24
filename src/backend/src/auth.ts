import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth-config';

const router = Router();

// Mount better-auth handler for all auth routes
// This handles: /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/sign-in/google, etc.
router.all('/*', toNodeHandler(auth));

export default router;
