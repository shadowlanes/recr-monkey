'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useData } from '../contexts/data-context';
import { RecurringPayment } from '../types';
import { Frequency, SUPPORTED_CURRENCIES, FREQUENCY_LABEL } from '../lib/money';
import { CATEGORIES } from '../lib/categories';
import Dialog from '../components/ui/dialog';
import Button from '../components/ui/button';
import ChipGroup from '../components/ui/chip-group';
import { Field, Input, Select } from '../components/ui/field';

interface PaymentDialogContextType {
  openAdd: () => void;
  openEdit: (payment: RecurringPayment) => void;
}

const PaymentDialogContext = createContext<PaymentDialogContextType | undefined>(undefined);

export function usePaymentDialog() {
  const context = useContext(PaymentDialogContext);
  if (context === undefined) {
    throw new Error('usePaymentDialog must be used within a PaymentDialogProvider');
  }
  return context;
}

const NAME_SUGGESTIONS = [
  'Netflix',
  'Spotify',
  'YouTube Premium',
  'iCloud+',
  'Amazon Prime',
  'Disney+ Hotstar',
  'Claude Pro',
  'Gym membership',
  'Rent',
];

const NEW_SOURCE = '__new__';

function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

interface FormState {
  name: string;
  amount: string;
  currency: string;
  frequency: Frequency;
  category: string;
  sourceId: string;
  startDate: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  amount: '',
  currency: 'INR',
  frequency: 'monthly',
  category: '',
  sourceId: '',
  startDate: todayString(),
};

export function PaymentDialogProvider({ children }: { children: React.ReactNode }) {
  const {
    paymentSources,
    addRecurringPayment,
    updateRecurringPayment,
    deleteRecurringPayment,
    addPaymentSource,
  } = useData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline source creation
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState({ name: '', type: 'credit_card', identifier: '' });
  const [sourceError, setSourceError] = useState<string | null>(null);

  const lastCurrency =
    typeof window !== 'undefined' ? localStorage.getItem('lastBillingCurrency') : null;

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, currency: lastCurrency || 'INR', startDate: todayString() });
    setDetailsOpen(false);
    setConfirmingDelete(false);
    setError(null);
    setOpen(true);
  }, [lastCurrency]);

  const openEdit = useCallback((payment: RecurringPayment) => {
    setEditing(payment);
    setForm({
      name: payment.name,
      amount: String(payment.amount),
      currency: payment.currency,
      frequency: payment.frequency,
      category: payment.category || '',
      sourceId: payment.payment_source_id || '',
      startDate: payment.start_date.slice(0, 10),
    });
    setDetailsOpen(true);
    setConfirmingDelete(false);
    setError(null);
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      setError('A name and a positive amount are required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      amount,
      currency: form.currency,
      frequency: form.frequency,
      payment_source_id: form.sourceId || null,
      start_date: form.startDate,
      category: form.category || null,
    };

    setSaving(true);
    try {
      const ok = editing
        ? await updateRecurringPayment(editing.id, payload)
        : await addRecurringPayment(payload);
      if (ok) {
        try {
          localStorage.setItem('lastBillingCurrency', form.currency);
        } catch {}
        close();
      }
    } catch {
      setError('Saving failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      const ok = await deleteRecurringPayment(editing.id);
      if (ok) close();
    } catch {
      setError('Deleting failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSourceSelect = (value: string) => {
    if (value === NEW_SOURCE) {
      setSourceForm({ name: '', type: 'credit_card', identifier: '' });
      setSourceError(null);
      setSourceDialogOpen(true);
    } else {
      set({ sourceId: value });
    }
  };

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceError(null);
    if (!sourceForm.name.trim() || !/^\d{4}$/.test(sourceForm.identifier)) {
      setSourceError('A name and the last 4 digits are required.');
      return;
    }
    try {
      const created = await addPaymentSource({
        name: sourceForm.name.trim(),
        type: sourceForm.type as 'bank_account' | 'debit_card' | 'credit_card',
        identifier: sourceForm.identifier,
      });
      set({ sourceId: created.id });
      setSourceDialogOpen(false);
    } catch {
      setSourceError('Could not add the payment source. Try again.');
    }
  };

  // '4weeks' stays selectable only on payments that already use it
  const frequencyOptions: { value: Frequency; label: string }[] = [
    { value: 'weekly', label: FREQUENCY_LABEL.weekly },
    { value: 'monthly', label: FREQUENCY_LABEL.monthly },
    ...(editing?.frequency === '4weeks' || form.frequency === '4weeks'
      ? [{ value: '4weeks' as Frequency, label: FREQUENCY_LABEL['4weeks'] }]
      : []),
    { value: 'yearly', label: FREQUENCY_LABEL.yearly },
  ];

  return (
    <PaymentDialogContext.Provider value={{ openAdd, openEdit }}>
      {children}

      <Dialog
        open={open}
        onClose={close}
        title={editing ? 'Edit subscription' : 'Add a subscription'}
      >
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
              {error}
            </p>
          )}

          <Field label="Name" htmlFor="payment-name">
            <Input
              id="payment-name"
              list="payment-name-suggestions"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Netflix, rent, gym…"
              autoComplete="off"
              required
              autoFocus
            />
            <datalist id="payment-name-suggestions">
              {NAME_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>

          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <Field label="Amount" htmlFor="payment-amount">
                <Input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  placeholder="649"
                  required
                />
              </Field>
            </div>
            <div className="w-28 shrink-0">
              <Field label="Currency" htmlFor="payment-currency">
                <Select
                  id="payment-currency"
                  value={form.currency}
                  onChange={(e) => set({ currency: e.target.value })}
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <Field label="Billed" htmlFor="payment-frequency">
            <ChipGroup
              aria-label="Billing frequency"
              options={frequencyOptions}
              value={form.frequency}
              onChange={(frequency) => set({ frequency })}
            />
          </Field>

          <details
            className="mb-4"
            open={detailsOpen}
            onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-[13.5px] font-bold text-accent list-none py-1 marker:hidden">
              {detailsOpen ? '− Hide details' : '+ Add details'}
            </summary>
            <div className="pt-3">
              <Field label="Category" htmlFor="payment-category">
                <Select
                  id="payment-category"
                  value={form.category}
                  onChange={(e) => set({ category: e.target.value })}
                >
                  <option value="">None</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  {form.category && !CATEGORIES.includes(form.category as never) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </Select>
              </Field>

              <Field label="Payment source" htmlFor="payment-source">
                <Select
                  id="payment-source"
                  value={form.sourceId}
                  onChange={(e) => handleSourceSelect(e.target.value)}
                >
                  <option value="">None</option>
                  {paymentSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name} ···{source.identifier}
                    </option>
                  ))}
                  <option value={NEW_SOURCE}>+ New payment source…</option>
                </Select>
              </Field>

              <Field
                label="First / next charge date"
                htmlFor="payment-date"
                hint="Future charges are projected from this date."
              >
                <Input
                  id="payment-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set({ startDate: e.target.value })}
                  required
                />
              </Field>
            </div>
          </details>

          <div className="flex items-center gap-2.5 pt-2">
            {editing && (
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {confirmingDelete ? 'Confirm delete' : 'Delete'}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {editing ? 'Save changes' : 'Add subscription'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={sourceDialogOpen}
        onClose={() => setSourceDialogOpen(false)}
        title="Add a payment source"
        elevated
      >
        <form onSubmit={handleSourceSubmit}>
          {sourceError && (
            <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
              {sourceError}
            </p>
          )}
          <Field label="Name" htmlFor="source-name">
            <Input
              id="source-name"
              value={sourceForm.name}
              onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
              placeholder="HDFC Credit Card"
              autoComplete="off"
              required
              autoFocus
            />
          </Field>
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <Field label="Type" htmlFor="source-type">
                <Select
                  id="source-type"
                  value={sourceForm.type}
                  onChange={(e) => setSourceForm({ ...sourceForm, type: e.target.value })}
                >
                  <option value="credit_card">Credit card</option>
                  <option value="debit_card">Debit card</option>
                  <option value="bank_account">Bank account</option>
                </Select>
              </Field>
            </div>
            <div className="w-28 shrink-0">
              <Field label="Last 4" htmlFor="source-identifier">
                <Input
                  id="source-identifier"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={sourceForm.identifier}
                  onChange={(e) => setSourceForm({ ...sourceForm, identifier: e.target.value })}
                  placeholder="4521"
                  required
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="ghost" onClick={() => setSourceDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add source</Button>
          </div>
        </form>
      </Dialog>
    </PaymentDialogContext.Provider>
  );
}
