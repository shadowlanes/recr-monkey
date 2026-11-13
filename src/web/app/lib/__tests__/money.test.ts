import { convert, monthlyAmount, formatMoney, Rates } from '../money';

const rates: Rates = {
  base: 'USD',
  rates: { USD: 1, INR: 88, AED: 3.67, EUR: 0.9 },
  fetched_at: new Date().toISOString(),
};

describe('convert', () => {
  it('returns the amount unchanged for same-currency conversion', () => {
    expect(convert(100, 'INR', 'INR', rates)).toBe(100);
  });

  it('converts INR to USD', () => {
    expect(convert(880, 'INR', 'USD', rates)).toBeCloseTo(10);
  });

  it('converts USD to INR', () => {
    expect(convert(20, 'USD', 'INR', rates)).toBeCloseTo(1760);
  });

  it('converts between two non-USD currencies via USD', () => {
    // 36.7 AED = 10 USD = 880 INR
    expect(convert(36.7, 'AED', 'INR', rates)).toBeCloseTo(880);
  });

  it('returns the amount unchanged when a rate is missing', () => {
    expect(convert(50, 'XYZ', 'INR', rates)).toBe(50);
  });
});

describe('monthlyAmount', () => {
  it('passes monthly amounts through', () => {
    expect(monthlyAmount(649, 'monthly')).toBe(649);
  });

  it('normalizes weekly as 52 charges across 12 months', () => {
    expect(monthlyAmount(12, 'weekly')).toBeCloseTo(52);
  });

  it('normalizes 4weeks as 13 charges across 12 months', () => {
    expect(monthlyAmount(12, '4weeks')).toBeCloseTo(13);
  });

  it('normalizes yearly as one charge across 12 months', () => {
    expect(monthlyAmount(1200, 'yearly')).toBe(100);
  });
});

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR', () => {
    expect(formatMoney(28000, 'INR')).toBe('₹28,000');
  });

  it('keeps cents on small amounts', () => {
    expect(formatMoney(9.99, 'USD')).toBe('$9.99');
  });

  it('drops cents on large amounts', () => {
    expect(formatMoney(1760, 'USD')).toBe('$1,760');
  });
});
