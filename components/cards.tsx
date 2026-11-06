'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Spinner } from './panels';
import { ReceiptDialog } from './receipt-dialog';
import type { AddressCheck, ApiClient, ContactCard, PaymentStatus, Plan, PlanItem, Schedule, ScheduleGroup } from '@/lib/api/client';
import { useWallet } from '@/lib/wallet/wallet';

const ROUTE_LABEL: Record<PlanItem['route'], string> = {
  airtime: 'Airtime',
  data: 'Data',
  bank: 'Bank transfer',
  usdc: 'USDC transfer',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: 'Processing',
  completed: 'Paid',
  failed: 'Failed',
  awaiting_signature: 'Waiting for your signature',
  funding: 'Confirming on the blockchain',
  funded: 'Processing',
  paying: 'Processing',
  returning: 'Failed. Returning your USDC',
  returned: 'Failed. Your USDC went back to your wallet',
  needs_support: 'Failed. Our team is on it',
};
const BAD: readonly PaymentStatus[] = ['failed', 'returning', 'returned', 'needs_support'];
const ADDRESS_NOTE: Record<AddressCheck, { text: string; warn: boolean }> = {
  used: { text: 'Valid address, already used on this network. This does not prove who owns it.', warn: false },
  contract: { text: 'This address is a smart contract, not a regular wallet. Some wallets are contracts, so check it is the right one.', warn: true },
  new: { text: 'This address has no history on this network. Check every character, or send a small amount first.', warn: true },
  unknown: { text: 'We could not check this address just now. Check every character before you approve.', warn: true },
};

/** The network and what we know about the address, because crypto sent to the wrong place cannot come back. */
function CryptoDetails({ network, check, deciding, receiverGets, seconds, feeWarning, token, caution }: { network?: string | null; check?: AddressCheck | null; deciding: boolean; receiverGets?: string | null; seconds?: number | null; feeWarning?: boolean; token?: string | null; caution?: string | null }) {
  const note = check ? ADDRESS_NOTE[check] : null;
  return (
    <>
      {network && <p className="text-sm font-medium" data-testid="network">Network: {network}</p>}
      {receiverGets && deciding && (
        <p className="amount text-sm font-medium" data-testid="receiver-gets">
          Receiver gets about {receiverGets}{deciding ? `, usually within ${deliveryMinutes(seconds)} minutes` : ''}
        </p>
      )}
      {deciding && caution && <p className="text-sm font-medium text-amber-700 dark:text-amber-400" data-testid="delivery-caution">{caution}</p>}
      {deciding && feeWarning && <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="fee-warning">The network fee is high for this amount. Sending more, or to another network, costs less.</p>}
      {deciding && receiverGets && <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="chain-warning">Check this is their address on {network}. An address on one network may not belong to the same person on another.</p>}
      {deciding && note && (
        <p data-testid="address-check" className={`text-sm ${note.warn ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--muted)]'}`}>{note.text}</p>
      )}
      {deciding && network && <p className="text-sm text-[var(--muted)]">The receiver must accept {token ?? 'USDC'} on {network}. Crypto sent to a wrong address or network cannot be returned.</p>}
    </>
  );
}

const SLOW_DELIVERY_MS = 3 * 60_000;

/** NEAR Intents' estimate covers only its own part. Base confirming and our check take about a minute more, as measured on 5 Nov. */
const deliveryMinutes = (seconds?: number | null) => Math.max(2, Math.ceil(((seconds ?? 60) + 60) / 60));

/** For USDC to another chain: where it is now, so nobody is left wondering after they sign. */
function DeliverySteps({ item }: { item: PlanItem }) {
  const moving = item.payment_status === 'paying' || item.payment_status === 'funded';
  const done = item.payment_status === 'completed';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!moving) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [moving]);
  const elapsed = item.paid_at ? Math.max(0, Math.floor((now - new Date(item.paid_at).getTime()) / 1000)) : 0;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const mark = (state: 'done' | 'now' | 'next') => (state === 'done' ? <span aria-hidden className="w-4 text-center">✓</span> : state === 'now' ? <span className="w-4"><Spinner /></span> : <span aria-hidden className="w-4 text-center text-[var(--muted)]">○</span>);
  return (
    <ol className="mt-1 flex flex-col gap-1 text-sm" aria-label="Delivery progress" data-testid="delivery-steps">
      <li className="flex items-center gap-2">{mark('done')} Sent from your wallet on Base</li>
      <li className="flex items-center gap-2">{mark(done ? 'done' : 'now')} {done ? `Moved to ${item.network}` : `Moving to ${item.network}`}</li>
      {moving && <li className="amount pl-6 text-[var(--muted)]" role="timer">{clock}, usually within {deliveryMinutes(item.delivery_seconds)} minutes</li>}
      <li className="flex items-center gap-2">
        {mark(done ? 'done' : 'next')} {done ? `Received: ${item.received ?? item.receiver_gets}` : 'Received by them'}
        {done && item.delivery_tx_url && <a className="font-medium underline underline-offset-2" href={item.delivery_tx_url} target="_blank" rel="noreferrer">View</a>}
      </li>
      {moving && elapsed * 1000 > SLOW_DELIVERY_MS && <li className="text-[var(--muted)]">This is taking longer than usual. Please do not send it again. We will tell you here when it arrives, or if it comes back to your wallet.</li>}
    </ol>
  );
}

const EXPLORER = process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? 'https://basescan.org/tx/' : 'https://sepolia.basescan.org/tx/';

const SCHEDULE_NOTICE: Partial<Record<Schedule['status'], string>> = {
  awaiting_signature: 'Waiting for your signature.',
  active: 'Scheduled. It will run by itself.',
  completed: 'Sent. We will tell you here once it is delivered.',
  cancelled: 'Cancelled. Nothing more will be sent.',
  failed: 'Stopped after failing several times.',
  rejected: 'Rejected. Nothing was set up.',
  expired: 'This expired. Nothing was set up. Ask again for a new one.',
};

const STATUS_LABEL: Record<Plan['status'], string | null> = {
  proposed: null,
  approved: null,
  rejected: 'Rejected. Nothing was sent.',
  expired: 'This quote expired. Nothing was sent. Ask again for a new one.',
};

const primary = 'btn-primary';
const secondary = 'btn-secondary';
const card = 'card rise';

/** Whether this user has a PIN to enter. Set once, for all the cards. */
export const PinContext = createContext(false);

function PinField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={4}
      aria-label="PIN"
      placeholder="PIN"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      className="field w-24"
    />
  );
}

function usePin() {
  const needed = useContext(PinContext);
  const [pin, setPin] = useState('');
  return { needed, pin, setPin, ready: !needed || pin.length === 4, value: needed ? pin : undefined };
}

const RESIGN_WAIT_MS = 2 * 60 * 1000;
const sendKey = (planId: string) => `10kobo:send:${planId}`;

function savedSend(planId: string): { hash?: string; at?: number } {
  try {
    return JSON.parse(localStorage.getItem(sendKey(planId)) ?? '{}') as { hash?: string; at?: number };
  } catch {
    return {};
  }
}

function rememberSend(planId: string, send: { hash?: string; at: number }): void {
  try {
    localStorage.setItem(sendKey(planId), JSON.stringify(send));
  } catch {
    // Private windows can refuse storage. The server's recheck and the signing window still protect the user.
  }
}

function forgetSend(planId: string): void {
  try {
    localStorage.removeItem(sendKey(planId));
  } catch {
    // Nothing to do.
  }
}

/** Only a clear refusal counts. Any other error could come after the wallet really sent the transaction. */
const userDeclined = (failure: unknown): boolean => /reject|denied|declin|cancel|closed/i.test(String((failure as Error)?.message ?? ''));

function useAction(onChange: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChange();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Opens the transaction on the block explorer, in a new tab. */
export function TxLink({ hash }: { hash: string }) {
  return (
    <a className="font-medium text-[var(--accent)] underline-offset-2 hover:underline" href={`${EXPLORER}${hash}`} target="_blank" rel="noreferrer">
      View
    </a>
  );
}

/** Shown once a payment has gone through. */
function Receipt({ hash, paidAt }: { hash: string | null | undefined; paidAt: string | null | undefined }) {
  const when = paidAt ? new Date(paidAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : null;
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--line)] pt-3 text-sm" aria-label="Receipt">
      <p className="font-medium">Receipt</p>
      {when && <p className="text-[var(--muted)]">{when}</p>}
      {hash && (
        <p className="break-all text-[var(--muted)]">
          Transaction {hash.slice(0, 10)}…{hash.slice(-6)} <TxLink hash={hash} />
        </p>
      )}
    </div>
  );
}

export function PlanApprovalCard({ plan, api, onChange }: { plan: Plan; api: ApiClient; onChange: () => Promise<unknown> }) {
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const closeReceipt = useCallback(() => setReceiptFor(null), []);
  const { busy, error, run } = useAction(onChange);
  const wallet = useWallet();
  const pin = usePin();
  const notice = STATUS_LABEL[plan.status];

  /**
   * Asks the wallet to sign, keeping the hash in the browser first. If telling the server fails or the page
   * reloads, the hash is sent again rather than the money. Only a clear "no" from the user drops the payment.
   */
  const sign = async (calls: Plan['calls']) => {
    if (calls.length === 0) return;
    const stored = savedSend(plan.id);
    if (stored.hash) return void (await api.fundPlan(plan.id, stored.hash));
    if (stored.at && Date.now() - stored.at < RESIGN_WAIT_MS) {
      throw new Error('Your last try may still be going through. Please wait two minutes before signing again.');
    }
    // The first send may have landed even though this page never heard about it.
    const fresh = await api.recheckPlan(plan.id);
    if (fresh.calls.length === 0) return;
    rememberSend(plan.id, { at: Date.now() });
    let hash: string;
    try {
      hash = await wallet.sendCalls(fresh.calls);
    } catch (failure) {
      if (!userDeclined(failure)) {
        throw new Error('We could not confirm this yet, and it may still go through. Please wait. Do not send it again.');
      }
      forgetSend(plan.id);
      await api.abandonPlan(plan.id);
      throw new Error('Not signed, so nothing was sent.');
    }
    rememberSend(plan.id, { hash, at: Date.now() });
    await api.fundPlan(plan.id, hash);
  };

  return (
    <section className={card} aria-label="Payments to approve">
      {receiptFor && <ReceiptDialog api={api} kind="payment" id={receiptFor} onClose={closeReceipt} />}
      <ul className="flex flex-col gap-3">
        {plan.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="break-words font-medium">{item.recipient_name}</p>
              {item.recipient_detail !== item.recipient_name && <p className="break-words text-sm text-[var(--muted)]">{item.recipient_detail}</p>}
              <p className="text-sm text-[var(--muted)]">
                {ROUTE_LABEL[item.route]}
                {item.data_plan ? `: ${item.data_plan}` : ''}
              </p>
              {item.route === 'usdc' && <CryptoDetails network={item.network} check={item.address_check} deciding={plan.status === 'proposed'} receiverGets={item.receiver_gets} seconds={item.delivery_seconds} feeWarning={item.fee_warning} token={item.receiver_token} caution={item.delivery_caution} />}
              {item.receiver_gets && item.payment_status && ['funded', 'paying', 'completed'].includes(item.payment_status) && !item.simulated ? (
                <DeliverySteps item={item} />
              ) : item.payment_status ? (
                <p className={BAD.includes(item.payment_status) ? 'text-sm text-red-600 dark:text-red-400' : 'text-sm'}>
                  {busy && item.payment_status === 'awaiting_signature' ? 'Processing' : PAYMENT_LABEL[item.payment_status]}
                  {item.payment_status === 'completed' && item.simulated ? ' (simulated)' : ''}
                  {item.failure_reason ? `: ${item.failure_reason}` : ''}
                </p>
              ) : null}
              {item.payment_status === 'completed' && !item.simulated && item.payment_id && (
                <button onClick={() => setReceiptFor(item.payment_id!)} className="mt-1 cursor-pointer text-sm font-medium underline underline-offset-2">Get receipt</button>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="amount font-semibold">{item.route === 'usdc' ? item.amount_usdc : item.amount_naira}</p>
              <p className="text-sm text-[var(--muted)]">{item.route === 'usdc' ? `about ${item.amount_naira}` : item.amount_usdc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="amount flex justify-between font-semibold">
        <span>Total</span>
        <span>{plan.total_naira} ({plan.total_usdc})</span>
      </p>
      {plan.items.every((item) => item.payment_status === 'completed') && <Receipt hash={plan.items[0]?.tx_hash} paidAt={plan.items[0]?.paid_at} />}
      {notice && <p className="text-sm text-[var(--muted)]">{notice}</p>}
      {plan.status === 'proposed' && (
        <div className="flex flex-wrap gap-2">
          {pin.needed && <PinField value={pin.pin} onChange={pin.setPin} />}
          <button
            className={primary}
            disabled={busy || !pin.ready}
            onClick={() =>
              void run(async () => {
                const approved = await api.approvePlan(plan.id, pin.value);
                await sign(approved.calls);
              })
            }
          >
            {busy ? 'Processing…' : 'Approve'}
          </button>
          <button className={secondary} disabled={busy} onClick={() => void run(() => api.rejectPlan(plan.id))}>
            Reject
          </button>
        </div>
      )}
      {plan.status === 'approved' && plan.calls.length > 0 && (
        <button className={primary} disabled={busy} onClick={() => void run(() => sign(plan.calls))}>
          {busy ? 'Processing…' : 'Sign'}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

/** Shown until a PIN exists, when PINs are required. */
export function SetPinCard({ api, onChange }: { api: ApiClient; onChange: () => Promise<unknown> }) {
  const { busy, error, run } = useAction(onChange);
  const [pin, setPin] = useState('');
  return (
    <section className={card} aria-label="Set your PIN">
      <p className="font-medium">Set a 4-digit PIN</p>
      <p className="text-sm text-[var(--muted)]">You will enter it to approve payments and save new recipients.</p>
      <div className="flex gap-2">
        <PinField value={pin} onChange={setPin} />
        <button className={primary} disabled={busy || pin.length !== 4} onClick={() => void run(() => api.setPin(pin))}>
          Save PIN
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

export function ScheduleApprovalCard({ group, api, onChange }: { group: ScheduleGroup; api: ApiClient; onChange: () => Promise<unknown> }) {
  const { busy, error, run } = useAction(onChange);
  const wallet = useWallet();
  const pin = usePin();
  const notice = SCHEDULE_NOTICE[group.status];

  const sign = async (calls: ScheduleGroup['calls']) => {
    if (calls.length === 0) return;
    let hash: string;
    try {
      hash = await wallet.sendCalls(calls);
    } catch {
      await api.abandonSchedules(group.group_id);
      throw new Error('Not signed, so nothing was set up.');
    }
    await api.activateSchedules(group.group_id, hash);
  };

  return (
    <section className={card} aria-label="Scheduled payments to approve">
      <ul className="flex flex-col gap-3">
        {group.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="break-words font-medium">{item.recipient_name}</p>
              {item.recipient_detail !== item.recipient_name && <p className="break-words text-sm text-[var(--muted)]">{item.recipient_detail}</p>}
              <p className="text-sm text-[var(--muted)]">
                {ROUTE_LABEL[item.route]}
                {item.data_plan ? `: ${item.data_plan}` : ''}
              </p>
              {item.route === 'usdc' && <CryptoDetails network={group.network} check={item.address_check} deciding={group.status === 'proposed'} />}
              <p className="text-sm font-medium">{item.when}</p>
              {item.last_error && <p className="text-sm text-red-600 dark:text-red-400">Last try: {item.last_error}</p>}
            </div>
            <p className="amount shrink-0 font-semibold">{item.amount}</p>
          </li>
        ))}
      </ul>
      {group.items
        .filter((item) => item.last_paid_at)
        .map((item) => (
          <Receipt key={item.id} hash={item.last_tx_hash} paidAt={item.last_paid_at} />
        ))}
      {notice && <p className="text-sm text-[var(--muted)]">{notice}</p>}
      {group.status === 'proposed' && (
        <>
          <p className="text-sm text-[var(--muted)]">You approve once. It then runs by itself, and you can cancel any time.</p>
          <div className="flex flex-wrap gap-2">
            {pin.needed && <PinField value={pin.pin} onChange={pin.setPin} />}
            <button
              className={primary}
              disabled={busy || !pin.ready}
              onClick={() =>
                void run(async () => {
                  const approved = await api.approveSchedules(group.group_id, pin.value);
                  await sign(approved.calls);
                })
              }
            >
              {busy ? 'Processing…' : 'Approve'}
            </button>
            <button className={secondary} disabled={busy} onClick={() => void run(() => api.rejectSchedules(group.group_id))}>
              Reject
            </button>
          </div>
        </>
      )}
      {group.status === 'awaiting_signature' && group.calls.length > 0 && (
        <button className={primary} disabled={busy} onClick={() => void run(() => sign(group.calls))}>
          {busy ? 'Processing…' : 'Sign'}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

/** Stops it first, then removes the permission from the wallet, so a declined signature still stops the payment. */
export function CancelScheduleButton({ schedule, api, onChange, label = 'Cancel' }: { schedule: Schedule; api: ApiClient; onChange: () => Promise<unknown>; label?: string }) {
  const { busy, error, run } = useAction(onChange);
  const wallet = useWallet();
  return (
    <>
      <button
        className={secondary}
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const { calls } = await api.cancelSchedule(schedule.id);
            if (calls.length === 0) return;
            await wallet.sendCalls(calls).catch(() => {
              throw new Error('Stopped in the app. The approval is still on your wallet until you sign. Our server will not use it.');
            });
          })
        }
      >
        {busy ? 'Processing…' : label}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}

export function CancelScheduleCard({ schedule, api, onChange }: { schedule: Schedule; api: ApiClient; onChange: () => Promise<unknown> }) {
  return (
    <section className={card} aria-label="Stop this scheduled payment">
      <p className="font-medium">
        {schedule.status === 'cancelled' ? 'Stopped' : 'Stop'}: {schedule.amount} to {schedule.recipient_name}
      </p>
      <p className="text-sm text-[var(--muted)]">{schedule.when}</p>
      {schedule.status === 'active' ? (
        <div className="flex gap-2">
          <CancelScheduleButton schedule={schedule} api={api} onChange={onChange} label="Yes, stop it" />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{SCHEDULE_NOTICE[schedule.status]}</p>
      )}
    </section>
  );
}

export function ContactConfirmCard({
  contact,
  api,
  onChange,
  onConfirmed,
}: {
  contact: ContactCard;
  api: ApiClient;
  onChange: () => Promise<unknown>;
  onConfirmed: (contactId: string) => Promise<unknown>;
}) {
  const { busy, error, run } = useAction(onChange);
  const pin = usePin();

  if (contact.status === 'confirmed') {
    return <p className="self-center rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-xs text-[var(--muted)]">Saved {contact.name}: {contact.detail}</p>;
  }
  return (
    <section className={card} aria-label="Confirm this recipient">
      <p>Is this {contact.name}?</p>
      <p className="break-words font-medium">{contact.detail}</p>
      <div className="flex flex-wrap gap-2">
        {pin.needed && <PinField value={pin.pin} onChange={pin.setPin} />}
        <button
          className={primary}
          disabled={busy || !pin.ready}
          onClick={() =>
            void run(async () => {
              await api.confirmContact(contact.id, pin.value);
              await onConfirmed(contact.id);
            })
          }
        >
          Yes, save
        </button>
        <button className={secondary} disabled={busy} onClick={() => void run(() => api.discardContact(contact.id))}>
          No, wrong one
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
