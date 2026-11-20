import { Response } from 'express';
import { ServiceError } from './services/errors';

export function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ data: null, error: { message: error.message } });
  }
  console.error(fallback, error);
  return res.status(500).json({ data: null, error: { message: fallback } });
}
