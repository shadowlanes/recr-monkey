import { z } from 'zod';
import { PaymentSourcesDB, PreferencesDB, RecurringPaymentsDB } from '../db-operations';
import { RecurringPayment } from '../types';
import { convert, monthlyAmount } from '../lib/money';
import { upcomingCharges as chargesInWindow, startOfDay } from '../lib/upcoming';
import { getRates } from '../rates';
import { ServiceError } from './errors';

export type CreatedVia = RecurringPayment['created_via'];

const frequency = z.enum(['weekly', 'monthly', '4weeks', 'yearly']);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine((value) => {
    // Reject impossible dates such as 2026-02-30, which Date would roll over.
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, 'is not a real date');

export const subscriptionInput = z.object({
  name: z.string().trim().min(1, 'is required').max(200),
  amount: z.coerce.number().positive('must be greater than 0'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'must be a 3-letter currency code'),
  frequency,
  start_date: dateOnly,
  payment_source_id: z
    .string()
    .nullish()
    .transform((value) => value || null),
  category: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((value) => value || null),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;

// A patch only carries the fields being changed, so no transform may invent
// a value for an absent key.
export const subscriptionPatch = subscriptionInput.partial();

export function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue.path.join('.');
  throw new ServiceError(400, field ? `${field}: ${issue.message}` : issue.message);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// Local calendar date, never toISOString() (that shifts the day off-UTC).
export function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function assertOwnsSource(userId: string, sourceId: string | null) {
  if (sourceId && !(await PaymentSourcesDB.exists(sourceId, userId))) {
    throw new ServiceError(400, 'payment_source_id not found');
  }
}

export async function listSubscriptions(userId: string): Promise<RecurringPayment[]> {
  return RecurringPaymentsDB.getAll(userId);
}

export async function hasSubscriptions(userId: string): Promise<boolean> {
  return RecurringPaymentsDB.checkExists(userId);
}

export async function getSubscription(userId: string, id: string): Promise<RecurringPayment> {
  const row = await RecurringPaymentsDB.getById(id, userId);
  if (!row) throw new ServiceError(404, 'Subscription not found');
  return row;
}

export async function createSubscription(
  userId: string,
  raw: unknown,
  via: CreatedVia,
): Promise<RecurringPayment> {
  const input = parseOrThrow(subscriptionInput, raw);
  await assertOwnsSource(userId, input.payment_source_id);
  return RecurringPaymentsDB.create(userId, { ...input, created_via: via });
}

// Full replace: every field is required (REST PUT).
export async function replaceSubscription(
  userId: string,
  id: string,
  raw: unknown,
): Promise<RecurringPayment> {
  const input = parseOrThrow(subscriptionInput, raw);
  await getSubscription(userId, id);
  await assertOwnsSource(userId, input.payment_source_id);
  const updated = await RecurringPaymentsDB.update(id, userId, input);
  if (!updated) throw new ServiceError(404, 'Subscription not found');
  return updated;
}

// Partial update: only the supplied fields change.
export async function updateSubscription(
  userId: string,
  id: string,
  rawPatch: unknown,
): Promise<RecurringPayment> {
  const existing = await getSubscription(userId, id);
  const supplied = Object.fromEntries(
    Object.entries((rawPatch ?? {}) as Record<string, unknown>).filter(
      ([, value]) => value !== undefined,
    ),
  );
  const patch = parseOrThrow(subscriptionPatch, supplied);
  // Keep only keys the caller actually sent; zod transforms can add nulls.
  const changes = Object.fromEntries(
    Object.entries(patch).filter(([key]) => key in supplied),
  ) as Partial<SubscriptionInput>;

  const merged: SubscriptionInput = {
    name: existing.name,
    amount: existing.amount,
    currency: existing.currency,
    frequency: existing.frequency,
    start_date: existing.start_date,
    payment_source_id: existing.payment_source_id,
    category: existing.category,
    ...changes,
  };
  if ('payment_source_id' in changes) {
    await assertOwnsSource(userId, merged.payment_source_id);
  }
  const updated = await RecurringPaymentsDB.update(id, userId, merged);
  if (!updated) throw new ServiceError(404, 'Subscription not found');
  return updated;
}

export async function deleteSubscription(userId: string, id: string): Promise<void> {
  const deleted = await RecurringPaymentsDB.delete(id, userId);
  if (!deleted) throw new ServiceError(404, 'Subscription not found');
}

export interface UpcomingResult {
  from: string;
  to: string;
  display_currency: string;
  total_in_display_currency: number;
  charges: Array<{
    date: string;
    subscription_id: string;
    name: string;
    amount: number;
    currency: string;
    amount_in_display_currency: number;
    category: string | null;
  }>;
}

export async function upcomingCharges(userId: string, days: number = 30): Promise<UpcomingResult> {
  const window = Math.min(365, Math.max(1, Math.floor(Number(days)) || 30));
  const [payments, prefs, rates] = await Promise.all([
    RecurringPaymentsDB.getAll(userId),
    PreferencesDB.get(userId),
    getRates(),
  ]);
  const display = prefs.display_currency;
  const from = startOfDay(new Date());
  const to = new Date(from);
  to.setDate(to.getDate() + window);

  const charges = chargesInWindow(payments, window, from).map(({ payment, date }) => ({
    date: formatDateOnly(date),
    subscription_id: payment.id,
    name: payment.name,
    amount: payment.amount,
    currency: payment.currency,
    amount_in_display_currency: round2(convert(payment.amount, payment.currency, display, rates)),
    category: payment.category,
  }));

  return {
    from: formatDateOnly(from),
    to: formatDateOnly(to),
    display_currency: display,
    total_in_display_currency: round2(
      charges.reduce((sum, charge) => sum + charge.amount_in_display_currency, 0),
    ),
    charges,
  };
}

export interface SummaryResult {
  display_currency: string;
  subscription_count: number;
  monthly_total: number;
  yearly_total: number;
  by_category: Array<{ category: string; monthly_total: number; count: number }>;
  rates_fetched_at: string;
}

export async function spendSummary(userId: string): Promise<SummaryResult> {
  const [payments, prefs, rates] = await Promise.all([
    RecurringPaymentsDB.getAll(userId),
    PreferencesDB.get(userId),
    getRates(),
  ]);
  const display = prefs.display_currency;

  let monthly = 0;
  const categories = new Map<string, { monthly_total: number; count: number }>();
  for (const payment of payments) {
    const value = convert(
      monthlyAmount(payment.amount, payment.frequency),
      payment.currency,
      display,
      rates,
    );
    monthly += value;
    const key = payment.category || 'Other';
    const entry = categories.get(key) || { monthly_total: 0, count: 0 };
    entry.monthly_total += value;
    entry.count += 1;
    categories.set(key, entry);
  }

  return {
    display_currency: display,
    subscription_count: payments.length,
    monthly_total: round2(monthly),
    yearly_total: round2(monthly * 12),
    by_category: [...categories.entries()]
      .map(([category, entry]) => ({
        category,
        monthly_total: round2(entry.monthly_total),
        count: entry.count,
      }))
      .sort((a, b) => b.monthly_total - a.monthly_total),
    rates_fetched_at: rates.fetched_at,
  };
}
