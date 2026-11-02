'use client';

import { useState } from 'react';
import type { ApiClient, ContactCard, Plan, PlanItem } from '@/lib/api/client';

const ROUTE_LABEL: Record<PlanItem['route'], string> = {
  airtime: 'Airtime',
  data: 'Data',
  bank: 'Bank transfer',
  usdc: 'USDC transfer',
};

const PAYMENT_LABEL = { pending: 'Processing', completed: 'Paid (simulated)', failed: 'Failed' } as const;

const STATUS_LABEL: Record<Plan['status'], string | null> = {
  proposed: null,
  approved: null,
  rejected: 'Rejected. Nothing was sent.',
  expired: 'This quote expired. Nothing was sent. Ask again for a new one.',
};

const primary = 'rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)] disabled:opacity-50';
const secondary = 'rounded-lg border border-[var(--line)] px-4 py-2 disabled:opacity-50';
const card = 'flex max-w-[85%] flex-col gap-3 self-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4';

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
  const notice = STATUS_LABEL[plan.status];

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
                <p className={item.payment_status === 'failed' ? 'text-sm text-red-600 dark:text-red-400' : 'text-sm'}>
                  {PAYMENT_LABEL[item.payment_status]}
                  {item.failure_reason ? `: ${item.failure_reason}` : ''}
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
        <div className="flex gap-2">
          <button className={primary} disabled={busy} onClick={() => void run(() => api.approvePlan(plan.id))}>
            {busy ? 'Working…' : 'Approve'}
          </button>
          <button className={secondary} disabled={busy} onClick={() => void run(() => api.rejectPlan(plan.id))}>
            Reject
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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

  if (contact.status === 'confirmed') {
    return <p className="self-start text-sm text-[var(--muted)]">Saved {contact.name}: {contact.detail}</p>;
  }
  return (
    <section className={card} aria-label="Confirm this recipient">
      <p>Is this {contact.name}?</p>
      <p className="break-words font-medium">{contact.detail}</p>
      <div className="flex gap-2">
        <button
          className={primary}
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api.confirmContact(contact.id);
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
