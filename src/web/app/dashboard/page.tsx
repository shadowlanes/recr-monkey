'use client';

import { useMemo } from 'react';
import { useData } from '../contexts/data-context';
import { useSettings } from '../contexts/settings-context';
import { usePaymentDialog } from './payment-dialog';
import { convert, monthlyAmount, formatMoney, FREQUENCY_LABEL } from '../lib/money';
import { upcomingCharges, startOfDay } from '../lib/upcoming';
import { categoryColor, categoryInk, categoryLabel, categorySoft } from '../lib/categories';
import DateTile from '../components/ui/date-tile';
import EmptyState from '../components/ui/empty-state';
import Button from '../components/ui/button';
import LoadingAnimation from '../components/loading-animation';

export default function Overview() {
  const { recurringPayments, isLoading, error } = useData();
  const { rates, displayCurrency } = useSettings();
  const { openAdd, openEdit } = usePaymentDialog();

  const today = startOfDay(new Date());

  // Monthly total in the display currency
  const monthlyTotal = useMemo(() => {
    if (!rates) return null;
    return recurringPayments.reduce(
      (total, payment) =>
        total + convert(monthlyAmount(payment.amount, payment.frequency), payment.currency, displayCurrency, rates),
      0,
    );
  }, [recurringPayments, rates, displayCurrency]);

  // Native monthly subtotals per billing currency, largest first
  const perCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of recurringPayments) {
      const monthly = monthlyAmount(payment.amount, payment.frequency);
      totals.set(payment.currency, (totals.get(payment.currency) || 0) + monthly);
    }
    const entries = [...totals.entries()];
    if (rates) {
      entries.sort(
        (a, b) => convert(b[1], b[0], 'USD', rates) - convert(a[1], a[0], 'USD', rates),
      );
    }
    return entries;
  }, [recurringPayments, rates]);

  const charges = useMemo(
    () => upcomingCharges(recurringPayments, 30, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recurringPayments],
  );

  const chargesTotal = useMemo(() => {
    if (!rates) return null;
    return charges.reduce(
      (total, charge) =>
        total + convert(charge.payment.amount, charge.payment.currency, displayCurrency, rates),
      0,
    );
  }, [charges, rates, displayCurrency]);

  // Category breakdown of the monthly total
  const categories = useMemo(() => {
    if (!rates) return [];
    const totals = new Map<string, number>();
    for (const payment of recurringPayments) {
      const monthly = convert(
        monthlyAmount(payment.amount, payment.frequency),
        payment.currency,
        displayCurrency,
        rates,
      );
      const key = categoryLabel(payment.category);
      totals.set(key, (totals.get(key) || 0) + monthly);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [recurringPayments, rates, displayCurrency]);
  const categoriesSum = categories.reduce((sum, [, amount]) => sum + amount, 0);

  // The biggest yearly renewal in the window: easy to forget, worth a heads-up
  const bigRenewal = useMemo(() => {
    if (!rates || chargesTotal === null || chargesTotal <= 0) return null;
    let best: { charge: (typeof charges)[number]; converted: number } | null = null;
    for (const charge of charges) {
      if (charge.payment.frequency !== 'yearly') continue;
      const converted = convert(charge.payment.amount, charge.payment.currency, displayCurrency, rates);
      if (!best || converted > best.converted) best = { charge, converted };
    }
    return best ? { ...best, share: Math.round((best.converted / chargesTotal) * 100) } : null;
  }, [charges, chargesTotal, rates, displayCurrency]);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <LoadingAnimation size="large" />
      </div>
    );
  }

  if (recurringPayments.length === 0) {
    return (
      <EmptyState
        title="Nothing tracked yet"
        message="Add your first subscription — a name and an amount is all it takes. Rent, Netflix, insurance: anything that charges you on a schedule."
        action={<Button onClick={openAdd}>Add your first subscription</Button>}
      />
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
          {error}
        </p>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[32px] bg-hero px-11 py-10 mb-7 flex flex-wrap items-end gap-7 max-sm:px-6 max-sm:py-7">
        <span aria-hidden className="pointer-events-none absolute w-[260px] h-[260px] rounded-full bg-blob-1 -right-[60px] -top-[90px]" />
        <span aria-hidden className="pointer-events-none absolute w-[150px] h-[150px] rounded-full bg-blob-2 right-[150px] -bottom-[70px]" />
        <span aria-hidden className="pointer-events-none absolute w-[70px] h-[70px] rounded-full bg-blob-3 right-[120px] top-10 max-sm:hidden" />

        <div className="relative flex-[999_1_420px] min-w-0">
          <p className="font-semibold text-[15px] text-ink-soft mb-2.5">Hey! You spend about</p>
          <p className="font-display font-extrabold tnum leading-[0.95] tracking-[-0.035em] text-[clamp(44px,8vw,84px)]">
            {monthlyTotal === null ? '…' : formatMoney(monthlyTotal, displayCurrency)}
            <span className="font-sans font-semibold text-[clamp(15px,2vw,20px)] tracking-normal text-ink-soft ml-2.5">
              a month
            </span>
          </p>
          <p className="text-[15px] text-ink-soft mt-4">
            That&apos;s{' '}
            <b className="font-mono font-medium tnum text-ink">
              {monthlyTotal === null ? '…' : formatMoney(monthlyTotal * 12, displayCurrency)}
            </b>{' '}
            a year across <b className="font-mono font-medium tnum text-ink">{recurringPayments.length}</b>{' '}
            subscription{recurringPayments.length === 1 ? '' : 's'}.
          </p>
          {perCurrency.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="text-[13px] text-ink-soft font-medium">billed as</span>
              {perCurrency.map(([currency, amount]) => (
                <span
                  key={currency}
                  className="rounded-full bg-hero-chip px-3.5 py-1.5 font-mono tnum text-[13px]"
                >
                  {formatMoney(amount, currency)}/mo
                </span>
              ))}
            </div>
          )}
        </div>

        {charges.length > 0 && (
          <div className="relative flex-[1_1_240px] flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => openEdit(charges[0].payment)}
              className="bg-surface rounded-[22px] px-4.5 py-4 flex items-center gap-3.5 shadow-float text-left cursor-pointer"
            >
              <DateTile
                date={charges[0].date}
                highlight={charges[0].date.getTime() === today.getTime()}
                category={charges[0].payment.category}
                size="sm"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] text-muted font-medium">Next up</span>
                <span className="block font-bold truncate">{charges[0].payment.name}</span>
              </span>
              <span className="font-mono tnum font-medium">
                {formatMoney(charges[0].payment.amount, charges[0].payment.currency)}
              </span>
            </button>
            <div className="bg-hero-chip rounded-[22px] px-4.5 py-3.5 flex justify-between gap-3 text-[13.5px] text-ink-soft whitespace-nowrap">
              <span>
                Next 30 days · {charges.length} charge{charges.length === 1 ? '' : 's'}
              </span>
              <b className="font-mono font-medium tnum text-ink">
                {chargesTotal === null ? '…' : formatMoney(chargesTotal, displayCurrency)}
              </b>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-7 items-start">
        {/* Coming up */}
        <section className="flex-[999_1_540px] min-w-0">
          <h2 className="font-display font-extrabold text-2xl tracking-tight mb-3.5">Coming up</h2>
          {charges.length === 0 ? (
            <p className="card text-muted text-sm px-6 py-6">No charges in the next 30 days.</p>
          ) : (
            <div className="card p-2">
              {charges.map((charge) => {
                const isToday = charge.date.getTime() === today.getTime();
                const converted =
                  rates && charge.payment.currency !== displayCurrency
                    ? convert(charge.payment.amount, charge.payment.currency, displayCurrency, rates)
                    : null;
                return (
                  <button
                    key={`${charge.payment.id}-${charge.date.toISOString()}`}
                    type="button"
                    onClick={() => openEdit(charge.payment)}
                    className="w-full grid grid-cols-[56px_1fr_auto] items-center gap-4 px-3.5 py-2.5 rounded-[20px] text-left cursor-pointer hover:bg-hover transition-colors max-sm:gap-3"
                  >
                    <DateTile date={charge.date} highlight={isToday} category={charge.payment.category} />
                    <span className="min-w-0">
                      <span className="block font-bold text-[15.5px] truncate">{charge.payment.name}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12.5px] text-muted">
                        <span>
                          {isToday
                            ? 'today'
                            : charge.date.toLocaleDateString('en-IN', { weekday: 'short' }).toLowerCase()}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{
                            background: categorySoft(charge.payment.category),
                            color: categoryInk(charge.payment.category),
                          }}
                        >
                          {categoryLabel(charge.payment.category)}
                        </span>
                        <span>{FREQUENCY_LABEL[charge.payment.frequency].toLowerCase()}</span>
                      </span>
                    </span>
                    <span className="text-right font-mono tnum">
                      <span className="block font-medium text-[15.5px]">
                        {formatMoney(charge.payment.amount, charge.payment.currency)}
                      </span>
                      {converted !== null && (
                        <span className="block text-xs text-muted mt-0.5">
                          ≈ {formatMoney(converted, displayCurrency)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Side column */}
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-7">
          {categories.length > 0 && categoriesSum > 0 && (
            <section>
              <h2 className="font-display font-extrabold text-2xl tracking-tight mb-3.5">
                Where it goes
              </h2>
              <div className="card p-5.5">
                <div className="flex h-[18px] gap-1 mb-4.5">
                  {categories.map(([category, amount]) => (
                    <span
                      key={category}
                      title={`${category}: ${formatMoney(amount, displayCurrency)}`}
                      className="block min-w-2 rounded-full"
                      style={{
                        width: `${(amount / categoriesSum) * 100}%`,
                        background: categoryColor(category === 'Uncategorized' ? null : category),
                      }}
                    />
                  ))}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {categories.map(([category, amount]) => {
                    const key = category === 'Uncategorized' ? null : category;
                    return (
                      <li key={category} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-1.5">
                        <span
                          aria-hidden
                          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center"
                          style={{ background: categorySoft(key) }}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ background: categoryColor(key) }} />
                        </span>
                        <span className="font-semibold text-[14.5px] min-w-0 truncate">
                          {category}
                          <span className="tnum font-medium text-muted text-[12.5px] ml-1.5">
                            {Math.round((amount / categoriesSum) * 100)}%
                          </span>
                        </span>
                        <span className="font-mono tnum text-sm">{formatMoney(amount, displayCurrency)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {bigRenewal && (
            <section className="bg-note rounded-[28px] p-5.5 flex gap-3.5 items-start">
              <span aria-hidden className="shrink-0 w-10 h-10 rounded-[14px] bg-surface text-note-ink flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </span>
              <div>
                <h3 className="font-display font-bold text-[17px] text-note-ink mb-1">Big one ahead</h3>
                <p className="text-sm leading-snug text-note-ink-soft">
                  {bigRenewal.charge.payment.name} renews on{' '}
                  <b>
                    {bigRenewal.charge.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </b>{' '}
                  —{' '}
                  <b className="font-mono font-medium tnum">
                    {formatMoney(bigRenewal.charge.payment.amount, bigRenewal.charge.payment.currency)}
                  </b>
                  . That&apos;s {bigRenewal.share}% of the next 30 days.
                </p>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
