// Charge-date math for recurring payments. All dates are local.

import { Frequency } from './money';

export interface RecurringLike {
  start_date: string; // YYYY-MM-DD
  frequency: Frequency;
}

// Parse a YYYY-MM-DD string as a local date (no timezone shift).
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Add months, clamping to the last day of a shorter month
// (Jan 31 + 1 month = Feb 28/29), anchored to the original start day.
function addMonthsClamped(start: Date, months: number): Date {
  const targetMonth = start.getMonth() + months;
  const year = start.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(start.getDate(), lastDayOfMonth));
}

// First charge date on or after `from`.
export function nextChargeDate(payment: RecurringLike, from: Date = new Date()): Date {
  const start = parseDateOnly(payment.start_date);
  const fromDay = startOfDay(from);
  if (start >= fromDay) return start;

  switch (payment.frequency) {
    case 'weekly':
    case '4weeks': {
      const stepDays = payment.frequency === 'weekly' ? 7 : 28;
      const msPerDay = 24 * 60 * 60 * 1000;
      const elapsed = Math.floor((fromDay.getTime() - start.getTime()) / msPerDay);
      const steps = Math.ceil(elapsed / stepDays);
      const next = new Date(start);
      next.setDate(next.getDate() + steps * stepDays);
      return next;
    }
    case 'monthly': {
      let months =
        (fromDay.getFullYear() - start.getFullYear()) * 12 +
        (fromDay.getMonth() - start.getMonth());
      let next = addMonthsClamped(start, months);
      if (next < fromDay) next = addMonthsClamped(start, months + 1);
      return next;
    }
    case 'yearly': {
      let next = new Date(fromDay.getFullYear(), start.getMonth(), start.getDate());
      // Handle Feb 29 start dates in non-leap years
      if (next.getMonth() !== start.getMonth()) {
        next = new Date(fromDay.getFullYear(), start.getMonth() + 1, 0);
      }
      if (next < fromDay) {
        next = new Date(fromDay.getFullYear() + 1, start.getMonth(), start.getDate());
        if (next.getMonth() !== start.getMonth()) {
          next = new Date(fromDay.getFullYear() + 1, start.getMonth() + 1, 0);
        }
      }
      return next;
    }
  }
}

export interface UpcomingCharge<T extends RecurringLike> {
  payment: T;
  date: Date;
}

// Every charge in the window [from, from + days], sorted by date.
// A weekly payment can appear multiple times.
export function upcomingCharges<T extends RecurringLike>(
  payments: T[],
  days: number,
  from: Date = new Date(),
): UpcomingCharge<T>[] {
  const fromDay = startOfDay(from);
  const limit = new Date(fromDay);
  limit.setDate(limit.getDate() + days);

  const out: UpcomingCharge<T>[] = [];
  for (const payment of payments) {
    let date = nextChargeDate(payment, fromDay);
    while (date <= limit) {
      out.push({ payment, date });
      date = nextChargeDate(payment, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
