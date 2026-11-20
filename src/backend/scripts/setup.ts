/*
 * Local dummy data: `npm run setup` (NODE_ENV=local only).
 *
 * Creates (or reuses) the dev-login user and gives it the subscriptions shown
 * in the "Soft Pastel Overview" mockup. Idempotent: payment sources and
 * subscriptions are matched by name for that user and updated in place, never
 * duplicated, so running it again just restores the seed values. Entries the
 * user added that are not in the seed are left alone.
 *
 *   NODE_ENV=local npm run setup
 *   NODE_ENV=local SETUP_EMAIL=someone@example.com npm run setup
 */
import { pool } from '../src/database';
import { auth } from '../src/auth-config';
import { DEV_PASSWORD } from '../src/dev-auth';
import { createSource, listSources, updateSource } from '../src/services/paymentSources';
import {
  createSubscription,
  listSubscriptions,
  updateSubscription,
} from '../src/services/subscriptions';

if (process.env.NODE_ENV !== 'local') {
  console.error(
    `Refusing to run: setup only works with NODE_ENV=local (got ${process.env.NODE_ENV ?? 'unset'}).`,
  );
  process.exit(1);
}

const EMAIL = (process.env.SETUP_EMAIL || 'user@example.com').trim().toLowerCase();

const SOURCES = [
  { name: 'HDFC Regalia', type: 'credit_card', identifier: '4821' },
  { name: 'ICICI Savings', type: 'bank_account', identifier: '0193' },
] as const;

type SourceName = (typeof SOURCES)[number]['name'];

// Start dates are fixed, so the mockup's agenda (20 Nov 2026 → 15 Dec 2026)
// lines up exactly when viewed on 20 Nov 2026; later dates roll forward.
const SUBSCRIPTIONS: Array<{
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
  category: string;
  start_date: string;
  source: SourceName;
}> = [
  { name: 'Spotify', amount: 119, currency: 'INR', frequency: 'monthly', category: 'Entertainment', start_date: '2026-01-20', source: 'HDFC Regalia' },
  { name: 'Netflix', amount: 649, currency: 'INR', frequency: 'monthly', category: 'Entertainment', start_date: '2025-08-22', source: 'HDFC Regalia' },
  { name: 'ChatGPT Plus', amount: 20, currency: 'USD', frequency: 'monthly', category: 'Subscription', start_date: '2025-03-24', source: 'HDFC Regalia' },
  { name: 'Airtel Fiber', amount: 1178, currency: 'INR', frequency: 'monthly', category: 'Utilities', start_date: '2024-06-27', source: 'ICICI Savings' },
  { name: 'Rent', amount: 28000, currency: 'INR', frequency: 'monthly', category: 'Housing', start_date: '2023-04-01', source: 'ICICI Savings' },
  { name: 'Cult.fit', amount: 1500, currency: 'INR', frequency: 'monthly', category: 'Health', start_date: '2026-02-03', source: 'HDFC Regalia' },
  { name: 'iCloud+', amount: 2.99, currency: 'USD', frequency: 'monthly', category: 'Subscription', start_date: '2025-12-08', source: 'HDFC Regalia' },
  { name: 'Car insurance', amount: 14200, currency: 'INR', frequency: 'yearly', category: 'Insurance', start_date: '2024-12-15', source: 'ICICI Savings' },
];

async function ensureUser(email: string): Promise<string> {
  const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
  if (existing.rows[0]) return existing.rows[0].id;
  // Same password dev-login uses, so this account can sign in through it.
  const result = await auth.api.signUpEmail({
    body: { email, password: DEV_PASSWORD, name: email.split('@')[0] },
  });
  return result.user.id;
}

async function main() {
  const userId = await ensureUser(EMAIL);
  const counts = { created: 0, updated: 0 };

  const sourceIds = new Map<string, string>();
  const existingSources = await listSources(userId);
  for (const seed of SOURCES) {
    const match = existingSources.find((s) => s.name === seed.name);
    const source = match
      ? await updateSource(userId, match.id, seed)
      : await createSource(userId, seed);
    counts[match ? 'updated' : 'created']++;
    sourceIds.set(seed.name, source.id);
  }

  const existingSubs = await listSubscriptions(userId);
  for (const { source, ...seed } of SUBSCRIPTIONS) {
    const body = { ...seed, payment_source_id: sourceIds.get(source) };
    const match = existingSubs.find((s) => s.name === seed.name);
    if (match) await updateSubscription(userId, match.id, body);
    else await createSubscription(userId, body, 'api');
    counts[match ? 'updated' : 'created']++;
  }

  console.log(
    `Setup done for ${EMAIL}: ${counts.created} created, ${counts.updated} updated ` +
      `(${SOURCES.length} payment sources, ${SUBSCRIPTIONS.length} subscriptions).`,
  );
}

main()
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    // better-auth holds its own pg pool; don't wait for its idle timeout.
    process.exit(process.exitCode ?? 0);
  });
