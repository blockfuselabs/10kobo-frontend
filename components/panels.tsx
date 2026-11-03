'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActivityEntry, ApiClient, DepositTerms, NairaDeposit, Schedule, WalletSummary } from '@/lib/api/client';
import { CancelScheduleButton, TxLink } from './cards';

const row = 'flex justify-between gap-4 border-b border-[var(--line)] py-3';

const dateOf = (value: string) =>
  new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;

/** Whole seconds until a moment, ticking once a second. */
function useSecondsLeft(until: string | null): number {
  const left = () => (until ? Math.max(Math.floor((new Date(until).getTime() - Date.now()) / 1000), 0) : 0);
  const [seconds, setSeconds] = useState(left);
  useEffect(() => {
    setSeconds(left());
    const timer = setInterval(() => setSeconds(left()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);
  return seconds;
}

function CopyRow({ label, value, copy, testId }: { label: string; value: string; copy: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="break-words font-medium" data-testid={testId}>{value}</p>
      </div>
      <button
        className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-1 text-sm"
        onClick={() => void navigator.clipboard?.writeText(copy).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

const STEPS = ['Waiting for your transfer', 'Naira received, sending your USDC', 'USDC in your wallet'];
const STEP_OF: Partial<Record<NairaDeposit['status'], number>> = { waiting: 0, processing: 1, completed: 2 };

function DepositProgress({ deposit, onDone, onClose, busy }: { deposit: NairaDeposit; onDone: () => void; onClose: () => void; busy: boolean }) {
  const seconds = useSecondsLeft(deposit.status === 'waiting' ? deposit.expires_at : null);
  const closing = seconds > 0 && seconds < 300;
  const timedOut = deposit.status === 'expired' || (deposit.status === 'waiting' && seconds === 0);
  const step = STEP_OF[deposit.status];
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div className="flex flex-col gap-3" aria-label="Naira deposit">
      {deposit.status === 'waiting' && !timedOut && (
        <>
          <div className="flex items-center justify-between rounded-lg border border-[var(--line)] p-3">
            <p className="text-sm">Account expires in</p>
            <p className={`font-mono text-xl font-semibold ${closing ? 'text-red-600 dark:text-red-400' : ''}`} role="timer" data-testid="deposit-timer">{clock}</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] px-3 py-1">
            <CopyRow label="Send exactly" value={deposit.amount} copy={String(deposit.amount_naira)} testId="deposit-amount" />
            <CopyRow label={deposit.bank_name ?? 'Bank'} value={deposit.account_number} copy={deposit.account_number} testId="deposit-account" />
            {deposit.account_name && <p className="py-2 text-sm"><span className="text-[var(--muted)]">Account name: </span>{deposit.account_name}</p>}
          </div>
          <p className="text-sm text-[var(--muted)]">You get about {deposit.usdc}. Send the exact amount, in one transfer. This account works once.</p>
        </>
      )}
      {timedOut && (
        <div className="rounded-lg border border-[var(--line)] p-3">
          <p className="font-medium">This account has expired</p>
          <p className="text-sm text-[var(--muted)]">Please do not send money to it. If you already did, we keep watching for a day and will tell you here if it arrives.</p>
        </div>
      )}
      {deposit.status === 'failed' && (
        <div className="rounded-lg border border-[var(--line)] p-3">
          <p className="font-medium text-red-600 dark:text-red-400">This deposit could not be completed</p>
          <p className="text-sm text-[var(--muted)]">If money left your bank, please contact support with the amount and time.</p>
        </div>
      )}
      {step !== undefined && (
        <ol className="flex flex-col gap-2" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className={`flex items-center gap-2 text-sm ${index > step ? 'text-[var(--muted)]' : ''}`} aria-current={index === step ? 'step' : undefined}>
              <span aria-hidden className="w-4 text-center">{index < step || step === 2 ? '✓' : index === step ? '●' : '○'}</span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {deposit.status === 'waiting' && !timedOut && <p className="text-sm text-[var(--muted)]">Stay on this page or come back later. It updates by itself, usually within 2 minutes of your transfer.</p>}
      {deposit.status === 'processing' && <p className="text-sm text-[var(--muted)]">We have your naira. Your USDC usually arrives within 2 minutes.</p>}
      {deposit.status === 'completed' && <p className="font-medium">About {deposit.usdc} added to your wallet.</p>}
      {deposit.status !== 'processing' && (
        <button className="self-start rounded-lg border border-[var(--line)] px-4 py-2 text-sm" disabled={busy} onClick={deposit.status === 'completed' || timedOut || deposit.status === 'failed' ? onDone : onClose}>
          {deposit.status === 'completed' || timedOut || deposit.status === 'failed' ? 'Make a new deposit' : 'Cancel and start again'}
        </button>
      )}
    </div>
  );
}

function DepositNaira({ api, onChanged }: { api: ApiClient; onChanged: () => void }) {
  const [terms, setTerms] = useState<DepositTerms | null>(null);
  const [deposit, setDeposit] = useState<NairaDeposit | null | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api.depositTerms().then(setTerms, () => setUnavailable(true));
    api.currentDeposit().then(setDeposit, () => setDeposit(null));
  }, [api]);

  // Checks often while money is on its way, so nobody is left wondering.
  const status = deposit?.status;
  useEffect(() => {
    if (status !== 'waiting' && status !== 'processing' && status !== 'expired') return;
    const timer = setInterval(() => {
      api.currentDeposit().then((fresh) => {
        setDeposit((old) => {
          if (fresh?.status === 'completed' && old?.status !== 'completed') onChanged();
          return fresh;
        });
      }, () => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [api, status, onChanged]);

  const closeThen = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.closeDeposit(id);
      setDeposit(null);
      setAmount('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const value = Number(amount);
  const valid = terms !== null && Number.isInteger(value) && value >= terms.minimum_naira && value <= terms.maximum_naira;
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setDeposit(await api.startDeposit(value));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (deposit) {
    return (
      <>
        <DepositProgress deposit={deposit} busy={busy} onDone={() => void closeThen(deposit.id)} onClose={() => void closeThen(deposit.id)} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </>
    );
  }
  if (unavailable) return <p className="text-sm text-[var(--muted)]">Naira deposits are not available right now. Please try again later.</p>;
  return (
    <form
      className="flex flex-col gap-3"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !busy) void start();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Amount in naira
        <input
          className="rounded-lg border border-[var(--line)] bg-transparent p-3 text-base"
          inputMode="numeric"
          autoComplete="off"
          name="deposit-amount"
          placeholder={terms ? `At least ${naira(terms.minimum_naira)}` : ''}
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
        />
      </label>
      {terms && valid && <p className="text-sm text-[var(--muted)]">You get about {(value / terms.rate).toFixed(2)} USDC at ₦{terms.rate.toLocaleString('en-NG')} per USDC.</p>}
      {terms && amount !== '' && !valid && <p className="text-sm text-[var(--muted)]">Enter between {naira(terms.minimum_naira)} and {naira(terms.maximum_naira)}.</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button className="self-start rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)] disabled:opacity-50" disabled={!valid || busy}>
        {busy ? 'Processing…' : 'Get bank account'}
      </button>
    </form>
  );
}

export function ReceivePanel({ summary, api, onChanged }: { summary: WalletSummary | null; api: ApiClient; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const address = summary?.address;
  return (
    <section className="flex flex-col gap-3 py-4" aria-label="Receive USDC">
      <p className="font-medium">Deposit naira</p>
      <DepositNaira api={api} onChanged={onChanged} />
      <p className="mt-4 border-t border-[var(--line)] pt-4 font-medium">Or receive USDC</p>
      <p className="text-sm text-[var(--muted)]">Send USDC on the Base network to this address. Sending any other coin, or using another network, can lose the money.</p>
      <p className="break-all rounded-lg border border-[var(--line)] p-3 font-mono text-sm" data-testid="receive-address">
        {address ?? 'Your wallet is being set up…'}
      </p>
      {address && (
        <button
          className="self-start rounded-lg border border-[var(--line)] px-4 py-2"
          onClick={() => void navigator.clipboard?.writeText(address).then(() => setCopied(true))}
        >
          {copied ? 'Copied' : 'Copy address'}
        </button>
      )}
      <p className="text-sm text-[var(--muted)]">It shows here a few moments after it arrives. {process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? 'Send USDC on the Base network only.' : 'Test version: test USDC on Base Sepolia only.'}</p>
    </section>
  );
}

export function ActivityPanel({ api }: { api: ApiClient }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.activity().then(setEntries, (failure: Error) => setError(failure.message));
  }, [api]);
  if (error) return <p role="alert" className="py-4 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!entries) return <p className="py-4 text-sm text-[var(--muted)]">Loading…</p>;
  if (entries.length === 0) return <p className="py-4 text-sm text-[var(--muted)]">Nothing yet.</p>;
  return (
    <ul aria-label="Activity">
      {entries.map((entry, index) => (
        <li key={index} className={row}>
          <div className="min-w-0">
            <p className="break-words">{entry.description}</p>
            <p className="text-sm text-[var(--muted)]">
              {dateOf(entry.created_at)} · {entry.status.replace(/_/g, ' ')}
              {entry.tx_hash && (
                <>
                  {' · '}
                  <TxLink hash={entry.tx_hash} />
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p>{entry.amount_naira ?? entry.amount_usdc}</p>
            {entry.amount_naira && <p className="text-sm text-[var(--muted)]">{entry.amount_usdc}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SchedulesPanel({ api }: { api: ApiClient }) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.schedules().then(setSchedules, (failure: Error) => setError(failure.message)), [api]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error) return <p role="alert" className="py-4 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!schedules) return <p className="py-4 text-sm text-[var(--muted)]">Loading…</p>;
  if (schedules.length === 0) return <p className="py-4 text-sm text-[var(--muted)]">No scheduled payments. Try: send N500 airtime to Kc every month.</p>;
  return (
    <ul aria-label="Scheduled payments">
      {schedules.map((schedule) => (
        <li key={schedule.id} className={row}>
          <div className="min-w-0">
            <p className="font-medium">{schedule.recipient_name}: {schedule.amount}</p>
            <p className="text-sm text-[var(--muted)]">{schedule.when}</p>
            {schedule.last_error && <p className="text-sm text-red-600 dark:text-red-400">Last try: {schedule.last_error}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <CancelScheduleButton schedule={schedule} api={api} onChange={load} />
          </div>
        </li>
      ))}
    </ul>
  );
}
