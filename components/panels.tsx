'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import type { ActivityEntry, ActivityPage, ApiClient, ChainDeposit, DepositNetwork, DepositTerms, Invoice, InvoiceStatus, NairaDeposit, Schedule, WalletSummary } from '@/lib/api/client';
import { CardHeader } from './card-header';
import { CancelScheduleButton, TxLink } from './cards';
import { ArrowInIcon, ArrowOutIcon, BankIcon, CalendarIcon, CheckIcon, CopyIcon, DownloadIcon, NetworksIcon, SearchIcon, WalletIcon } from './icons';
import { InvoiceForm } from './invoice-form';
import { NetworkPicker } from './network-picker';
import { shortenAddresses } from '@/lib/short-address';
import { asDollars, wholeNaira } from '@/lib/money-display';
import { ReceiptDialog } from './receipt-dialog';

const row = 'flex justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4';

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
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="break-words font-medium" data-testid={testId}>{value}</p>
      </div>
      <button
        className="btn-small"
        onClick={() => void navigator.clipboard?.writeText(copy).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

const STEPS = ['Waiting for your transfer', 'Naira received, sending your USDC', 'USDC in your wallet'];
const STEP_OF: Partial<Record<NairaDeposit['status'], number>> = { waiting: 0, processing: 1, completed: 2 };
const SLOW_AFTER_SECONDS = 15 * 60;

export function Spinner() {
  return <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)] align-[-2px]" />;
}

function DepositProgress({
  deposit,
  onDone,
  onClose,
  onSent,
  busy,
  inChat = false,
}: {
  deposit: NairaDeposit;
  onDone: () => void;
  onClose: () => void;
  onSent: () => void;
  busy: boolean;
  inChat?: boolean;
}) {
  const [showAccount, setShowAccount] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sent = deposit.user_sent;
  const seconds = useSecondsLeft(deposit.status === 'waiting' ? deposit.expires_at : null);
  useEffect(() => {
    if (!sent) return;
    setSentAt((old) => old ?? Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [sent]);
  const slow = sentAt !== null && now - sentAt > SLOW_AFTER_SECONDS * 1000;
  const closing = seconds > 0 && seconds < 300;
  const lookingLate = sent && (deposit.status === 'expired' || (deposit.status === 'waiting' && seconds === 0));
  const timedOut = !sent && (deposit.status === 'expired' || (deposit.status === 'waiting' && seconds === 0));
  const waiting = deposit.status === 'waiting' && !timedOut && !lookingLate;
  const step = lookingLate ? 0 : STEP_OF[deposit.status];
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const labels = sent ? ['Confirming your transfer', STEPS[1]!, STEPS[2]!] : STEPS;
  return (
    <div className="flex flex-col gap-3" aria-label="Naira deposit">
      {(sent && (waiting || lookingLate)) || deposit.status === 'processing' ? (
        <div className="flex flex-col gap-1 rounded-xl bg-[var(--accent-soft)] p-3.5" role="status" data-testid="deposit-coming">
          <p className="flex items-center gap-2 font-semibold"><Spinner /> Your {deposit.amount} is on its way</p>
          <p className="text-sm text-[var(--muted)]">
            {deposit.status === 'processing' ? 'We have your naira and are sending your USDC.' : 'We are confirming your transfer with the bank.'} This usually takes about 2 minutes, and you can leave this page. We will tell you here when it arrives.
          </p>
          {slow && <p className="mt-2 text-sm">This is taking longer than usual. If your bank shows the money left, please keep the receipt and contact support.</p>}
        </div>
      ) : null}
      {waiting && (!sent || showAccount) && (
        <>
          <div className="inset flex items-center justify-between p-3.5">
            <p className="text-sm">Account expires in</p>
            <p className={`font-mono text-xl font-semibold ${closing ? 'text-red-600 dark:text-red-400' : ''}`} role="timer" data-testid="deposit-timer">{clock}</p>
          </div>
          <div className="inset px-3.5 py-1">
            <CopyRow label="Send exactly" value={deposit.amount} copy={String(deposit.amount_naira)} testId="deposit-amount" />
            <CopyRow label={deposit.bank_name ?? 'Bank'} value={deposit.account_number} copy={deposit.account_number} testId="deposit-account" />
            {deposit.account_name && <p className="py-2 text-sm"><span className="text-[var(--muted)]">Account name: </span>{deposit.account_name}</p>}
          </div>
          <p className="text-sm text-[var(--muted)]">You get about {deposit.usdc}. Send the exact amount, in one transfer. This account works once.</p>
        </>
      )}
      {waiting && !sent && (
        <button className="btn-primary w-full" disabled={busy} onClick={onSent}>
          {busy ? 'Processing…' : 'I have sent the money'}
        </button>
      )}
      {waiting && sent && (
        <button className="self-start text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline" onClick={() => setShowAccount((value) => !value)}>
          {showAccount ? 'Hide account details' : 'Show account details'}
        </button>
      )}
      {timedOut && (
        <div className="inset p-3.5">
          <p className="font-semibold">This account has expired</p>
          <p className="text-sm text-[var(--muted)]">Please do not send money to it. If you already did, we will tell you here as soon as it is confirmed.</p>
        </div>
      )}
      {deposit.status === 'failed' && (
        <div className="inset p-3.5">
          <p className="font-semibold text-red-600 dark:text-red-400">This deposit could not be completed</p>
          <p className="text-sm text-[var(--muted)]">If money left your bank, please contact support with the amount and time.</p>
        </div>
      )}
      {step !== undefined && (
        <ol className="flex flex-col gap-2" aria-label="Progress">
          {labels.map((label, index) => (
            <li key={label} className={`flex items-center gap-2 text-sm ${index > step ? 'text-[var(--muted)]' : ''}`} aria-current={index === step ? 'step' : undefined}>
              <span aria-hidden className="w-4 text-center">
                {index < step || step === 2 ? '✓' : index === step && (sent || step === 1) ? <Spinner /> : index === step ? '●' : '○'}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {deposit.status === 'completed' && <p className="font-medium">About {deposit.usdc} added to your wallet.</p>}
      {deposit.status === 'cancelled' && <p className="text-sm text-[var(--muted)]">You closed this deposit for {deposit.amount}. Please do not send money to its account.</p>}
      {inChat
        ? waiting && !sent && (
            <button className="btn-secondary self-start" disabled={busy} onClick={onClose}>
              Cancel deposit
            </button>
          )
        : (deposit.status === 'completed' || timedOut || deposit.status === 'failed' || (waiting && !sent)) && (
            <button className="btn-secondary self-start" disabled={busy} onClick={deposit.status === 'completed' || timedOut || deposit.status === 'failed' ? onDone : onClose}>
              {deposit.status === 'completed' || timedOut || deposit.status === 'failed' ? 'Make a new deposit' : 'Cancel and start again'}
            </button>
          )}
    </div>
  );
}

/** The same details as the tab, on a card in the conversation, and it keeps itself up to date. */
export function DepositCard({ deposit: first, api, onChanged }: { deposit: NairaDeposit; api: ApiClient; onChanged: () => void }) {
  const [deposit, setDeposit] = useState(first);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = deposit.status;
  useEffect(() => {
    if (status !== 'waiting' && status !== 'processing' && status !== 'expired') return;
    const timer = setInterval(() => {
      api.getDeposit(deposit.id).then((fresh) => {
        if (!fresh) return;
        if (fresh.status === 'completed') onChanged();
        setDeposit(fresh);
      }, () => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [api, deposit.id, status, onChanged]);
  const act = async (work: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      after();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card rise" aria-label="Deposit card">
      <CardHeader Icon={BankIcon} title={<span className="amount">Deposit {deposit.amount}</span>}>Naira by bank transfer, into your wallet as USDC</CardHeader>
      <DepositProgress
        deposit={deposit}
        busy={busy}
        onDone={() => undefined}
        onClose={() => void act(() => api.closeDeposit(deposit.id), () => setDeposit({ ...deposit, status: 'cancelled' }))}
        onSent={() =>
          void act(() => api.depositSent(deposit.id), () => {
            setDeposit({ ...deposit, user_sent: true });
            onChanged();
          })
        }
        inChat
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

function DepositNaira({ api, onChanged, onSwitch }: { api: ApiClient; onChanged: () => void; onSwitch: (way: 'base' | 'other') => void }) {
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
        <DepositProgress
          deposit={deposit}
          busy={busy}
          onDone={() => void closeThen(deposit.id)}
          onClose={() => void closeThen(deposit.id)}
          onSent={() => {
            setBusy(true);
            setError(null);
            api.depositSent(deposit.id).then(
              () => {
                setDeposit({ ...deposit, user_sent: true });
                onChanged();
              },
              (failure: Error) => setError(failure.message),
            ).finally(() => setBusy(false));
          }}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </>
    );
  }
  if (unavailable)
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4" role="status">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Naira deposits are paused for now</p>
          <p className="text-sm text-[var(--muted)]">You can still add money with USDC, which arrives in a few moments. Naira transfers will be back here as soon as they reopen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-small bg-[var(--accent)] text-[var(--accent-text)]" onClick={() => onSwitch('base')}>Deposit USDC on Base</button>
          <button type="button" className="btn-small border border-[var(--line)] bg-[var(--surface)]" onClick={() => onSwitch('other')}>Use another network</button>
        </div>
      </div>
    );
  return (
    <form
      className="flex flex-col gap-3"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !busy) void start();
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span>Amount in naira</span>
        <span className="field flex items-center gap-2 py-3 focus-within:border-[var(--foreground)]">
          <span className="amount text-2xl font-semibold text-[var(--muted)]" aria-hidden>₦</span>
          <input
            className="amount min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-[var(--muted)]/50"
            inputMode="numeric"
            autoComplete="off"
            name="deposit-amount"
            aria-label="Amount in naira"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
          />
        </span>
      </label>
      {terms && (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-xs text-[var(--muted)]">
          <span>
            {valid ? <>You get about <span className="amount font-medium text-[var(--foreground)]">${(value / terms.rate).toFixed(2)}</span></> : amount !== '' ? `Enter between ${naira(terms.minimum_naira)} and ${naira(terms.maximum_naira)}` : `From ${naira(terms.minimum_naira)} to ${naira(terms.maximum_naira)}`}
          </span>
          <span className="amount">₦{terms.rate.toLocaleString('en-NG')} per $1</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={!valid || busy}>
        {busy ? 'Processing…' : 'Get bank account'}
      </button>
    </form>
  );
}

const CHAIN_DEPOSIT_STEP: Record<ChainDeposit['status'], string> = {
  waiting: 'Waiting for your transfer…',
  moving: 'Your transfer arrived. Turning it into USDC on Base…',
  delivered: 'Done. The USDC is in your wallet.',
  refunded: 'It could not be completed, so it went back to your refund address.',
  failed: 'Something went wrong. Our team is checking it. Do not send again.',
  expired: 'Nothing arrived in time. Anything sent late goes back to your refund address.',
};

/** From another network to the wallet on Base, through a one-time NEAR Intents address. */
function DepositOtherNetwork({ api, onChanged }: { api: ApiClient; onChanged: () => void }) {
  const [networks, setNetworks] = useState<DepositNetwork[]>([]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [chain, setChain] = useState('');
  const [token, setToken] = useState<'USDC' | 'USDT'>('USDC');
  const [amount, setAmount] = useState('');
  const [refundTo, setRefundTo] = useState('');
  const [deposit, setDeposit] = useState<ChainDeposit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seconds = useSecondsLeft(deposit?.status === 'waiting' ? deposit.deadline : null);

  useEffect(() => {
    api.chainDeposits().then((overview) => {
      setNetworks(overview.networks);
      setSaved(overview.refund_addresses);
    }).catch(() => setError('We could not load the networks. Please try again.'));
  }, [api]);

  const network = networks.find((item) => item.id === chain) ?? null;
  // A saved address for this kind of wallet fills in by itself, so it is typed once.
  const pick = (id: string) => {
    const next = networks.find((item) => item.id === id);
    setChain(id);
    setToken(next?.tokens[0] ?? 'USDC');
    setRefundTo(next ? (saved[next.family] ?? '') : '');
    setError(null);
  };

  const open = deposit && (deposit.status === 'waiting' || deposit.status === 'moving');
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      void api.getChainDeposit(deposit.id).then((latest) => {
        setDeposit(latest);
        if (latest.status === 'delivered') onChanged();
      }).catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [open, deposit?.id, api, onChanged]);

  const start = async () => {
    if (!network) return;
    setBusy(true);
    setError(null);
    try {
      setDeposit(await api.startChainDeposit({ pay_from: network.id, pay_token: token, amount: amount.trim(), refund_to: refundTo.trim() }));
      setSaved({ ...saved, [network.family]: refundTo.trim() });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not set this up. Nothing was sent.');
    } finally {
      setBusy(false);
    }
  };

  if (deposit) {
    return (
      <div className="flex flex-col gap-3" data-testid="chain-deposit">
        {deposit.status === 'waiting' && (
          <>
            <div className="inset flex items-center justify-between p-3.5">
              <span className="text-sm">This address is valid for</span>
              <span className="amount text-lg font-semibold" role="timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
            </div>
            <div className="inset px-3.5">
              <CopyRow label={`Send exactly, in ${deposit.token} on ${deposit.network}`} value={`${deposit.send} ${deposit.token}`} copy={deposit.send_exact.replace(/\.?0+$/, '')} testId="chain-deposit-amount" />
              <CopyRow label={`To this one-time ${deposit.network} address`} value={deposit.deposit_address} copy={deposit.deposit_address} testId="chain-deposit-address" />
            </div>
            <p className="text-sm font-medium">You get about {deposit.you_get} in your wallet on Base.</p>
            <p className="text-sm text-[var(--muted)]">Send only {deposit.token}, only on {deposit.network}, in one transfer. Less than this, or after the time runs out, goes back to {deposit.refund_to}.</p>
          </>
        )}
        <p className="font-medium" data-testid="chain-deposit-status">{CHAIN_DEPOSIT_STEP[deposit.status]}{deposit.received ? ` ${deposit.received} added.` : ''}</p>
        {deposit.delivery_tx_url && <a className="text-sm font-medium underline underline-offset-2" href={deposit.delivery_tx_url} target="_blank" rel="noreferrer">See it on Base</a>}
        {!open && <button className="btn-secondary self-start" onClick={() => { setDeposit(null); setAmount(''); }}>Make another deposit</button>}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (!busy) void start(); }}>
      <NetworkPicker label="Network you are sending from" networks={networks} value={chain} onChange={pick} />
      {network && (
        <>
          {network.tokens.length > 1 ? (
            <div className="flex flex-col gap-1 text-sm">
              <span id="chain-deposit-token">Token you are sending</span>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--surface-2)] p-1" role="group" aria-labelledby="chain-deposit-token">
                {network.tokens.map((item) => (
                  <button key={item} type="button" aria-pressed={token === item} onClick={() => setToken(item)} className={`rounded-xl py-2 font-medium ${token === item ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>{item}</button>
                ))}
              </div>
            </div>
          ) : (
            <p className="inset px-3.5 py-2.5 text-sm">From {network.name}, you send <strong className="font-semibold">{network.tokens[0]}</strong>.</p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Amount in {token}
            <input className="field text-lg font-medium" inputMode="decimal" autoComplete="off" name="chain-deposit-amount" placeholder="At least 1" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Your {network.name} address, for any refund
            <input className="field font-normal" autoComplete="off" spellCheck={false} name="chain-deposit-refund" value={refundTo} onChange={(event) => setRefundTo(event.target.value)} />
            <span className="text-xs text-[var(--muted)]">{saved[network.family] && saved[network.family] === refundTo.trim() ? 'Saved from last time. ' : ''}Used only if the deposit cannot go through. Not an exchange address, and not your 10kobo wallet.</span>
          </label>
        </>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={!network || busy || !amount || refundTo.trim().length < 2}>
        {busy ? 'Getting the address…' : 'Get deposit address'}
      </button>
    </form>
  );
}

const WAYS = [
  { id: 'naira', title: 'Bank transfer', detail: 'From any Nigerian bank, credited as USDC', Icon: BankIcon },
  { id: 'base', title: 'USDC on Base', detail: 'Directly to your wallet address', Icon: WalletIcon },
  { id: 'other', title: 'Other networks', detail: 'USDC or USDT from 14 networks', Icon: NetworksIcon },
] as const;
type Way = (typeof WAYS)[number]['id'];

export function ReceivePanel({ summary, api, onChanged }: { summary: WalletSummary | null; api: ApiClient; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  // One way at a time, so the page stays short. Naira first, as most people here add money that way.
  const [way, setWay] = useState<Way>('naira');
  const [nairaClosed, setNairaClosed] = useState(false);
  const chosenByHand = useRef(false);
  // When naira deposits are closed, open on a way that works instead of a dead end.
  useEffect(() => {
    api.depositTerms().then(
      () => setNairaClosed(false),
      () => {
        setNairaClosed(true);
        if (!chosenByHand.current) setWay('base');
      },
    );
  }, [api]);
  const address = summary?.address;
  return (
    <section className="flex flex-col gap-4" aria-label="Receive USDC">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Add money</h1>
        {summary?.balance_usdc && (
          <p className="text-sm text-[var(--muted)]">
            Balance: <span className="amount font-medium text-[var(--foreground)]">{asDollars(summary.balance_usdc)}</span>
            {summary.balance_naira && <span className="amount"> · {wholeNaira(summary.balance_naira)}</span>}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1" role="group" aria-label="How do you want to add money?">
        {WAYS.map((item) => {
          const chosen = way === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={chosen}
              title={item.detail}
              onClick={() => {
                chosenByHand.current = true;
                setWay(item.id);
              }}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors ${chosen ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]'}`}
              data-testid={`way-${item.id}`}
            >
              <item.Icon />
              <span>{item.title}</span>
              {item.id === 'naira' && nairaClosed && <span className="sr-only"> (Unavailable now)</span>}
            </button>
          );
        })}
      </div>

      {way === 'naira' && (
        <div className="panel">
          <p className="text-sm text-[var(--muted)]">Pay from any Nigerian bank. We give you an account to transfer to, and it arrives as dollars.</p>
          <DepositNaira api={api} onChanged={onChanged} onSwitch={(next) => { chosenByHand.current = true; setWay(next); }} />
        </div>
      )}

      {way === 'base' && (
        <div className="panel">
          <p className="text-sm text-[var(--muted)]">Send USDC from an exchange or wallet to your address below.</p>
          <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-y-2.5 rounded-xl border border-[var(--line)] p-4 text-sm">
            <dt className="text-[var(--muted)]">Network</dt>
            <dd className="font-medium">{process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? 'Base' : 'Base Sepolia (test network)'}</dd>
            <dt className="text-[var(--muted)]">Token</dt>
            <dd className="font-medium">USDC</dd>
            <dt className="self-start pt-1 text-[var(--muted)]">Your address</dt>
            <dd className="flex flex-col gap-2">
              <span className="break-all font-mono text-[13px] leading-5" data-testid="receive-address">{address ?? 'Your wallet is being set up…'}</span>
              {address && (
                <button className="btn-small gap-1.5 self-start border border-[var(--line)]" onClick={() => void navigator.clipboard?.writeText(address).then(() => setCopied(true))}>
                  {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy address'}
                </button>
              )}
            </dd>
          </dl>
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="note">
            Send only USDC on the Base network. Other tokens, or USDC on another network, may be lost.
          </p>
          <p className="text-sm text-[var(--muted)]">Your balance updates a few moments after the transfer arrives. Sending from another network? <button type="button" className="font-medium text-[var(--foreground)] underline underline-offset-2" onClick={() => setWay('other')}>Use another network</button>.</p>
        </div>
      )}

      {way === 'other' && (
        <div className="panel" aria-label="Deposit from another network">
          <p className="text-sm text-[var(--muted)]">USDC or USDT from Tron, Solana, Ethereum, BNB Chain and more. It arrives as dollars.</p>
          <DepositOtherNetwork api={api} onChanged={onChanged} />
        </div>
      )}
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = { completed: 'Done', paying: 'Processing', funded: 'Processing', funding: 'Confirming', awaiting_signature: 'Waiting for you', needs_support: 'Being checked', failed: 'Failed', returning: 'Returning', returned: 'Returned', pending: 'Processing' };
const NOT_MOVED = ['failed', 'returned'];
const TYPES = [
  ['', 'All types'],
  ['bank', 'Bank transfers'],
  ['airtime', 'Airtime'],
  ['data', 'Data'],
  ['usdc', 'USDC transfers'],
  ['deposit', 'Money received'],
] as const;
const TABS = [
  [undefined, 'All'],
  ['in', 'Money in'],
  ['out', 'Money out'],
] as const;

const detailRow = 'flex items-center justify-between gap-4 py-2.5';

/** A small copy button that says Copied for a moment. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" aria-label={label} title={label} className="shrink-0 cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function ActivityRow({ entry, onReceipt }: { entry: ActivityEntry; onReceipt: () => void }) {
  const [open, setOpen] = useState(false);
  const moved = !NOT_MOVED.includes(entry.status);
  const sign = !moved ? '' : entry.direction === 'in' ? '+' : '−';
  const done = entry.status === 'completed';
  const statusTone = entry.status === 'failed' || entry.status === 'needs_support' ? 'text-red-600 dark:text-red-400' : done ? 'text-[var(--muted)]' : 'text-amber-700 dark:text-amber-400';
  return (
    <li className="border-b border-[var(--line)] px-4 py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
          {entry.direction === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium first-letter:uppercase" title={entry.description}>{shortenAddresses(entry.description.replace(/^Sent USDC to /, 'Sent to '))}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-[var(--muted)]">
            <span>{entry.type_label} · {dateOf(entry.created_at)}</span>
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="cursor-pointer hover:text-[var(--foreground)]">{open ? '▾' : '▸'} Details</button>
            {entry.has_receipt && <button onClick={onReceipt} className="cursor-pointer font-medium text-[var(--foreground)] underline-offset-2 hover:underline">Receipt</button>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`amount font-semibold ${!moved ? 'text-[var(--muted)] line-through' : entry.direction === 'in' ? 'text-[var(--positive)]' : ''}`}>{sign}{asDollars(entry.amount_usdc)}</p>
          <p className="text-sm text-[var(--muted)]">
            {entry.amount_naira && <span className="amount">{wholeNaira(entry.amount_naira)} · </span>}
            <span className={statusTone}>{STATUS_LABEL[entry.status] ?? entry.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>
      {open && (
        <dl className="mt-2 ml-12 grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          {entry.detail && (
            <>
              <dt className="text-[var(--muted)]">{entry.direction === 'in' ? 'From' : 'To'}</dt>
              <dd className="flex min-w-0 items-center gap-2 font-medium">
                <span className="truncate" title={entry.detail}>{shortenAddresses(entry.detail)}</span>
                <CopyButton text={entry.detail} label="Copy address" />
              </dd>
            </>
          )}
          {entry.amount_naira && (
            <>
              <dt className="text-[var(--muted)]">Paid with</dt>
              <dd className="amount font-medium">{entry.amount_usdc}</dd>
            </>
          )}
          {entry.tx_hash && (
            <>
              <dt className="text-[var(--muted)]">Transaction</dt>
              <dd className="flex min-w-0 items-center gap-2 font-medium">
                <span className="truncate font-mono text-[13px]">{entry.tx_hash.slice(0, 8)}…{entry.tx_hash.slice(-6)}</span>
                <CopyButton text={entry.tx_hash} label="Copy transaction" />
                <TxLink hash={entry.tx_hash} label="View ↗" className="ml-auto shrink-0 text-sm font-medium underline underline-offset-2" />
              </dd>
            </>
          )}
        </dl>
      )}
    </li>
  );
}

export function ActivityPanel({ api }: { api: ApiClient }) {
  const [result, setResult] = useState<ActivityPage | null>(null);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<'in' | 'out' | undefined>(undefined);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [open, setOpen] = useState<ActivityEntry | null>(null);
  const closeReceipt = useCallback(() => setOpen(null), []);

  // Waits for a pause in typing, so it does not ask the server on every letter.
  useEffect(() => {
    // Only a real change goes back to page one, so opening the page cannot undo a click on Next.
    if (typed.trim() === search) return;
    const timer = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed, search]);

  useEffect(() => {
    let current = true;
    setError(null);
    api.activity(page, { direction, type, search, from, to }).then(
      (found) => {
        if (current) setResult(found);
      },
      (failure: Error) => {
        if (current) setError(failure.message);
      },
    );
    return () => {
      current = false;
    };
  }, [api, page, direction, type, search, from, to]);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await api.activityFile({ direction, type, search, from, to });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = '10kobo-activity.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const filtering = Boolean(direction || type || search || from || to);
  const pages = result ? Math.max(1, Math.ceil(result.total / result.per_page)) : 1;
  const control = 'rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm';
  return (
    <div className="flex flex-col gap-3">
      <div className="product-page-heading"><span className="product-eyebrow">YOUR PAYMENT RECORD</span><h1 className="page-title">Activity</h1><p>Follow your money, check a payment and keep its receipt.</p></div>
      <div role="tablist" aria-label="Filter by direction" className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
        {TABS.map(([value, label]) => (
          <button
            key={label}
            role="tab"
            aria-selected={direction === value}
            onClick={() => {
              setDirection(value);
              setPage(1);
            }}
            className={`cursor-pointer rounded-xl py-2 text-sm font-medium transition-colors ${direction === value ? 'bg-[var(--surface-2)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className={`${control} col-span-2 flex items-center gap-2 md:col-span-4`}>
          <SearchIcon />
          <input aria-label="Search transactions" name="activity-search" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Search by name" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className={`${control} w-full`}
        >
          {TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="From date"
          value={from}
          max={to || undefined}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
          className={`${control} w-full`}
        />
        <input
          type="date"
          aria-label="To date"
          value={to}
          min={from || undefined}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
          className={`${control} w-full`}
        />
        <button disabled={downloading || result?.total === 0} onClick={() => void download()} className={`${control} flex w-full cursor-pointer items-center justify-center gap-2 font-medium disabled:cursor-not-allowed disabled:opacity-50`}>
          <DownloadIcon />
          {downloading ? 'Preparing…' : 'Download list'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!result && !error && <p className="py-4 text-sm text-[var(--muted)]">Loading…</p>}
      {result?.total === 0 && <p className="py-6 text-center text-sm text-[var(--muted)]">{filtering ? 'Nothing matches those filters.' : 'Nothing yet. Your payments and deposits will show here.'}</p>}
      {result && result.total > 0 && (
        <ul aria-label="Activity" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {result.activity.map((entry) => (
            <ActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} onReceipt={() => setOpen(entry)} />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Activity pages" className="flex items-center justify-between gap-3">
          <button className="btn-secondary px-4 py-2 text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="amount text-sm text-[var(--muted)]">Page {page} of {pages}</span>
          <button className="btn-secondary px-4 py-2 text-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}
      {open && <ReceiptDialog api={api} kind={open.kind} id={open.id} onClose={closeReceipt} />}
    </div>
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
  if (schedules.length === 0) return <div className="flex flex-col gap-2"><h1 className="page-title">Scheduled</h1><div className="product-empty"><CalendarIcon /><h2>Your next payment, planned.</h2><p>No scheduled payments yet. Open Ask 10kobo and describe what you want to pay and when.</p><span>For example: “Send ₦500 airtime every month.”</span></div></div>;
  return (
    <div className="flex flex-col gap-4">
    <h1 className="page-title">Scheduled</h1>
    <ul aria-label="Scheduled payments" className="flex flex-col gap-2">
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
    </div>
  );
}

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: string }> = {
  unpaid: { label: 'Unpaid', tone: 'bg-[var(--surface-2)] text-[var(--foreground)]' },
  being_paid: { label: 'Being paid', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' },
  overdue: { label: 'Overdue', tone: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  paid: { label: 'Paid', tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-[var(--surface-2)] text-[var(--muted)]' },
  expired: { label: 'Expired', tone: 'bg-[var(--surface-2)] text-[var(--muted)]' },
};
const FILTERS = [
  ['all', 'All'],
  ['open', 'Unpaid'],
  ['paid', 'Paid'],
  ['closed', 'Cancelled or expired'],
] as const;
type InvoiceFilter = (typeof FILTERS)[number][0];
const inFilter = (invoice: Invoice, filter: InvoiceFilter) =>
  filter === 'all' ||
  (filter === 'open' && ['unpaid', 'overdue', 'being_paid'].includes(invoice.status)) ||
  (filter === 'paid' && invoice.status === 'paid') ||
  (filter === 'closed' && ['cancelled', 'expired'].includes(invoice.status));
const nairaOf = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const dayOf = (date: string) => new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium' });

/** The merchant's page: what is owed and paid, a way to make an invoice, every pay link, and the checkout button. */
const INVOICES_PER_PAGE = 5;

export function InvoicesPanel({ api, startCreating = false }: { api: ApiClient; startCreating?: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [creating, setCreating] = useState(startCreating);
  const [page, setPage] = useState(0);
  const load = useCallback(() => api.invoices().then(setInvoices, (failure: Error) => setError(failure.message)), [api]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error) return <p role="alert" className="py-4 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!invoices) return <p className="py-4 text-sm text-[var(--muted)]">Loading…</p>;
  const waiting = invoices.filter((invoice) => inFilter(invoice, 'open'));
  const overdue = invoices.filter((invoice) => invoice.status === 'overdue');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const paid = invoices.filter((invoice) => invoice.status === 'paid' && invoice.paid_at && new Date(invoice.paid_at).getTime() >= monthStart);
  const shown = invoices.filter((invoice) => inFilter(invoice, filter));
  const pages = Math.max(1, Math.ceil(shown.length / INVOICES_PER_PAGE));
  const onPage = Math.min(page, pages - 1);
  const pageOfInvoices = shown.slice(onPage * INVOICES_PER_PAGE, (onPage + 1) * INVOICES_PER_PAGE);
  const sum = (list: Invoice[]) => nairaOf(list.reduce((total, invoice) => total + invoice.amount_naira, 0));
  const stats = [
    ['Waiting to be paid', sum(waiting), `${waiting.length} invoice${waiting.length === 1 ? '' : 's'}`],
    ['Overdue', sum(overdue), `${overdue.length} invoice${overdue.length === 1 ? '' : 's'}`],
    ['Paid this month', sum(paid), `${paid.length} invoice${paid.length === 1 ? '' : 's'}`],
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Invoices</h1>
          <p className="text-sm text-[var(--muted)]">Get paid in naira or crypto. Your client needs no account.</p>
        </div>
        {!creating && (
          <button type="button" className="btn-small gap-1.5 bg-[var(--pop)] px-4 py-2.5 font-semibold text-[#111]" onClick={() => setCreating(true)}>
            + New invoice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(([label, amount, count]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <span className="text-xs text-[var(--muted)]">{label}</span>
            <span className="amount text-xl font-semibold">{amount}</span>
            <span className="text-xs text-[var(--muted)]">{count}</span>
          </div>
        ))}
      </div>

      {creating && <InvoiceForm api={api} onDone={() => void load()} onClose={() => setCreating(false)} />}

      {invoices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
          No invoices yet. Press New invoice, or ask in the chat, for example: make an invoice for my client, ₦5,000 for repairs, due 30 November.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => { setFilter(key); setPage(0); }}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${filter === key ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--muted)]" data-testid="invoice-summary">
              {waiting.length === 0 ? 'Nothing waiting to be paid.' : `${waiting.length} waiting to be paid, ${sum(waiting)} in all.`}
            </p>
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">None here.</p>
          ) : (
            <>
              <ul aria-label="Invoices" className="flex flex-col divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                {pageOfInvoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} api={api} onChange={load} />
                ))}
              </ul>
              {shown.length > 0 && (
                <nav aria-label="Invoice pages" className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--muted)]" data-testid="invoice-page">
                    {onPage * INVOICES_PER_PAGE + 1}–{Math.min((onPage + 1) * INVOICES_PER_PAGE, shown.length)} of {shown.length}
                  </span>
                  {pages > 1 && <span className="flex gap-2">
                    <button type="button" className={invoiceButton} disabled={onPage === 0} onClick={() => setPage(onPage - 1)}>Previous</button>
                    <button type="button" className={invoiceButton} disabled={onPage >= pages - 1} onClick={() => setPage(onPage + 1)}>Next</button>
                  </span>}
                </nav>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}

// Outlined, because the plain small button blends into the white card.
const invoiceButton = 'btn-small border border-[var(--line)] hover:border-[var(--muted)] hover:bg-[var(--surface-2)]';

/** One invoice, for its owner: what it asks for, where the money goes, what happened, and what can be done. */
function InvoiceDialog({ invoice, onClose, onCancel }: { invoice: Invoice; onClose: () => void; onCancel?: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState<'link' | 'address' | null>(null);
  const [proof, setProof] = useState<{ label: string; url: string }[]>([]);
  const status = INVOICE_STATUS[invoice.status];
  const live = ['unpaid', 'overdue', 'being_paid'].includes(invoice.status);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // The proof links (the transactions) come from the public record of the link, which anyone with the link can read.
  useEffect(() => {
    if (invoice.status !== 'paid') return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/public/pay-links/${invoice.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((link: { payment?: { links?: { label: string; url: string }[] } | null } | null) => !cancelled && setProof(link?.payment?.links ?? []))
      .catch(() => undefined);
    return () => void (cancelled = true);
  }, [invoice.id, invoice.status]);
  const copy = (what: 'link' | 'address', text: string) =>
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });
  const [address, way] = invoice.receives ? [invoice.to, invoice.receives] : [invoice.to, ''];
  const row = 'flex items-start justify-between gap-4 py-2.5 text-sm';
  return (
    <div role="dialog" aria-modal="true" aria-label="Invoice details" className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="rise flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
          <button ref={close} onClick={onClose} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-lg text-[var(--muted)] hover:bg-[var(--surface-2)]">×</button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-2 pb-5">
          <div className="flex flex-col gap-1">
            <p className="amount text-4xl font-semibold">{nairaOf(invoice.amount_naira)}</p>
            <p className="text-sm text-[var(--muted)]">{invoice.note ?? 'No description'}</p>
          </div>

          {invoice.line_items?.length ? (
            <div className="flex flex-col rounded-2xl border border-[var(--line)] px-4 py-1">
              {invoice.line_items.map((item, index) => (
                <div key={index} className={`${row} border-b border-[var(--line)]`}><span className="min-w-0 break-words">{item.description}</span><span className="amount shrink-0">{nairaOf(item.amount_naira)}</span></div>
              ))}
              <div className={`${row} font-semibold`}><span>Total</span><span className="amount">{nairaOf(invoice.amount_naira)}</span></div>
            </div>
          ) : null}

          <dl className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] px-4">
            <div className={row}>
              <dt className="text-[var(--muted)]">Pays to</dt>
              <dd className="flex min-w-0 items-center gap-2 text-right">
                <span className="truncate font-mono text-[13px]" title={address}>{shortenAddresses(address)}</span>
                <button type="button" aria-label="Copy address" className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => copy('address', address)}>{copied === 'address' ? <CheckIcon /> : <CopyIcon />}</button>
              </dd>
            </div>
            {way && <div className={row}><dt className="text-[var(--muted)]">Received as</dt><dd className="text-right">{way}</dd></div>}
            <div className={row}><dt className="text-[var(--muted)]">Created</dt><dd className="text-right">{dateOf(invoice.created_at)}</dd></div>
            {invoice.due_date && <div className={row}><dt className="text-[var(--muted)]">Due</dt><dd className={`text-right ${invoice.status === 'overdue' ? 'font-medium text-red-600 dark:text-red-400' : ''}`}>{dayOf(invoice.due_date)}</dd></div>}
            {invoice.paid_at && <div className={row}><dt className="text-[var(--muted)]">Paid</dt><dd className="text-right">{dateOf(invoice.paid_at)}</dd></div>}
            {live && <div className={row}><dt className="text-[var(--muted)]">Link expires</dt><dd className="text-right">{dateOf(invoice.expires_at)}</dd></div>}
          </dl>

          {proof.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[var(--muted)]">Proof of payment</p>
              <div className="flex flex-wrap gap-2">
                {proof.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className={`${invoiceButton} gap-1`}>{item.label} ↗</a>
                ))}
              </div>
            </div>
          )}
          {invoice.status === 'being_paid' && <p className="text-sm text-[var(--muted)]">Someone is paying this now, so it cannot be cancelled.</p>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-5 py-3">
          {live && (
            <button type="button" className="btn-small flex-1 gap-1.5 bg-[var(--accent)] text-[var(--accent-text)]" onClick={() => copy('link', invoice.url)}>
              {copied === 'link' ? <CheckIcon /> : <CopyIcon />} {copied === 'link' ? 'Copied' : 'Copy pay link'}
            </button>
          )}
          <a className={`${invoiceButton} flex-1 justify-center`} href={invoice.url} target="_blank" rel="noreferrer">Client&apos;s view ↗</a>
          {onCancel && live && invoice.status !== 'being_paid' && (
            <button type="button" className="btn-small border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40" onClick={() => { onClose(); onCancel(); }}>Cancel invoice</button>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, api, onChange }: { invoice: Invoice; api: ApiClient; onChange: () => Promise<unknown> }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const status = INVOICE_STATUS[invoice.status];
  const live = ['unpaid', 'overdue', 'being_paid'].includes(invoice.status);
  const copy = () =>
    void navigator.clipboard?.writeText(invoice.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.cancelInvoice(invoice.id);
      await onChange();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not cancel it. Please try again.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  return (
    <li className="flex flex-col" aria-label={`Invoice for ${nairaOf(invoice.amount_naira)}`}>
      {/* One line per invoice, like a statement. The details and buttons open under it. */}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{invoice.note ?? 'No description'}</span>
          <span className="truncate text-xs text-[var(--muted)]">{dateOf(invoice.created_at)}{invoice.due_date ? ` · due ${dayOf(invoice.due_date)}` : ''}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`} data-testid="invoice-status">{status.label}</span>
        <span className="amount w-24 shrink-0 text-right text-sm font-semibold">{nairaOf(invoice.amount_naira)}</span>
        <span aria-hidden className={`shrink-0 text-[var(--muted)] transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--surface-2)]/40 px-4 py-3">
      {invoice.line_items?.length ? (
        <ul className="flex flex-col gap-0.5 text-sm text-[var(--muted)]">
          {invoice.line_items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item.description}</span><span className="amount shrink-0">{nairaOf(item.amount_naira)}</span></li>
          ))}
        </ul>
      ) : null}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-sm">
        <dt className="text-[var(--muted)]">Pays to</dt>
        <dd className="[overflow-wrap:anywhere]" title={invoice.to}>{shortenAddresses(invoice.to)}, {invoice.receives}</dd>
        <dt className="text-[var(--muted)]">Made</dt>
        <dd>{dateOf(invoice.created_at)}</dd>
        {invoice.due_date && (
          <>
            <dt className="text-[var(--muted)]">Due</dt>
            <dd className={invoice.status === 'overdue' ? 'font-medium text-red-600 dark:text-red-400' : ''}>{dayOf(invoice.due_date)}</dd>
          </>
        )}
        {invoice.paid_at && (
          <>
            <dt className="text-[var(--muted)]">Paid</dt>
            <dd>{dateOf(invoice.paid_at)}</dd>
          </>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={invoiceButton} onClick={() => setViewing(true)}>View details</button>
        {live && (
          <button type="button" className={`${invoiceButton} gap-1.5`} onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        )}
        {live && invoice.status !== 'being_paid' && !confirming && (
          <button type="button" className="btn-small border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40" onClick={() => setConfirming(true)}>Cancel invoice</button>
        )}
        {confirming && (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
            <span className="mr-auto text-sm">Cancel this invoice? The link will stop working.</span>
            <button type="button" className={invoiceButton} disabled={busy} onClick={() => setConfirming(false)}>Keep it</button>
            <button type="button" className="btn-small bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={() => void cancel()}>{busy ? 'Cancelling…' : 'Yes, cancel it'}</button>
          </div>
        )}
      </div>
      {invoice.status === 'being_paid' && <p className="text-sm text-[var(--muted)]">Someone is paying this now, so it cannot be cancelled.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>}
      {viewing && <InvoiceDialog invoice={invoice} onClose={() => setViewing(false)} onCancel={() => { setOpen(true); setConfirming(true); }} />}
    </li>
  );
}
