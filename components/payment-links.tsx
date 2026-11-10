'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, ProductLinkInfo } from '@/lib/api/client';
import { CheckIcon, CopyIcon } from './icons';
import { NetworkPicker } from './network-picker';
import { BANKS } from './send-panel';

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const small = 'btn-small gap-1.5 border border-[var(--line)] hover:border-[var(--muted)] hover:bg-[var(--surface-2)]';

/**
 * What a seller pastes into any website builder: the 10kobo script and one button. The checkout opens over their own
 * page. Without the script it is still a plain link to the payment page, so it never breaks. No code, no key.
 */
const buttonCode = (link: ProductLinkInfo) => {
  const origin = new URL(link.url).origin;
  const label = link.amount_naira === null ? 'Pay with 10kobo' : `Pay ${naira(link.amount_naira)} with 10kobo`;
  return `<script src="${origin}/checkout.js"></script>\n<a href="${link.url}" data-10kobo-link="${link.id}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#141414;color:#fff;font:600 15px system-ui,sans-serif;text-decoration:none">${label}</a>`;
};
const priceOf = (link: ProductLinkInfo) => (link.amount_naira === null ? (link.minimum_naira ? `From ${naira(link.minimum_naira)}` : 'Any amount') : naira(link.amount_naira));

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className={small} onClick={() => void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
      {copied ? <CheckIcon /> : <CopyIcon />} {copied ? done : label}
    </button>
  );
}

type PayTo = 'wallet' | 'bank';

/** Reusable links for sellers with no website or developer: one product at one price, shared anywhere. */
export function PaymentLinks({ api }: { api: ApiClient }) {
  const [links, setLinks] = useState<ProductLinkInfo[] | null>(null);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  // Fixed: everyone pays the price. Customer: each customer types the amount, at least the minimum if one is set.
  const [pricing, setPricing] = useState<'fixed' | 'customer'>('fixed');
  const [minimum, setMinimum] = useState('');
  const [payTo, setPayTo] = useState<PayTo>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [holder, setHolder] = useState<{ for: string; name: string | null; error?: string } | null>(null);

  const load = useCallback(() => api.productLinks().then(setLinks, (failure: Error) => setError(failure.message)), [api]);
  useEffect(() => {
    void load();
  }, [load]);

  // The bank names the account before the link can be made, so a typo cannot send every sale to a stranger.
  const bankKey = `${bankName.trim().toLowerCase()}|${accountNumber}`;
  const bankComplete = bankName.trim().length >= 2 && /^\d{10}$/.test(accountNumber);
  useEffect(() => {
    if (payTo !== 'bank' || !bankComplete) return;
    let current = true;
    setHolder({ for: bankKey, name: null });
    const timer = setTimeout(() => {
      api.checkMerchantAccount(bankName.trim(), accountNumber).then(
        (found) => current && setHolder({ for: bankKey, name: found.account_name }),
        (failure: Error) => current && setHolder({ for: bankKey, name: null, error: failure.message }),
      );
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [api, payTo, bankComplete, bankKey, bankName, accountNumber]);
  const named = holder?.for === bankKey && holder.name ? holder.name : null;
  const amount = Number(price);
  const least = Number(minimum || 0);
  const priceOk = pricing === 'fixed' ? Number.isInteger(amount) && amount > 0 && amount <= 50_000 : Number.isInteger(least) && least >= 0 && least <= 50_000;
  const ready = title.trim().length >= 2 && priceOk && (payTo === 'wallet' || Boolean(named));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createProductLink({ title: title.trim(), ...(pricing === 'fixed' ? { amount_naira: amount } : least > 0 ? { minimum_naira: least } : {}), ...(payTo === 'wallet' ? { to_my_wallet: true } : { bank_name: bankName.trim(), account_number: accountNumber }) });
      setMaking(false);
      setTitle('');
      setPrice('');
      setMinimum('');
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const stop = async (id: string) => {
    setError(null);
    try {
      await api.stopProductLink(id);
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Payment links">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="page-title">Payment links</h1>
          <p className="text-sm text-[var(--muted)]">Reusable links for what you sell. Share them, or add the checkout widget to your website.</p>
        </div>
        {!making && <button type="button" className={small} onClick={() => setMaking(true)}>+ New payment link</button>}
      </div>

      {making && (
        <form className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4" onSubmit={(event) => { event.preventDefault(); if (ready && !busy) void submit(); }}>
          <label className="flex flex-col gap-1.5 text-sm">
            Product or service
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Jollof pack, or Lessons" autoComplete="off" maxLength={80} />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span>Price</span>
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--line)] p-1" role="group" aria-label="Price">
              {([['fixed', 'Fixed price'], ['customer', 'Customer enters the amount']] as const).map(([item, label]) => (
                <button key={item} type="button" aria-pressed={pricing === item} onClick={() => setPricing(item)} className={`rounded-xl px-2 py-2 font-medium whitespace-nowrap ${pricing === item ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'}`}>
                  {label}
                </button>
              ))}
            </div>
            {pricing === 'fixed' ? (
              <span className="field flex items-center gap-1.5 sm:max-w-[14rem]">
                <span className="text-[var(--muted)]" aria-hidden>₦</span>
                <input className="amount min-w-0 flex-1 bg-transparent outline-none" aria-label="Price in naira" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))} placeholder="3500" autoComplete="off" />
              </span>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="field flex items-center gap-1.5 sm:max-w-[14rem]">
                  <span className="text-[var(--muted)]" aria-hidden>₦</span>
                  <input className="amount min-w-0 flex-1 bg-transparent outline-none" aria-label="Minimum in naira" inputMode="numeric" value={minimum} onChange={(event) => setMinimum(event.target.value.replace(/\D/g, ''))} placeholder="Minimum, optional" autoComplete="off" />
                </span>
                <span className="text-xs text-[var(--muted)]">Each customer types what they pay, up to ₦50,000. Good for lessons, donations, tips and part-payments.</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span>Receive the money in</span>
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--line)] p-1" role="group" aria-label="Receive in">
              {([['bank', 'My bank account'], ['wallet', 'My 10kobo wallet']] as const).map(([item, label]) => (
                <button key={item} type="button" aria-pressed={payTo === item} onClick={() => setPayTo(item)} className={`rounded-xl py-2 font-medium whitespace-nowrap ${payTo === item ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {payTo === 'bank' && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 items-end gap-2">
                <NetworkPicker label="Bank" networks={BANKS.map((bank) => ({ id: bank, name: bank, tokens: [], family: '' }))} value={bankName} onChange={setBankName} placeholder="Choose a bank" searchLabel="Search banks" empty={(query) => `No bank called “${query}”.`} allowTyped />
                <label className="flex flex-col gap-1.5 text-sm">
                  Account number
                  <input className="field" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" autoComplete="off" />
                </label>
              </div>
              {bankComplete && (
                <p className="flex items-center gap-2 text-sm" role="status" data-testid="link-account-name">
                  {named ? (
                    <><span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--positive)] text-white"><CheckIcon /></span><span><span className="font-semibold">{named}</span> <span className="text-[var(--muted)]">· {bankName.trim()} ****{accountNumber.slice(-4)}</span></span></>
                  ) : holder?.for === bankKey && holder.error ? (
                    <span className="text-red-600 dark:text-red-400">{holder.error}</span>
                  ) : (
                    <span className="text-[var(--muted)]">Checking the account name…</span>
                  )}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={!ready || busy}>{busy ? 'Making…' : 'Make payment link'}</button>
            <button type="button" className={small} onClick={() => setMaking(false)}>Cancel</button>
          </div>
        </form>
      )}

      {links && links.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {links.map((link) => (
            <li key={link.id} className="flex flex-col gap-3 px-4 py-3.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className={`truncate font-medium ${link.stopped ? 'text-[var(--muted)] line-through' : ''}`}>{link.title}</span>
                    <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">{link.stopped ? 'Stopped' : 'Reusable'}</span>
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">{link.amount_naira === null ? 'Each customer chooses the amount' : `Each customer pays ${naira(link.amount_naira)}`} · {link.paid_count} paid so far · to {link.receives}</p>
                </div>
                <span className="amount shrink-0 font-semibold">{priceOf(link)}</span>
              </div>
              {!link.stopped && (
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={link.url} label="Copy link" done="Link copied" />
                  <CopyButton text={buttonCode(link)} label="Copy checkout widget" done="Widget copied" />
                  <a className={small} href={link.url} target="_blank" rel="noreferrer">Open ↗</a>
                  <button type="button" className="btn-small ml-auto border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40" onClick={() => void stop(link.id)}>Stop</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {links && links.length === 0 && !making && <p className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">No payment links yet. Make one for something you sell, then share it.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
