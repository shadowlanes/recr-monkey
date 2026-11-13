'use client';

import { useMemo } from 'react';
import { useData } from '../contexts/data-context';
import { useSettings } from '../contexts/settings-context';
import { usePaymentDialog } from './payment-dialog';
import { convert, monthlyAmount, formatMoney, FREQUENCY_LABEL } from '../lib/money';
import { upcomingCharges, startOfDay } from '../lib/upcoming';
import { categoryColor, categoryLabel } from '../lib/categories';
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
      <div className="relative overflow-hidden rounded-[22px] bg-accent text-panel-ink px-8 py-7 mb-9 max-sm:px-5 max-sm:py-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2.5 -top-11 font-mono font-bold text-[170px] leading-none text-white/8 select-none"
        >
          ₹$
        </span>
        <p className="font-bold text-[11px] uppercase tracking-[0.16em] text-panel-ink/75 mb-2">
          You spend about
        </p>
        <p className="font-mono font-bold tnum text-white leading-none tracking-tighter text-[clamp(42px,9vw,72px)]">
          {monthlyTotal === null ? '…' : formatMoney(monthlyTotal, displayCurrency)}
          <span className="font-sans font-semibold text-[0.26em] tracking-normal text-panel-ink/85 ml-2">
            / month
          </span>
        </p>
        <p className="text-sm text-panel-ink/85 mt-3">
          That&apos;s{' '}
          <b className="font-mono tnum text-white">
            {monthlyTotal === null ? '…' : formatMoney(monthlyTotal * 12, displayCurrency)}
          </b>{' '}
          a year across <b className="font-mono tnum text-white">{recurringPayments.length}</b>{' '}
          subscriptions.
        </p>
        {perCurrency.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mt-4.5">
            <span className="text-xs text-panel-ink/70 font-medium">billed as</span>
            {perCurrency.map(([currency, amount]) => (
              <span
                key={currency}
                className="rounded-full bg-black/18 px-3.5 py-1.5 font-mono tnum text-[13px] font-semibold text-white"
              >
                {formatMoney(amount, currency)}/mo
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Coming up */}
      <section className="mb-10">
        <h2 className="font-display font-extrabold text-xl tracking-tight mb-3.5">Coming up</h2>
        {charges.length === 0 ? (
          <p className="text-muted text-sm bg-surface border border-line rounded-2xl px-5 py-6">
            No charges in the next 30 days.
          </p>
        ) : (
          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            {charges.map((charge, index) => {
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
                  className={`w-full grid grid-cols-[52px_1fr_auto] items-center gap-4 px-4.5 py-3 text-left cursor-pointer hover:bg-accent-soft transition-colors ${
                    index > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <DateTile date={charge.date} highlight={isToday} />
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{charge.payment.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      {isToday
                        ? 'today'
                        : charge.date
                            .toLocaleDateString('en-IN', { weekday: 'short' })
                            .toLowerCase()}
                      {' · '}
                      {categoryLabel(charge.payment.category)}
                      {' · '}
                      {FREQUENCY_LABEL[charge.payment.frequency].toLowerCase()}
                    </span>
                  </span>
                  <span className="text-right font-mono tnum">
                    <span className="block font-bold text-[15px]">
                      {formatMoney(charge.payment.amount, charge.payment.currency)}
                    </span>
                    {converted !== null && (
                      <span className="block text-xs text-muted">
                        ≈ {formatMoney(converted, displayCurrency)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            <div className="flex justify-between gap-3 flex-wrap px-4.5 py-3 border-t border-line text-[13px] text-muted">
              <span>
                Next 30 days · {charges.length} charge{charges.length === 1 ? '' : 's'}
              </span>
              <b className="font-mono tnum text-ink">
                {chargesTotal === null ? '…' : formatMoney(chargesTotal, displayCurrency)}
              </b>
            </div>
          </div>
        )}
      </section>

      {/* Where it goes */}
      {categories.length > 0 && categoriesSum > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-extrabold text-xl tracking-tight mb-3.5">
            Where it goes
          </h2>
          <div className="flex h-[22px] rounded-[11px] overflow-hidden gap-[3px] mb-4">
            {categories.map(([category, amount]) => (
              <span
                key={category}
                title={`${category}: ${formatMoney(amount, displayCurrency)}`}
                className="block min-w-1 rounded"
                style={{
                  width: `${(amount / categoriesSum) * 100}%`,
                  background: categoryColor(category === 'Uncategorized' ? null : category),
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-[13.5px]">
            {categories.map(([category, amount]) => (
              <span key={category} className="flex items-center gap-2 text-muted font-medium">
                <span
                  className="w-[11px] h-[11px] rounded shrink-0"
                  style={{
                    background: categoryColor(category === 'Uncategorized' ? null : category),
                  }}
                />
                {category}{' '}
                <b className="font-mono tnum font-semibold text-ink">
                  {formatMoney(amount, displayCurrency)}
                </b>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
