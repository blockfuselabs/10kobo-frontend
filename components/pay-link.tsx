'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Public: whoever opens the link has no account, so this page uses neither sign-in nor a wallet connection.
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const CHAINS = [
  { id: 'base', name: 'Base', hint: '0x… address' },
  { id: 'near', name: 'NEAR', hint: 'name.near' },
  { id: 'arbitrum', name: 'Arbitrum', hint: '0x… address' },
  { id: 'ethereum', name: 'Ethereum', hint: '0x… address' },
  { id: 'solana', name: 'Solana', hint: 'Solana address' },
  // Offered only when the receiver gets USDC on Base and the server says naira is open.
  { id: 'naira', name: 'Naira, by bank transfer', hint: '' },
] as const;

interface LinkPayment {
  id: string;
  status: string;
  pay_from: string;
  pay_usdc: string;
  receiver_gets_usdc?: string | null;
  naira_account?: { bank_name: string | null; account_number: string; account_name: string | null; amount_naira: number } | null;
  pay_token?: string;
  links?: { label: string; url: string }[];
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
  account_number: string | null;
  note: string | null;
  receives?: string;
  due_date?: string | null;
  overdue?: boolean;
  line_items?: { description: string; amount_naira: number }[] | null;
  open: boolean;
  naira_available?: boolean;
  cancelled?: boolean;
  merchant?: string | null;
  return_url?: string | null;
  paid: boolean;
  payment: LinkPayment | null;
}

const USDT_FROM = new Set(['near', 'ethereum', 'solana']);
const dueText = (date: string) => new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'long' });

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const chainName = (id: string) => CHAINS.find((chain) => chain.id === id)?.name ?? id;

const CHECKING = 'The time to send has passed. We are checking whether your payment arrived, which can take up to 15 minutes. Please do not send again.';
const NAIRA_PROGRESS: Record<string, string> = {
  checking: CHECKING.replace('send again', 'transfer again'),
  processing: 'Your transfer arrived. The USDC is on its way to the receiver.',
};
const PROGRESS: Record<string, string> = {
  checking: CHECKING,
  processing: 'We see your payment and are moving it.',
  paying: 'Your USDC arrived. The bank payment is on its way.',
};

function Countdown({ until, onEnd }: { until: string; onEnd: () => void }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const timer = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  const ended = left <= 0;
  useEffect(() => {
    if (ended) onEnd();
  }, [ended, onEnd]);
  if (ended) return <span className="text-red-600 dark:text-red-400">Expired</span>;
  const seconds = Math.floor(left / 1000);
  return <span role="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>;
}

function CopyRow({ label, value, testId, copy = value }: { label: string; value: string; testId: string; copy?: string }) {
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
          void navigator.clipboard?.writeText(copy).then(() => {
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

export function PayLinkPage({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [link, setLink] = useState<PublicLink | null>(null);
  const [missing, setMissing] = useState(false);
  const [chain, setChain] = useState<string>('base');
  const [refundTo, setRefundTo] = useState('');
  const [token, setToken] = useState<'USDC' | 'USDT'>('USDC');
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

  const moving = Boolean(link?.payment && ['awaiting_deposit', 'checking', 'processing', 'paying'].includes(link.payment.status));
  // Keeps watching after an address expires too, because money sent just in time can show up a little later.
  const watching = Boolean(link?.payment && !link.paid);
  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => void load().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [watching, load]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API}/v1/public/pay-links/${id}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(chain === 'naira' ? { pay_from: 'naira' } : { pay_from: chain, pay_token: USDT_FROM.has(chain) ? token : 'USDC', refund_to: refundTo.trim() }),
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

  // Inside a shop's page, tells the page how the payment is going, so it can react at once. It is told nothing
  // the payer cannot see here, and the shop's server still confirms with 10kobo before handing anything over.
  const reported = link ? (link.paid ? 'paid' : link.cancelled ? 'cancelled' : (payment?.status ?? 'open')) : null;
  useEffect(() => {
    if (embedded && reported && window.parent !== window) window.parent.postMessage({ source: '10kobo', type: 'status', invoice: id, status: reported }, '*');
  }, [embedded, reported, id]);
  const closeBox = () => window.parent.postMessage({ source: '10kobo', type: 'close', invoice: id }, '*');
  // Tells the box how tall this page is, so it fits the checkout instead of leaving empty space.
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const page = pageRef.current;
    if (!embedded || !page || window.parent === window) return;
    const report = () => window.parent.postMessage({ source: '10kobo', type: 'height', invoice: id, height: Math.ceil(page.getBoundingClientRect().height) }, '*');
    const watcher = new ResizeObserver(report);
    watcher.observe(page);
    report();
    return () => watcher.disconnect();
  }, [embedded, id]);
  // Keys pressed inside the box reach this page, not the shop's, so Esc is handled here.
  useEffect(() => {
    if (!embedded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.parent.postMessage({ source: '10kobo', type: 'close', invoice: id }, '*');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [embedded, id]);
  const waiting = payment?.status === 'awaiting_deposit' && payment.deposit_address;
  const nairaWaiting = payment?.status === 'awaiting_deposit' && payment.pay_from === 'naira';
  const chosen = CHAINS.find((item) => item.id === chain)!;

  return (
    <main ref={pageRef} className={embedded ? 'flex flex-col items-center bg-[var(--background)] px-4 pt-6 pb-5' : 'flex min-h-dvh flex-col items-center bg-[var(--background)] px-4 py-10'}>
      <p className="font-display mb-8 text-2xl font-bold tracking-tight">10kobo</p>
      <section className={`flex w-full ${embedded ? '' : 'max-w-md'} flex-col gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm`} aria-label="Pay this link">
        {missing && <p className="font-medium">This pay link does not exist. Please check it with the person who sent it.</p>}
        {!missing && !link && !error && <p className="text-[var(--muted)]">Loading…</p>}
        {link && (
          <>
            <div>
              <p className="text-sm text-[var(--muted)]" data-testid="link-payee">{link.merchant ? `Pay ${link.merchant}` : 'Pay'}</p>
              <p className="amount text-4xl font-semibold tracking-tight" data-testid="link-amount">{naira(link.amount_naira)}</p>
              <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">to {link.to}{link.account_number ? `, ${link.bank_name} ${link.account_number}` : ''}{link.receives?.startsWith('USDC') ? `, paid as ${link.receives}` : ''}</p>
              {link.note && <p className="mt-2 text-sm">For: {link.note}</p>}
              {link.due_date && !link.paid && (
                <p className={`mt-1 text-sm ${link.overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-[var(--muted)]'}`} data-testid="due-date">{link.overdue ? 'Was due' : 'Due'} {dueText(link.due_date)}</p>
              )}
            </div>
            {link.line_items?.length ? (
              <ul className="inset flex flex-col gap-1.5 p-3.5 text-sm" aria-label="Invoice items" data-testid="line-items">
                {link.line_items.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item.description}</span><span className="amount shrink-0">{naira(item.amount_naira)}</span></li>
                ))}
              </ul>
            ) : null}

            {link.paid && (
              <div className="inset p-4" data-testid="link-paid">
                <p className="font-semibold">{link.receives?.startsWith('USDC') ? 'Paid. The USDC was delivered.' : 'Paid. The bank payment was sent.'}</p>
                <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{link.receives?.startsWith('USDC') ? `The USDC went to ${link.to} on ${link.receives.replace('USDC on ', '')}.` : `${naira(link.amount_naira)} went to the ${link.bank_name} account above.`}</p>
                {embedded ? (
                  <button type="button" className="btn-primary mt-3 w-full" onClick={closeBox} data-testid="link-done">Done, back to {link.merchant ?? 'the shop'}</button>
                ) : (
                  link.return_url && <a className="btn-primary mt-3 block text-center" href={link.return_url} data-testid="link-return">Back to {link.merchant ?? 'the shop'}</a>
                )}
                {payment?.links?.map((proof) => (
                  <a key={proof.url} className="mt-1 mr-3 inline-block text-sm font-medium underline underline-offset-2" href={proof.url} target="_blank" rel="noreferrer">{proof.label}</a>
                ))}
              </div>
            )}

            {!link.paid && !link.open && !moving && <p className="font-medium">{link.cancelled ? 'This invoice was cancelled. Please ask the person who sent it.' : 'This pay link is not open right now. Please ask the person who sent it.'}</p>}

            {link.open && !moving && (
              <>
                {payment?.failure_reason && <p className="text-sm text-[var(--muted)]" data-testid="link-last-try">{payment.status === 'expired' ? (payment.pay_from === 'naira' ? 'The last bank account has expired. Do not transfer to it. Continue to get a new one.' : 'The last payment address has expired. Do not send to it. Continue to get a new one.') : `Your last try ended: ${payment.failure_reason}`}</p>}
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Pay from</legend>
                  <div className="flex flex-wrap gap-2">
                    {CHAINS.filter((item) => item.id !== 'naira' || link.naira_available).map((item) => (
                      <button key={item.id} type="button" aria-pressed={chain === item.id} onClick={() => setChain(item.id)} className={`btn-small rounded-full border ${chain === item.id ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--line)]'}`}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {chain === 'naira' && (
                  <p className="text-sm text-[var(--muted)]" data-testid="naira-note">
                    You will get a Nigerian bank account to transfer to. Once your naira arrives, it becomes USDC and goes to {link.to} on Base.
                  </p>
                )}
                {USDT_FROM.has(chain) && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">Pay with</legend>
                    <div className="flex gap-2">
                      {(['USDC', 'USDT'] as const).map((item) => (
                        <button key={item} type="button" aria-pressed={token === item} onClick={() => setToken(item)} className={`btn-small rounded-full border ${token === item ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--line)]'}`}>{item}</button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {chain !== 'naira' && <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Your {chosen.name} address, for any refund
                  <input className="field font-normal" value={refundTo} onChange={(event) => setRefundTo(event.target.value)} placeholder={chosen.hint} autoComplete="off" spellCheck={false} />
                </label>}
                <button className="btn-primary" disabled={busy || (chain !== 'naira' && refundTo.trim().length < 2)} onClick={() => void pay()}>
                  {busy ? 'Getting the details…' : 'Continue'}
                </button>
              </>
            )}

            {nairaWaiting && payment.naira_account && (
              <>
                <div className="inset flex items-center justify-between p-3.5">
                  <p className="text-sm">This account is valid for</p>
                  <p className="font-mono text-xl font-semibold">{payment.deposit_deadline ? <Countdown until={payment.deposit_deadline} onEnd={() => void load().catch(() => undefined)} /> : ''}</p>
                </div>
                <div className="inset px-3.5 py-1">
                  <CopyRow label="Transfer exactly" value={naira(payment.naira_account.amount_naira)} copy={String(payment.naira_account.amount_naira)} testId="naira-amount" />
                  <CopyRow label={`To this account${payment.naira_account.bank_name ? `, ${payment.naira_account.bank_name}` : ''}`} value={payment.naira_account.account_number} testId="naira-account" />
                  {payment.naira_account.account_name && (
                    <div className="py-2.5">
                      <p className="text-xs text-[var(--muted)]">Account name</p>
                      <p className="font-medium" data-testid="naira-account-name">{payment.naira_account.account_name}</p>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium [overflow-wrap:anywhere]" data-testid="link-route">
                  This account is only for this payment. Once your naira arrives, {payment.receiver_gets_usdc ? `about ${payment.receiver_gets_usdc} USDC` : 'the USDC'} goes to {link.to} on Base.
                </p>
                <p className="text-sm text-[var(--muted)]">Transfer the exact amount, in one transfer, from any Nigerian bank, before the time runs out.</p>
                <p className="text-sm font-medium">Waiting for your transfer…</p>
              </>
            )}

            {waiting && (
              <>
                <div className="inset flex items-center justify-between p-3.5">
                  <p className="text-sm">This address is valid for</p>
                  <p className="font-mono text-xl font-semibold">{payment.deposit_deadline ? <Countdown until={payment.deposit_deadline} onEnd={() => void load().catch(() => undefined)} /> : ''}</p>
                </div>
                <div className="inset px-3.5 py-1">
                  <CopyRow label={`Send exactly, in ${payment.pay_token ?? 'USDC'}`} value={payment.pay_usdc} testId="link-usdc" />
                  <CopyRow label={`To this one-time ${chainName(payment.pay_from)} address`} value={payment.deposit_address!} testId="link-address" />
                </div>
                <p className="text-sm font-medium [overflow-wrap:anywhere]" data-testid="link-route">
                  This address is only for this payment. It is not the receiver&apos;s account.{' '}
                  {link.receives?.startsWith('USDC') ? `Once your ${payment.pay_token ?? 'USDC'} arrives, ${payment.receiver_gets_usdc ? `about ${payment.receiver_gets_usdc} USDC` : 'the USDC'} goes on to ${link.to} on ${link.receives.replace('USDC on ', '')}.` : `Once your ${payment.pay_token ?? 'USDC'} arrives, ${naira(link.amount_naira)} goes to the ${link.bank_name} account above.`}
                </p>
                <p className="text-sm text-[var(--muted)]">Send only {payment.pay_token ?? 'USDC'}, only on {chainName(payment.pay_from)}. Crypto sent on another network cannot be returned. Sending too little returns it to your refund address.</p>
                <p className="text-sm font-medium">Waiting for your payment…</p>
              </>
            )}

            {payment && (payment.pay_from === 'naira' ? NAIRA_PROGRESS : PROGRESS)[payment.status] && <p className="font-medium" data-testid="link-progress">{(payment.pay_from === 'naira' ? NAIRA_PROGRESS : PROGRESS)[payment.status]}</p>}
            {payment?.status === 'needs_support' && <p className="font-medium text-red-600 dark:text-red-400">{payment.failure_reason}</p>}
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
      {process.env.NEXT_PUBLIC_WALLET_CHAIN !== 'base' && <p className="mt-6 text-sm font-semibold" data-testid="test-version">Test version. No real money.</p>}
      <p className="mt-6 max-w-md text-center text-xs text-[var(--muted)]">You do not need an account. 10kobo does not hold your money: it goes straight to the payment route.</p>
    </main>
  );
}
