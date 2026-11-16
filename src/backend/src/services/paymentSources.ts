import { z } from 'zod';
import { PaymentSourcesDB } from '../db-operations';
import { PaymentSource } from '../types';
import { ServiceError } from './errors';
import { parseOrThrow } from './subscriptions';

export const sourceInput = z.object({
  name: z.string().trim().min(1, 'is required').max(100),
  type: z.enum(['bank_account', 'debit_card', 'credit_card']),
  identifier: z.string().trim().max(20).default(''),
});

export async function listSources(userId: string): Promise<PaymentSource[]> {
  return PaymentSourcesDB.getAll(userId);
}

export async function createSource(userId: string, raw: unknown): Promise<PaymentSource> {
  return PaymentSourcesDB.create(userId, parseOrThrow(sourceInput, raw));
}

export async function updateSource(userId: string, id: string, raw: unknown): Promise<PaymentSource> {
  const updated = await PaymentSourcesDB.update(id, userId, parseOrThrow(sourceInput, raw));
  if (!updated) throw new ServiceError(404, 'Payment source not found');
  return updated;
}

// Recurring payments keep working when their source is deleted:
// the FK is ON DELETE SET NULL, so they are detached, not removed.
export async function deleteSource(userId: string, id: string): Promise<void> {
  const deleted = await PaymentSourcesDB.delete(id, userId);
  if (!deleted) throw new ServiceError(404, 'Payment source not found');
}
