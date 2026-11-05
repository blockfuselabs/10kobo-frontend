'use client';

import { useCallback, useEffect, useState } from 'react';

// Public: whoever opens the link has no account, so this page uses neither sign-in nor a wallet connection.
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const CHAINS = [
  { id: 'base', name: 'Base', hint: '0x… address' },
  { id: 'near', name: 'NEAR', hint: 'name.near' },
  { id: 'arbitrum', name: 'Arbitrum', hint: '0x… address' },
  { id: 'ethereum', name: 'Ethereum', hint: '0x… address' },
  { id: 'solana', name: 'Solana', hint: 'Solana address' },
] as const;

interface LinkPayment {
  id: string;
  status: string;
  pay_from: string;
  pay_usdc: string;
  deposit_address: string | null;
  deposit_deadline: string | null;
  failure_reason: string | null;
  paid_at: string | null;
}

interface PublicLink {
  id: string;
  amount_naira: number;
  to: string;
  bank_name: string;
  account_number: string;
  note: string | null;
  open: boolean;
  paid: boolean;
  payment: LinkPayment | null;
}

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const chainName = (id: string) => CHAINS.find((chain) => chain.id === id)?.name ?? id;

const PROGRESS: Record<string, string> = {
  processing: 'We see your payment and are moving it.',
  paying: 'Your USDC arrived. The bank payment is on its way.',
};

function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const timer = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (left <= 0) return <span>Time is up</span>;
  const seconds = Math.floor(left / 1000);
  return <span role="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>;
}

function CopyRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="break-all font-medium" data-testid={testId}>{value}</p>
      </div>
      <button
        className="btn-small"
        onClick={() =>
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function PayLinkPage({ id }: { id: string }) {
  const [link, setLink] = useState<PublicLink | null>(null);
  const [missing, setMissing] = useState(false);
  const [chain, setChain] = useState<string>('base');
  const [refundTo, setRefundTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${API}/v1/public/pay-links/${id}`);
    if (response.status === 404 || response.status === 400) return setMissing(true);
    if (response.ok) setLink((await response.json()) as PublicLink);
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError('We could not load this link. Please check your connection.'));
  }, [load]);

  const moving = Boolean(link?.payment && ['awaiting_deposit', 'processing', 'paying'].includes(link.payment.status));
  useEffect(() => {
    if (!moving) return;
    const timer = setInterval(() => void load().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [moving, load]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API}/v1/public/pay-links/${id}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pay_from: chain, refund_to: refundTo.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'We could not set this up. Nothing was sent.');
      setLink(body as PublicLink);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not set this up. Nothing was sent.');
    } finally {
      setBusy(false);
    }
  };

  const payment = link?.payment ?? null;
  const waiting = payment?.status === 'awaiting_deposit' && payment.deposit_address;
  const chosen = CHAINS.find((item) => item.id === chain)!;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[var(--bg)] px-4 py-10 text-[var(--ink)]">
      <p className="font-display mb-8 text-2xl font-bold tracking-tight">10kobo</p>
      <section className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm" aria-label="Pay this link">
        {missing && <p className="font-medium">This pay link does not exist. Please check it with the person who sent it.</p>}
        {!missing && !link && !error && <p className="text-[var(--muted)]">Loading…</p>}
        {link && (
          <>
            <div>
              <p className="text-sm text-[var(--muted)]">Pay</p>
              <p className="amount text-4xl font-semibold tracking-tight" data-testid="link-amount">{naira(link.amount_naira)}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">to {link.to}, {link.bank_name} {link.account_number}</p>
              {link.note && <p className="mt-2 text-sm">For: {link.note}</p>}
            </div>

            {link.paid && (
              <div className="inset p-4" data-testid="link-paid">
                <p className="font-semibold">Paid. The bank payment was sent.</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{naira(link.amount_naira)} went to the {link.bank_name} account above.</p>
              </div>
            )}

            {!link.paid && !link.open && !moving && <p className="font-medium">This pay link is not open right now. Please ask the person who sent it.</p>}

            {link.open && !moving && (
              <>
                {payment?.failure_reason && <p className="text-sm text-[var(--muted)]">Your last try ended: {payment.failure_reason}</p>}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Pay in USDC from</legend>
                  <div className="flex flex-wrap gap-2">
                    {CHAINS.map((item) => (
                      <button key={item.id} type="button" aria-pressed={chain === item.id} onClick={() => setChain(item.id)} className={chain === item.id ? 'btn-small border-[var(--accent)] font-semibold' : 'btn-small'}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Your {chosen.name} address, for any refund
                  <input className="field font-normal" value={refundTo} onChange={(event) => setRefundTo(event.target.value)} placeholder={chosen.hint} autoComplete="off" spellCheck={false} />
                </label>
                <button className="btn-primary" disabled={busy || refundTo.trim().length < 2} onClick={() => void pay()}>
                  {busy ? 'Getting the details…' : 'Continue'}
                </button>
              </>
            )}

            {waiting && (
              <>
                <div className="inset flex items-center justify-between p-3.5">
                  <p className="text-sm">Send within</p>
                  <p className="font-mono text-xl font-semibold">{payment.deposit_deadline ? <Countdown until={payment.deposit_deadline} /> : ''}</p>
                </div>
                <div className="inset px-3.5 py-1">
                  <CopyRow label="Send exactly, in USDC" value={payment.pay_usdc} testId="link-usdc" />
                  <CopyRow label={`To this ${chainName(payment.pay_from)} address`} value={payment.deposit_address!} testId="link-address" />
                </div>
                <p className="text-sm text-[var(--muted)]">Send only USDC, only on {chainName(payment.pay_from)}. Crypto sent on another network cannot be returned. Sending too little returns your USDC to your refund address.</p>
                <p className="text-sm font-medium">Waiting for your payment…</p>
              </>
            )}

            {payment && PROGRESS[payment.status] && <p className="font-medium" data-testid="link-progress">{PROGRESS[payment.status]}</p>}
            {payment?.status === 'needs_support' && <p className="font-medium text-red-600 dark:text-red-400">{payment.failure_reason}</p>}
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
      <p className="mt-6 max-w-md text-center text-xs text-[var(--muted)]">You do not need an account. 10kobo does not hold your money: it goes straight to the payment route.</p>
    </main>
  );
}
