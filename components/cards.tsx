'use client';

import { createContext, useContext, useState } from 'react';
import type { ApiClient, ContactCard, PaymentStatus, Plan, PlanItem, Schedule, ScheduleGroup } from '@/lib/api/client';
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
const EXPLORER = process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? 'https://basescan.org/tx/' : 'https://sepolia.basescan.org/tx/';

const SCHEDULE_NOTICE: Partial<Record<Schedule['status'], string>> = {
  awaiting_signature: 'Waiting for your signature.',
  active: 'Scheduled. It will run by itself.',
  completed: 'Done.',
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

const primary = 'rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)] disabled:opacity-50';
const secondary = 'rounded-lg border border-[var(--line)] px-4 py-2 disabled:opacity-50';
const card = 'flex max-w-[85%] flex-col gap-3 self-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4';

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
      className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
    />
  );
}

function usePin() {
  const needed = useContext(PinContext);
  const [pin, setPin] = useState('');
  return { needed, pin, setPin, ready: !needed || pin.length === 4, value: needed ? pin : undefined };
}

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

export function PlanApprovalCard({ plan, api, onChange }: { plan: Plan; api: ApiClient; onChange: () => Promise<unknown> }) {
  const { busy, error, run } = useAction(onChange);
  const wallet = useWallet();
  const pin = usePin();
  const notice = STATUS_LABEL[plan.status];

  /** Records the approval, then asks the wallet to sign. Declining means nothing moved. */
  const sign = async (calls: Plan['calls']) => {
    if (calls.length === 0) return;
    let hash: string;
    try {
      hash = await wallet.sendCalls(calls);
    } catch {
      await api.abandonPlan(plan.id);
      throw new Error('Not signed, so nothing was sent.');
    }
    await api.fundPlan(plan.id, hash);
  };

  return (
    <section className={card} aria-label="Payments to approve">
      <ul className="flex flex-col gap-3">
        {plan.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-medium">{item.recipient_name}</p>
              <p className="break-words text-sm text-[var(--muted)]">{item.recipient_detail}</p>
              <p className="text-sm text-[var(--muted)]">
                {ROUTE_LABEL[item.route]}
                {item.data_plan ? `: ${item.data_plan}` : ''}
              </p>
              {item.payment_status && (
                <p className={BAD.includes(item.payment_status) ? 'text-sm text-red-600 dark:text-red-400' : 'text-sm'}>
                  {PAYMENT_LABEL[item.payment_status]}
                  {item.payment_status === 'completed' && item.simulated ? ' (simulated)' : ''}
                  {item.failure_reason ? `: ${item.failure_reason}` : ''}
                  {item.tx_hash && (
                    <>
                      {' '}
                      <a className="underline" href={`${EXPLORER}${item.tx_hash}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium">{item.route === 'usdc' ? item.amount_usdc : item.amount_naira}</p>
              <p className="text-sm text-[var(--muted)]">{item.route === 'usdc' ? `about ${item.amount_naira}` : item.amount_usdc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex justify-between font-medium">
        <span>Total</span>
        <span>{plan.total_naira} ({plan.total_usdc})</span>
      </p>
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
            {busy ? 'Working…' : 'Approve'}
          </button>
          <button className={secondary} disabled={busy} onClick={() => void run(() => api.rejectPlan(plan.id))}>
            Reject
          </button>
        </div>
      )}
      {plan.status === 'approved' && plan.calls.length > 0 && (
        <button className={primary} disabled={busy} onClick={() => void run(() => sign(plan.calls))}>
          {busy ? 'Working…' : 'Sign'}
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
              <p className="font-medium">{item.recipient_name}</p>
              <p className="break-words text-sm text-[var(--muted)]">{item.recipient_detail}</p>
              <p className="text-sm text-[var(--muted)]">
                {ROUTE_LABEL[item.route]}
                {item.data_plan ? `: ${item.data_plan}` : ''}
              </p>
              <p className="text-sm font-medium">{item.when}</p>
              {item.last_error && <p className="text-sm text-red-600 dark:text-red-400">Last try: {item.last_error}</p>}
            </div>
            <p className="shrink-0 font-medium">{item.amount}</p>
          </li>
        ))}
      </ul>
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
              {busy ? 'Working…' : 'Approve'}
            </button>
            <button className={secondary} disabled={busy} onClick={() => void run(() => api.rejectSchedules(group.group_id))}>
              Reject
            </button>
          </div>
        </>
      )}
      {group.status === 'awaiting_signature' && group.calls.length > 0 && (
        <button className={primary} disabled={busy} onClick={() => void run(() => sign(group.calls))}>
          {busy ? 'Working…' : 'Sign'}
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
        {busy ? 'Working…' : label}
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
    return <p className="self-start text-sm text-[var(--muted)]">Saved {contact.name}: {contact.detail}</p>;
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
