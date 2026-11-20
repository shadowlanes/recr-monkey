import express, { Router } from 'express';
import { auth } from './auth-config';

// LOCAL DEV ONLY. Any email/password "signs in": the user is auto-created on
// first use, then signed in with a fixed internal password so the supplied
// password is ignored. Enabled only when DEV_AUTH_BYPASS=true and
// NODE_ENV !== 'production'. Never set DEV_AUTH_BYPASS in deployed envs.
export const devAuthEnabled =
  process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production';

export const DEV_PASSWORD = 'dev-bypass-password-not-secret';

const router = Router();

// Parses its own body: this router is mounted ahead of the global JSON parser.
router.post('/dev-login', express.json(), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim() || email.split('@')[0] || 'Dev User';
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Create the user if missing; ignore "already exists".
    try {
      await auth.api.signUpEmail({ body: { email, password: DEV_PASSWORD, name } });
    } catch {
      // exists already
    }

    const response = await auth.api.signInEmail({
      body: { email, password: DEV_PASSWORD },
      asResponse: true,
    });

    response.headers.getSetCookie().forEach((c) => res.append('Set-Cookie', c));
    res.status(response.status).json(await response.json());
  } catch (error) {
    console.error('dev-login failed:', error);
    res.status(500).json({
      message:
        'Dev login failed (a user created with a real password via normal sign-up cannot use dev login)',
    });
  }
});

export default router;
