'use client';

import { useMemo, useState } from 'react';
import { useData } from '../../contexts/data-context';
import { useSettings } from '../../contexts/settings-context';
import { usePaymentDialog } from '../payment-dialog';
import { convert, monthlyAmount, formatMoney, FREQUENCY_SHORT } from '../../lib/money';
import { nextChargeDate, startOfDay } from '../../lib/upcoming';
import { categoryInk, categoryLabel, categorySoft } from '../../lib/categories';
import EmptyState from '../../components/ui/empty-state';
import Button from '../../components/ui/button';
import LoadingAnimation from '../../components/loading-animation';

type SortKey = 'name' | 'monthly' | 'next';

export default function Subscriptions() {
  const { recurringPayments, paymentSources, isLoading, error } = useData();
  const { rates, displayCurrency } = useSettings();
  const { openAdd, openEdit } = usePaymentDialog();

  const [sortKey, setSortKey] = useState<SortKey>('monthly');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const today = startOfDay(new Date());

  const rows = useMemo(() => {
    const withDerived = recurringPayments.map((payment) => ({
      payment,
      monthly: rates
        ? convert(
            monthlyAmount(payment.amount, payment.frequency),
            payment.currency,
            displayCurrency,
            rates,
          )
        : monthlyAmount(payment.amount, payment.frequency),
      next: nextChargeDate(payment, today),
      source: paymentSources.find((source) => source.id === payment.payment_source_id) || null,
    }));
    withDerived.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.payment.name.localeCompare(b.payment.name) * sortDir;
        case 'next':
          return (a.next.getTime() - b.next.getTime()) * sortDir;
        case 'monthly':
        default:
          return (a.monthly - b.monthly) * sortDir;
      }
    });
    return withDerived;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringPayments, paymentSources, rates, displayCurrency, sortKey, sortDir]);

  const total = rates
    ? rows.reduce((sum, row) => sum + row.monthly, 0)
    : null;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === 'monthly' ? -1 : 1);
    }
  };

  const arrow = (key: SortKey) => (key === sortKey ? (sortDir < 0 ? ' ▾' : ' ▴') : '');

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
        message="Add your first subscription — a name and an amount is all it takes."
        action={<Button onClick={openAdd}>Add your first subscription</Button>}
      />
    );
  }

  const headerClass =
    'text-left px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted whitespace-nowrap border-b border-line';
  const sortableClass = `${headerClass} cursor-pointer select-none hover:text-accent`;

  return (
    <section>
      <h2 className="font-display font-extrabold text-2xl tracking-tight mb-3.5">
        All subscriptions
      </h2>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className={sortableClass} onClick={() => toggleSort('name')}>
                Name{arrow('name')}
              </th>
              <th className={headerClass}>Category</th>
              <th className={headerClass}>Source</th>
              <th className={`${headerClass} text-right`}>Billed</th>
              <th
                className={`${sortableClass} text-right`}
                onClick={() => toggleSort('monthly')}
              >
                / month{arrow('monthly')}
              </th>
              <th className={sortableClass} onClick={() => toggleSort('next')}>
                Next charge{arrow('next')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ payment, monthly, next, source }) => {
              return (
                <tr
                  key={payment.id}
                  onClick={() => openEdit(payment)}
                  className="border-b border-line cursor-pointer hover:bg-hover transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold">{payment.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
                      style={{ color: categoryInk(payment.category), background: categorySoft(payment.category) }}
                    >
                      {categoryLabel(payment.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted whitespace-nowrap">
                    {source ? `${source.name} ···${source.identifier}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tnum whitespace-nowrap">
                    <span className="font-medium text-sm">
                      {formatMoney(payment.amount, payment.currency)}
                    </span>{' '}
                    <span className="text-[11px] font-sans font-medium text-muted">
                      /{FREQUENCY_SHORT[payment.frequency]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tnum text-sm font-medium text-muted whitespace-nowrap">
                    {rates ? formatMoney(monthly, displayCurrency) : '…'}
                  </td>
                  <td className="px-4 py-3 font-mono tnum text-[13px] text-muted whitespace-nowrap">
                    {next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="px-4 py-3 text-sm font-bold">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono tnum text-sm font-medium whitespace-nowrap">
                {total === null ? '…' : `${formatMoney(total, displayCurrency)} /mo`}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted mt-2.5">
        “Billed” is each subscription in its own currency; “/ month” normalizes the billing cycle
        and converts to {displayCurrency}. Click a row to edit.
      </p>
    </section>
  );
}
