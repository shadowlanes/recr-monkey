import { Request, Response, NextFunction } from 'express';
import { auth } from './auth-config';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        image?: string | null;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

// Middleware to verify session and attach user to request
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user) {
      return res.status(401).json({
        data: null,
        error: { message: 'Unauthorized - Please sign in' }
      });
    }

    // Attach user to request
    req.user = session.user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      data: null,
      error: { message: 'Unauthorized - Invalid session' }
    });
  }
}

// Optional auth middleware - doesn't fail if no session
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (session?.user) {
      req.user = session.user;
    }
    next();
  } catch (error) {
    // Silently fail, user just won't be attached
    next();
  }
}
