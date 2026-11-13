// Pure money utilities: conversion, normalization, formatting.
// Rates are USD-based: rates[CUR] = units of CUR per 1 USD.

export type Frequency = 'weekly' | 'monthly' | '4weeks' | 'yearly';

export interface Rates {
  base: 'USD';
  rates: Record<string, number>;
  fetched_at: string;
}

export const SUPPORTED_CURRENCIES = ['USD', 'INR', 'AED', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;

export const DISPLAY_CURRENCIES = ['INR', 'USD', 'AED'] as const;

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  '4weeks': 'Every 4 weeks',
  yearly: 'Yearly',
};

export const FREQUENCY_SHORT: Record<Frequency, string> = {
  weekly: 'wk',
  monthly: 'mo',
  '4weeks': '4wk',
  yearly: 'yr',
};

export function convert(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const fromRate = rates.rates[from];
  const toRate = rates.rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

// Normalize a billed amount to its monthly equivalent.
export function monthlyAmount(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case '4weeks':
      return (amount * 13) / 12;
    case 'yearly':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
}

const CURRENCY_LOCALE: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  AED: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

export function formatMoney(amount: number, currency: string): string {
  const digits = Math.abs(amount) >= 100 ? 0 : 2;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}
