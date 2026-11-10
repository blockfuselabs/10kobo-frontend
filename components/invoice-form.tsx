'use client';

import { useState } from 'react';
import type { ApiClient } from '@/lib/api/client';
import { CheckIcon, CopyIcon } from './icons';
import { NetworkPicker } from './network-picker';
import { BANKS, Field } from './send-panel';

type Item = { description: string; amount: string };
const nairaOf = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const wholeNaira = (text: string) => {
  const value = Number(text.replace(/[,\s₦]/g, ''));
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/** Makes an invoice with a pay link. The payer can pay in naira or crypto; the merchant is paid as chosen here. */
export function InvoiceForm({ api, onDone, onClose }: { api: ApiClient; onDone: () => void; onClose: () => void }) {
  const [items, setItems] = useState<Item[]>([{ description: '', amount: '' }]);
  const [note, setNote] = useState('');
  const [due, setDue] = useState('');
  const [payTo, setPayTo] = useState<'bank' | 'wallet'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const filled = items.filter((item) => item.description.trim() || item.amount.trim());
  const total = filled.reduce((sum, item) => sum + wholeNaira(item.amount), 0);
  const itemsOk = filled.length > 0 && filled.every((item) => item.description.trim() && wholeNaira(item.amount) > 0);
  const payToOk = payTo === 'wallet' || (bankName.trim().length >= 2 && /^\d{10}$/.test(accountNumber));
  const today = new Date().toISOString().slice(0, 10);

  const update = (index: number, change: Partial<Item>) => setItems((list) => list.map((item, at) => (at === index ? { ...item, ...change } : item)));

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const single = filled.length === 1;
      const link = await api.createInvoice({
        amount_naira: total,
        note: note.trim() || (single ? filled[0]!.description.trim() : `${filled[0]!.description.trim()} and ${filled.length - 1} more`),
        due_date: due || undefined,
        line_items: single ? undefined : filled.map((item) => ({ description: item.description.trim(), amount_naira: wholeNaira(item.amount) })),
        ...(payTo === 'wallet' ? { to_my_wallet: true } : { bank_name: bankName.trim(), account_number: accountNumber }),
      });
      setMade({ url: link.url });
      onDone();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not make that invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (made) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5" aria-label="Invoice ready">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--pop)] text-[#111]"><CheckIcon /></span>
          <div>
            <h2 className="font-semibold">Invoice ready: {nairaOf(total)}</h2>
            <p className="text-sm text-[var(--muted)]">Send this link to your client. They can pay from a Nigerian bank or with crypto from any network.</p>
          </div>
        </div>
        <code className="block break-all rounded-xl bg-[var(--surface-2)] px-3 py-2.5 text-sm">{made.url}</code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-small gap-1.5 bg-[var(--accent)] text-[var(--accent-text)]"
            onClick={() => void navigator.clipboard?.writeText(made.url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })}
          >
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <a className="btn-small border border-[var(--line)]" href={made.url} target="_blank" rel="noreferrer">Open the pay page</a>
          <button type="button" className="btn-small border border-[var(--line)]" onClick={onClose}>Done</button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5" aria-label="New invoice">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">New invoice</h2>
          <p className="text-sm text-[var(--muted)]">You get a link to share. Nothing is charged to you.</p>
        </div>
        <button type="button" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={onClose}>Close</button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">What it is for</span>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-2">
            <input className="field" aria-label={`Item ${index + 1}`} value={item.description} maxLength={120} onChange={(event) => update(index, { description: event.target.value })} placeholder={index === 0 ? 'e.g. Generator repair' : 'Another item'} />
            <input className="field amount" aria-label={`Amount for item ${index + 1}`} inputMode="numeric" value={item.amount} onChange={(event) => update(index, { amount: event.target.value.replace(/[^\d,]/g, '') })} placeholder="₦" />
            <button
              type="button"
              aria-label={`Remove item ${index + 1}`}
              disabled={items.length === 1}
              className="h-9 w-9 rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-0"
              onClick={() => setItems((list) => list.filter((_, at) => at !== index))}
            >
              ×
            </button>
          </div>
        ))}
        {items.length < 20 && (
          <button type="button" className="self-start text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setItems((list) => [...list, { description: '', amount: '' }])}>
            + Add an item
          </button>
        )}
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="text-sm text-[var(--muted)]">Total</span>
          <span className="amount text-xl font-semibold" data-testid="invoice-total">{nairaOf(total)}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Note for your client (optional)">
          <input className="field" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="e.g. November service" />
        </Field>
        <Field label="Due date (optional)">
          <input className="field" type="date" min={today} value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Pay me into</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pay me into">
          {([['bank', 'My bank account', 'In naira'], ['wallet', 'My 10kobo wallet', 'As USDC']] as const).map(([key, label, detail]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={payTo === key}
              onClick={() => setPayTo(key)}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${payTo === key ? 'border-[var(--foreground)] bg-[var(--surface-2)]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]'}`}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-[var(--muted)]">{detail}</span>
            </button>
          ))}
        </div>
        {payTo === 'bank' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <NetworkPicker
              label="Bank"
              networks={BANKS.map((bank) => ({ id: bank, name: bank, tokens: [], family: '' }))}
              value={bankName}
              onChange={setBankName}
              placeholder="Choose a bank"
              searchLabel="Search banks"
              empty={(query) => `No bank called “${query}”.`}
              allowTyped
            />
            <Field label="Account number">
              <input className="field" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" autoComplete="off" name="invoice-account" />
            </Field>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" className="btn-primary" disabled={busy || !itemsOk || !payToOk} onClick={() => void create()}>
        {busy ? 'Making your invoice…' : total > 0 ? `Create invoice for ${nairaOf(total)}` : 'Create invoice'}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">The bank checks the account name before your client pays.</p>
    </section>
  );
}
