'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient, MerchantKeyInfo, NewMerchantKey } from '@/lib/api/client';
import { CheckIcon, CopyIcon } from './icons';
import { NetworkPicker } from './network-picker';
import { BANKS } from './send-panel';

type PayTo = 'wallet' | 'bank' | 'base' | 'near';
const PAY_TO: [PayTo, string, string][] = [
  ['wallet', '10kobo wallet', 'Your own 10kobo wallet, in USDC.'],
  ['bank', 'Bank account', 'Naira to a Nigerian bank. You see the account name before the key is made.'],
  ['base', 'USDC on Base', 'USDC to an address on Base. Check it carefully: payments cannot be returned.'],
  ['near', 'NEAR account', 'USDC to an account on NEAR. Check it carefully: payments cannot be returned.'],
];

const small = 'btn-small border border-[var(--line)] hover:border-[var(--muted)] hover:bg-[var(--surface-2)]';

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{value}</code>
        <button type="button" className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]" aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}

/** Make, see and stop the keys a shop's server uses to create invoices. No one at 10kobo has to approve them. */
export function MerchantKeysDialog({ api, onClose, inline = false }: { api: ApiClient; onClose: () => void; inline?: boolean }) {
  const close = useRef<HTMLButtonElement>(null);
  const [keys, setKeys] = useState<MerchantKeyInfo[] | null>(null);
  const [making, setMaking] = useState(false);
  const [made, setMade] = useState<{ key: string; webhook_secret: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [payTo, setPayTo] = useState<PayTo>('wallet');
  const [address, setAddress] = useState('');
  const [holder, setHolder] = useState<{ for: string; name: string | null; error?: string } | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [webhook, setWebhook] = useState('');

  const load = useCallback(() => api.merchantKeys().then(setKeys, (failure: Error) => setError(failure.message)), [api]);
  useEffect(() => {
    void load();
    if (inline) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  // A bank account is only accepted once the bank has named its holder, so a typo cannot send orders to a stranger.
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
  const addressOk = payTo === 'base' ? /^0x[0-9a-fA-F]{40}$/.test(address.trim()) : payTo === 'near' ? /^([a-z0-9_-]+\.)*[a-z0-9_-]+(\.near)?$/.test(address.trim()) && address.trim().length >= 2 : true;
  const ready = name.trim().length >= 2 && (payTo === 'wallet' || (payTo === 'bank' ? Boolean(named) : addressOk));
  const submit = async () => {
    setBusy(true);
    setError(null);
    const body: NewMerchantKey = {
      name: name.trim(),
      payout: payTo === 'wallet' ? { to_my_wallet: true } : payTo === 'bank' ? { bank_name: bankName.trim(), account_number: accountNumber } : payTo === 'base' ? { usdc_address: address.trim() } : { near_account: address.trim() },
      return_origins: website.trim() ? [website.trim().replace(/\/$/, '')] : [],
      webhook_url: webhook.trim() || null,
    };
    try {
      setMade(await api.createMerchantKey(body));
      setMaking(false);
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (id: string) => {
    setError(null);
    try {
      await api.revokeMerchantKey(id);
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  const live = keys?.filter((key) => !key.revoked) ?? [];

  return (
    <div role={inline ? undefined : 'dialog'} aria-modal={inline ? undefined : true} aria-label="Merchant keys" className={inline ? '' : 'fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4'} onMouseDown={(event) => !inline && event.target === event.currentTarget && onClose()}>
      <div className={inline ? 'flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]' : 'rise flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl'}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <div>
            <p className="font-semibold">Merchant keys <span className="font-normal text-[var(--muted)]">· for developers</span></p>
            <p className="text-xs text-[var(--muted)]">For your website&apos;s server. One key works for every order, every day, until you stop it.</p>
          </div>
          {!inline && <button ref={close} onClick={onClose} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-lg text-[var(--muted)] hover:bg-[var(--surface-2)]">×</button>}
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {made && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="status">
              <p className="text-sm font-semibold">Copy your key now. It will not be shown again.</p>
              <CopyLine label="Merchant key" value={made.key} />
              {made.webhook_secret && <CopyLine label="Webhook secret" value={made.webhook_secret} />}
              <p className="text-xs">Keep it on your server only, never in a web page or an app. If it leaks, stop it below and make a new one.</p>
              <button type="button" className={`${small} self-start`} onClick={() => setMade(null)}>I have saved it</button>
            </div>
          )}

          {keys === null && !error && <p className="text-sm text-[var(--muted)]">Loading…</p>}
          {keys && keys.length === 0 && !making && <p className="text-sm text-[var(--muted)]">No keys yet. Make one to start taking payments on your website.</p>}
          {keys && keys.length > 0 && (
            <ul className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${key.revoked ? 'text-[var(--muted)] line-through' : ''}`}>{key.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      Pays {key.payout} · {key.return_origins[0] ?? 'no website yet'} · {key.invoices_per_day} invoices a day
                    </p>
                  </div>
                  {key.revoked ? <span className="text-xs text-[var(--muted)]">Stopped</span> : <button type="button" className="btn-small border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40" onClick={() => void revoke(key.id)}>Stop</button>}
                </li>
              ))}
            </ul>
          )}

          {making ? (
            <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (ready && !busy) void submit(); }}>
              <label className="flex flex-col gap-1.5 text-sm">
                <span>Shop name <span className="text-xs text-[var(--muted)]">· customers see this when they pay</span></span>
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ada's Kitchen" autoComplete="off" />
              </label>
              <div className="flex flex-col gap-1.5 text-sm">
                <span>Pay customers&apos; money to</span>
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--line)] p-1 sm:grid-cols-4" role="group" aria-label="Pay to">
                  {PAY_TO.map(([item, label]) => (
                    <button key={item} type="button" aria-pressed={payTo === item} onClick={() => setPayTo(item)} className={`rounded-xl px-2 py-2 font-medium whitespace-nowrap ${payTo === item ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[var(--muted)]">{PAY_TO.find(([item]) => item === payTo)![2]}</span>
              </div>
              {payTo === 'bank' && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 items-end gap-2">
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
                    <label className="flex flex-col gap-1.5 text-sm">Account number
                    <input className="field" aria-label="Account number" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" autoComplete="off" />
                    </label>
                  </div>
                  {bankComplete && (
                    <p className="flex items-center gap-2 text-sm" role="status" data-testid="key-account-name">
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
              {(payTo === 'base' || payTo === 'near') && (
                <input className="field font-mono text-sm" aria-label={payTo === 'base' ? 'USDC address on Base' : 'NEAR account'} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={payTo === 'base' ? '0x…' : 'shop.near'} autoComplete="off" spellCheck={false} />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm" title="Where customers return after paying.">
                  <span>Your website <span className="text-xs text-[var(--muted)]">· optional</span></span>
                  <input className="field" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://myshop.com" autoComplete="off" inputMode="url" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm" title="We tell this address when an invoice is paid, signed with a secret you get once.">
                  <span>Payment notices <span className="text-xs text-[var(--muted)]">· optional</span></span>
                  <input className="field" value={webhook} onChange={(event) => setWebhook(event.target.value)} placeholder="https://myshop.com/api/10kobo" autoComplete="off" inputMode="url" />
                </label>
              </div>
              <p className="-mt-1 text-xs text-[var(--muted)]">Customers return to your website after paying. Notices tell your server when an invoice is paid, signed with a secret shown once.</p>
              <div className="flex gap-2">
                <button className="btn-primary flex-1" disabled={!ready || busy}>{busy ? 'Making…' : 'Make key'}</button>
                <button type="button" className={small} onClick={() => setMaking(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            live.length < 3 && keys !== null && <button type="button" className="btn-primary self-start" onClick={() => setMaking(true)}>+ New key</button>
          )}
          {live.length >= 3 && <p className="text-xs text-[var(--muted)]">You can have 3 keys at a time. Stop one to make another.</p>}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <p className="text-xs text-[var(--muted)]">
            How to use it: <a className="underline underline-offset-2" href="/shop#integration" target="_blank" rel="noreferrer">see the three steps and code ↗</a>
          </p>
        </div>
      </div>
    </div>
  );
}
