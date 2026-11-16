// DUPLICATED between src/web/app/lib and src/backend/src/lib.
// Change both copies together; both have unit tests.
// Pure money utilities: conversion and normalization.
// Rates are USD-based: rates[CUR] = units of CUR per 1 USD.

export type Frequency = 'weekly' | 'monthly' | '4weeks' | 'yearly';

export interface Rates {
  base: 'USD';
  rates: Record<string, number>;
  fetched_at: string;
}

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
