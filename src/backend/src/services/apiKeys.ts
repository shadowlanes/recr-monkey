import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { pool } from '../database';
import { ServiceError } from './errors';
import { parseOrThrow } from './subscriptions';

export const KEY_PREFIX = 'recr_';
const MAX_KEYS_PER_USER = 20;

export type KeyScope = 'read' | 'write';

export interface ApiKey {
  id: string;
  name: string;
  scope: KeyScope;
  key_hint: string;
  last_used_at: string | null;
  created_at: string;
}

const keyInput = z.object({
  name: z.string().trim().min(1, 'is required').max(60),
  scope: z.enum(['read', 'write']),
});

const COLUMNS = 'id, name, scope, key_hint, last_used_at, created_at';

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

export async function listKeys(userId: string): Promise<ApiKey[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

// The returned `key` is the only time the secret exists outside the caller.
export async function createKey(userId: string, raw: unknown): Promise<ApiKey & { key: string }> {
  const { name, scope } = parseOrThrow(keyInput, raw);

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM api_keys WHERE user_id = $1',
    [userId],
  );
  if (countRows[0].count >= MAX_KEYS_PER_USER) {
    throw new ServiceError(400, `You can have at most ${MAX_KEYS_PER_USER} API keys`);
  }

  const key = KEY_PREFIX + randomBytes(32).toString('base64url');
  const { rows } = await pool.query(
    `INSERT INTO api_keys (user_id, name, key_hash, key_hint, scope)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [userId, name, hashKey(key), key.slice(-4), scope],
  );
  return { ...rows[0], key };
}

export async function revokeKey(userId: string, id: string): Promise<void> {
  const { rowCount } = await pool.query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
  if (!rowCount) throw new ServiceError(404, 'API key not found');
}

export async function verifyKey(key: string): Promise<{ userId: string; scope: KeyScope } | null> {
  if (!key.startsWith(KEY_PREFIX)) return null;
  const { rows } = await pool.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1 RETURNING user_id, scope',
    [hashKey(key)],
  );
  return rows[0] ? { userId: rows[0].user_id, scope: rows[0].scope } : null;
}
