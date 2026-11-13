'use client';

import { useState } from 'react';
import { useData } from '../../contexts/data-context';
import { useSettings } from '../../contexts/settings-context';
import { PaymentSource } from '../../types';
import { DISPLAY_CURRENCIES } from '../../lib/money';
import Dialog from '../../components/ui/dialog';
import Button from '../../components/ui/button';
import ChipGroup from '../../components/ui/chip-group';
import { Field, Input, Select } from '../../components/ui/field';
import LoadingAnimation from '../../components/loading-animation';

const TYPE_LABEL: Record<PaymentSource['type'], string> = {
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  bank_account: 'Bank account',
};

export default function Settings() {
  const {
    paymentSources,
    recurringPayments,
    isLoading,
    error,
    addPaymentSource,
    updatePaymentSource,
    deletePaymentSource,
  } = useData();
  const { rates, displayCurrency, setDisplayCurrency } = useSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentSource | null>(null);
  const [form, setForm] = useState({ name: '', type: 'credit_card', identifier: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', type: 'credit_card', identifier: '' });
    setFormError(null);
    setConfirmingDelete(false);
    setDialogOpen(true);
  };

  const openEdit = (source: PaymentSource) => {
    setEditing(source);
    setForm({ name: source.name, type: source.type, identifier: source.identifier });
    setFormError(null);
    setConfirmingDelete(false);
    setDialogOpen(true);
  };

  const subscriptionCount = (sourceId: string) =>
    recurringPayments.filter((payment) => payment.payment_source_id === sourceId).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !/^\d{4}$/.test(form.identifier)) {
      setFormError('A name and the last 4 digits are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updatePaymentSource({
          ...editing,
          name: form.name.trim(),
          type: form.type as PaymentSource['type'],
          identifier: form.identifier,
        });
      } else {
        await addPaymentSource({
          name: form.name.trim(),
          type: form.type as PaymentSource['type'],
          identifier: form.identifier,
        });
      }
      setDialogOpen(false);
    } catch {
      setFormError('Saving failed. Try again.');
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
      await deletePaymentSource(editing.id);
      setDialogOpen(false);
    } catch {
      setFormError('Deleting failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <LoadingAnimation size="large" />
      </div>
    );
  }

  const usdToInr = rates?.rates?.INR;

  return (
    <div className="max-w-2xl">
      {error && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
          {error}
        </p>
      )}

      <section className="mb-10">
        <h2 className="font-display font-extrabold text-xl tracking-tight mb-3.5">
          Payment sources
        </h2>
        {paymentSources.length === 0 ? (
          <p className="text-muted text-sm bg-surface border border-line rounded-2xl px-5 py-6 mb-3.5">
            No payment sources yet. They are optional — a subscription never requires one.
          </p>
        ) : (
          <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-3.5">
            {paymentSources.map((source, index) => {
              const count = subscriptionCount(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => openEdit(source)}
                  className={`w-full grid grid-cols-[44px_1fr_auto] items-center gap-3.5 px-4.5 py-3.5 text-left cursor-pointer hover:bg-accent-soft transition-colors ${
                    index > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <span className="w-11 h-[30px] rounded-md bg-ink text-bg font-mono font-bold text-[10px] tracking-widest flex items-center justify-center">
                    {source.type === 'bank_account' ? 'BANK' : 'CARD'}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{source.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      {TYPE_LABEL[source.type]} · {count} subscription{count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="font-mono tnum font-semibold text-muted">
                    ···{source.identifier}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <Button variant="ghost" onClick={openAdd}>
          + Add payment source
        </Button>
        <p className="text-xs text-muted mt-2.5">
          Deleting a source detaches it from its subscriptions; the subscriptions stay.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display font-extrabold text-xl tracking-tight mb-3.5">
          Display currency
        </h2>
        <ChipGroup
          aria-label="Display currency"
          options={DISPLAY_CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
          value={displayCurrency as (typeof DISPLAY_CURRENCIES)[number]}
          onChange={setDisplayCurrency}
        />
        <p className="text-xs text-muted mt-2.5">
          Totals and normalized amounts convert to this currency. Each subscription keeps its own
          billing currency.
          {usdToInr &&
            rates &&
            ` Rates refresh daily (1 USD = ₹${usdToInr.toFixed(2)}, as of ${new Date(
              rates.fetched_at,
            ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}).`}
        </p>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit payment source' : 'Add a payment source'}
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
              {formError}
            </p>
          )}
          <Field label="Name" htmlFor="settings-source-name">
            <Input
              id="settings-source-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="HDFC Credit Card"
              autoComplete="off"
              required
              autoFocus
            />
          </Field>
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <Field label="Type" htmlFor="settings-source-type">
                <Select
                  id="settings-source-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="credit_card">Credit card</option>
                  <option value="debit_card">Debit card</option>
                  <option value="bank_account">Bank account</option>
                </Select>
              </Field>
            </div>
            <div className="w-28 shrink-0">
              <Field label="Last 4" htmlFor="settings-source-identifier">
                <Input
                  id="settings-source-identifier"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  placeholder="4521"
                  required
                />
              </Field>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-2">
            {editing && (
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {confirmingDelete ? 'Confirm delete' : 'Delete'}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {editing ? 'Save changes' : 'Add source'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
