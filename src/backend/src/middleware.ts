import { Request, Response, NextFunction } from 'express';
import { Principal, resolvePrincipal } from './principal';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      principal?: Principal;
    }
  }
}

const deny = (res: Response, status: number, message: string) =>
  res.status(status).json({ data: null, error: { message } });

async function authenticate(req: Request, res: Response): Promise<Principal | null> {
  try {
    const principal = await resolvePrincipal(req.headers);
    if (!principal) {
      deny(res, 401, 'Unauthorized - Please sign in');
      return null;
    }
    req.principal = principal;
    req.user = { id: principal.userId };
    return principal;
  } catch (error) {
    console.error('Auth middleware error:', error);
    deny(res, 401, 'Unauthorized - Invalid session');
    return null;
  }
}

// Session cookie, API key or OAuth token. Read-only keys cannot mutate.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const principal = await authenticate(req, res);
  if (!principal) return;
  const readOnlyMethod = req.method === 'GET' || req.method === 'HEAD';
  if (!readOnlyMethod && !principal.canWrite) {
    return deny(res, 403, 'This API key is read-only');
  }
  next();
}

// Browser session only: for managing credentials, which a key or token must
// never be able to do for itself.
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const principal = await authenticate(req, res);
  if (!principal) return;
  if (principal.via !== 'session') {
    return deny(res, 403, 'This action requires signing in to the web app');
  }
  next();
}
