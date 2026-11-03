'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActivityEntry, ApiClient, Schedule, WalletSummary } from '@/lib/api/client';
import { CancelScheduleButton } from './cards';

const row = 'flex justify-between gap-4 border-b border-[var(--line)] py-3';

const dateOf = (value: string) =>
  new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ReceivePanel({ summary }: { summary: WalletSummary | null }) {
  const [copied, setCopied] = useState(false);
  const address = summary?.address;
  return (
    <section className="flex flex-col gap-3 py-4" aria-label="Receive USDC">
      <p className="font-medium">Add USDC</p>
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
      <p className="text-sm text-[var(--muted)]">It shows here a few moments after it arrives. Test version: test USDC on Base Sepolia only.</p>
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
