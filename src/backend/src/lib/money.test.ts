import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convert, monthlyAmount, Rates } from './money';
const rates: Rates = {
  base: 'USD',
  rates: { USD: 1, INR: 88, AED: 3.67, EUR: 0.9 },
  fetched_at: new Date().toISOString(),
};

describe('convert', () => {
  it('returns the amount unchanged for same-currency conversion', () => {
    assert.equal(convert(100, 'INR', 'INR', rates), 100);
  });

  it('converts INR to USD', () => {
    assert.ok(Math.abs(convert(880, 'INR', 'USD', rates) - 10) < 0.005);
  });

  it('converts USD to INR', () => {
    assert.ok(Math.abs(convert(20, 'USD', 'INR', rates) - 1760) < 0.005);
  });

  it('converts between two non-USD currencies via USD', () => {
    // 36.7 AED = 10 USD = 880 INR
    assert.ok(Math.abs(convert(36.7, 'AED', 'INR', rates) - 880) < 0.005);
  });

  it('returns the amount unchanged when a rate is missing', () => {
    assert.equal(convert(50, 'XYZ', 'INR', rates), 50);
  });
});

describe('monthlyAmount', () => {
  it('passes monthly amounts through', () => {
    assert.equal(monthlyAmount(649, 'monthly'), 649);
  });

  it('normalizes weekly as 52 charges across 12 months', () => {
    assert.ok(Math.abs(monthlyAmount(12, 'weekly') - 52) < 0.005);
  });

  it('normalizes 4weeks as 13 charges across 12 months', () => {
    assert.ok(Math.abs(monthlyAmount(12, '4weeks') - 13) < 0.005);
  });

  it('normalizes yearly as one charge across 12 months', () => {
    assert.equal(monthlyAmount(1200, 'yearly'), 100);
  });
});
