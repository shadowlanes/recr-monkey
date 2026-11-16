import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextChargeDate, upcomingCharges, parseDateOnly } from './upcoming';
import { Frequency } from './money';
const payment = (start_date: string, frequency: Frequency) => ({ start_date, frequency });

describe('parseDateOnly', () => {
  it('parses as a local date without timezone shift', () => {
    const date = parseDateOnly('2026-11-13');
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 10);
    assert.equal(date.getDate(), 13);
  });
});

describe('nextChargeDate', () => {
  const from = new Date(2026, 10, 13); // 13 Nov 2026

  it('returns a future start date as-is', () => {
    const next = nextChargeDate(payment('2026-12-01', 'monthly'), from);
    assert.deepEqual(next, new Date(2026, 11, 1));
  });

  it('returns today when a charge lands today', () => {
    const next = nextChargeDate(payment('2026-10-13', 'monthly'), from);
    assert.deepEqual(next, new Date(2026, 10, 13));
  });

  it('advances weekly payments by 7-day steps from the start date', () => {
    // Started Mon 2 Nov 2026; from Fri 13 Nov the next is Mon 16 Nov
    const next = nextChargeDate(payment('2026-11-02', 'weekly'), from);
    assert.deepEqual(next, new Date(2026, 10, 16));
  });

  it('advances 4weeks payments by 28-day steps', () => {
    // Started 1 Nov 2026; next after 13 Nov is 29 Nov
    const next = nextChargeDate(payment('2026-11-01', '4weeks'), from);
    assert.deepEqual(next, new Date(2026, 10, 29));
  });

  it('keeps the day-of-month for monthly payments', () => {
    const next = nextChargeDate(payment('2025-01-20', 'monthly'), from);
    assert.deepEqual(next, new Date(2026, 10, 20));
  });

  it('clamps monthly day 31 to shorter months without drifting', () => {
    // Started 31 Jan; from 13 Feb 2026 the next charge is 28 Feb
    const next = nextChargeDate(payment('2026-01-31', 'monthly'), new Date(2026, 1, 13));
    assert.deepEqual(next, new Date(2026, 1, 28));
    // ...and the month after, it returns to the 31st
    const after = nextChargeDate(payment('2026-01-31', 'monthly'), new Date(2026, 2, 1));
    assert.deepEqual(after, new Date(2026, 2, 31));
  });

  it('handles yearly payments across year boundaries', () => {
    const next = nextChargeDate(payment('2024-03-12', 'yearly'), from);
    assert.deepEqual(next, new Date(2027, 2, 12));
  });

  it('handles yearly Feb 29 start dates in non-leap years', () => {
    const next = nextChargeDate(payment('2024-02-29', 'yearly'), new Date(2026, 0, 1));
    assert.deepEqual(next, new Date(2026, 1, 28));
  });
});

describe('upcomingCharges', () => {
  const from = new Date(2026, 10, 13);

  it('collects charges inside the window, sorted by date', () => {
    const charges = upcomingCharges(
      [payment('2026-11-20', 'monthly'), payment('2026-11-15', 'monthly')],
      30,
      from,
    );
    assert.deepEqual(charges.map(c => c.date.getDate()), [15, 20]);
  });

  it('includes a weekly payment multiple times in a 30-day window', () => {
    const charges = upcomingCharges([payment('2026-11-02', 'weekly')], 30, from);
    assert.ok(charges.length >= 4);
  });

  it('excludes payments whose next charge is beyond the window', () => {
    const charges = upcomingCharges([payment('2027-03-01', 'yearly')], 30, from);
    assert.equal(charges.length, 0);
  });

  it('includes charges on the window boundary day', () => {
    const charges = upcomingCharges([payment('2026-12-13', 'monthly')], 30, from);
    assert.equal(charges.length, 1);
  });
});
