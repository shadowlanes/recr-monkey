import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionInput, subscriptionPatch, parseOrThrow, formatDateOnly } from './subscriptions';
import { ServiceError } from './errors';

const valid = {
  name: 'Netflix',
  amount: 649,
  currency: 'INR',
  frequency: 'monthly',
  start_date: '2026-11-13',
};

describe('subscriptionInput', () => {
  it('accepts a minimal valid subscription', () => {
    const parsed = subscriptionInput.parse(valid);
    assert.equal(parsed.name, 'Netflix');
    assert.equal(parsed.payment_source_id, null);
    assert.equal(parsed.category, null);
  });

  it('uppercases the currency and trims the name', () => {
    const parsed = subscriptionInput.parse({ ...valid, currency: 'usd', name: '  Spotify ' });
    assert.equal(parsed.currency, 'USD');
    assert.equal(parsed.name, 'Spotify');
  });

  it('coerces a numeric string amount', () => {
    assert.equal(subscriptionInput.parse({ ...valid, amount: '9.99' }).amount, 9.99);
  });

  it('turns empty optional strings into null', () => {
    const parsed = subscriptionInput.parse({ ...valid, category: '', payment_source_id: '' });
    assert.equal(parsed.category, null);
    assert.equal(parsed.payment_source_id, null);
  });

  for (const [label, override] of [
    ['a zero amount', { amount: 0 }],
    ['a negative amount', { amount: -5 }],
    ['an unknown frequency', { frequency: 'daily' }],
    ['a malformed date', { start_date: '13/11/2026' }],
    ['an impossible date', { start_date: '2026-13-40' }],
    ['a rolled-over date', { start_date: '2026-02-30' }],
    ['an empty name', { name: '   ' }],
    ['a bad currency', { currency: 'RUPEES' }],
  ] as const) {
    it(`rejects ${label}`, () => {
      assert.equal(subscriptionInput.safeParse({ ...valid, ...override }).success, false);
    });
  }
});

describe('subscriptionPatch', () => {
  it('accepts a single field', () => {
    assert.equal(subscriptionPatch.parse({ amount: 10 }).amount, 10);
  });

  it('still validates the fields it is given', () => {
    assert.equal(subscriptionPatch.safeParse({ frequency: 'daily' }).success, false);
  });
});

describe('parseOrThrow', () => {
  it('throws a 400 ServiceError naming the field', () => {
    assert.throws(
      () => parseOrThrow(subscriptionInput, { ...valid, amount: 0 }),
      (error: unknown) =>
        error instanceof ServiceError && error.status === 400 && error.message.startsWith('amount:'),
    );
  });
});

describe('formatDateOnly', () => {
  it('formats local calendar parts with zero padding', () => {
    assert.equal(formatDateOnly(new Date(2026, 0, 5)), '2026-01-05');
  });
});
