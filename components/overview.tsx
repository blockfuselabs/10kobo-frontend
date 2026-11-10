'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { ActivityEntry, ApiClient, Invoice, Me, WalletSummary } from '@/lib/api/client';
import { ArrowInIcon, ArrowOutIcon, CalendarIcon, InvoiceIcon, PhoneIcon } from './icons';
import { Spinner } from './panels';

export type OverviewTarget = 'send' | 'airtime' | 'receive' | 'invoices' | 'activity' | 'schedules';

const wholeNaira = (amount: string) => amount.replace(/\.\d+$/, '');
const nairaOf = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const OPEN_INVOICE: ReadonlySet<Invoice['status']> = new Set(['unpaid', 'overdue', 'being_paid']);

function limitLeftPercent(summary: WalletSummary): number {
  const value = (amount: string) => Number(amount.replace(/[^\d.]/g, ''));
  const left = value(summary.limit_left);
  const total = left + value(summary.limit_used);
  return total > 0 ? Math.round((left / total) * 100) : 0;
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Action({ label, detail, icon, onClick, strong = false }: { label: string; detail: string; icon: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-[transform,background-color] hover:-translate-y-0.5 ${
        strong ? 'border-transparent bg-[#141414] text-white' : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${strong ? 'bg-white/15' : 'bg-[var(--surface-2)] group-hover:bg-[var(--surface)]'}`}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-xs ${strong ? 'text-white/75' : 'text-[var(--muted)]'}`}>{detail}</span>
      </span>
    </button>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkButton = 'cursor-pointer text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]';

/** The signed-in home: money first, then what happened, with the assistant one line away. */
export function Overview({
  api,
  me,
  summary,
  balanceError,
  onRefreshBalance,
  address,
  extra,
  onGo,
  onSuggest,
}: {
  api: ApiClient;
  me: Me | null;
  summary: WalletSummary | null;
  balanceError?: string | null;
  onRefreshBalance?: () => void;
  address: string | null | undefined;
  extra?: ReactNode;
  onGo: (target: OverviewTarget) => void;
  onSuggest: (text: string) => void;
}) {
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null);
  const [activityFailed, setActivityFailed] = useState(false);
  const [invoicesFailed, setInvoicesFailed] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.activity(1).then((page) => !cancelled && (setActivity(page.activity.slice(0, 5)), setActivityFailed(false)), () => !cancelled && setActivityFailed(true));
      api.invoices().then((list) => !cancelled && (setInvoices(list), setInvoicesFailed(false)), () => !cancelled && setInvoicesFailed(true));
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api]);

  const open = (invoices ?? []).filter((invoice) => OPEN_INVOICE.has(invoice.status));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const paidThisMonth = (invoices ?? []).filter((invoice) => invoice.status === 'paid' && invoice.paid_at && new Date(invoice.paid_at).getTime() >= monthStart);
  const name = me?.email?.split('@')[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-[var(--muted)]">{greeting()}{name ? `, ${name}` : ''}</p>
        <h1 className="page-title">Your money</h1>
      </div>

      {extra}

      <section className="wallet-summary relative overflow-hidden rounded-3xl p-5 md:p-7">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-[var(--pop)] opacity-25 blur-2xl" />
        <p className="text-sm opacity-70">Balance</p>
        <p data-testid="balance" className="amount mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {summary?.balance_usdc ? (
            <>
              <span className="text-4xl font-semibold tracking-tight md:text-5xl">{summary.balance_usdc}</span>
              {summary.balance_naira && <span className="text-base opacity-70">≈ {summary.balance_naira}</span>}
            </>
          ) : (
            <span className="text-lg opacity-70">{balanceError ? 'Balance unavailable' : address ? 'Checking your balance…' : 'Setting up your wallet…'}</span>
          )}
        </p>
        {balanceError && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><p role="status" className="text-[var(--muted)]">{balanceError}</p><button type="button" className="btn-secondary" onClick={onRefreshBalance}>Try again</button></div>}
        {summary?.latest && (
          <button
            type="button"
            onClick={() => onGo('activity')}
            data-testid="latest"
            title="See all activity"
            className="mt-3 flex max-w-full cursor-pointer items-center gap-2 text-left text-sm opacity-80 hover:opacity-100"
          >
            <span className="truncate">Latest: {summary.latest.description}</span>
            <span className="amount shrink-0 font-semibold">
              {summary.latest.direction === 'in' ? '+' : '−'}
              {summary.latest.amount_naira ?? summary.latest.amount_usdc} ›
            </span>
          </button>
        )}
        {summary?.deposit_on_the_way && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium" data-testid="deposit-on-the-way">
            <Spinner /> {summary.deposit_on_the_way} on its way
          </p>
        )}
        <div className="mt-6 grid gap-4 border-t border-current/15 pt-4 sm:grid-cols-2">
          {summary && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-xs">
                <span className="opacity-70">Left to send today</span>
                <span className="amount font-semibold">{wholeNaira(summary.limit_left)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-current/15" aria-hidden>
                <div className="h-full rounded-full bg-[var(--pop)]" style={{ width: `${limitLeftPercent(summary)}%` }} />
              </div>
            </div>
          )}
          {summary?.naira_per_usdc && (
            <p className="amount flex justify-between gap-2 text-xs sm:flex-col sm:items-end sm:justify-start sm:gap-1" data-testid="rate">
              <span className="opacity-70">Today&apos;s rate</span>
              <span className="font-semibold">₦{summary.naira_per_usdc.toLocaleString('en-NG', { maximumFractionDigits: 2 })} per $1</span>
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Action label="Send" detail="Bank, wallet or phone" icon={<ArrowOutIcon />} onClick={() => onGo('send')} />
        <Action label="Deposit" detail="Naira or crypto" icon={<ArrowInIcon />} onClick={() => onGo('receive')} />
        <Action label="New invoice" detail="Get paid by link" icon={<InvoiceIcon />} onClick={() => onSuggest('Make an invoice for ')} />
        <Action label="Airtime & data" detail="MTN, Airtel, Glo, 9mobile" icon={<PhoneIcon />} onClick={() => onGo('airtime')} />
      </div>



      <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Recent activity" action={<button type="button" className={linkButton} onClick={() => onGo('activity')}>See all ›</button>}>
          {activityFailed ? (<p role="status" className="text-sm text-[var(--muted)]">Activity is unavailable right now. Open Activity to try again.</p>) : activity === null ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nothing yet. Your payments and deposits will show here.</p>
          ) : (
            <ul className="flex flex-col">
              {activity.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onGo('activity')}
                    className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--line)] py-2.5 text-left last:border-b-0"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${entry.direction === 'in' ? 'bg-[var(--pop)] text-[#111]' : 'bg-[var(--surface-2)]'}`}>
                      {entry.direction === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{entry.description}</span>
                      <span className="truncate text-xs text-[var(--muted)]">{when(entry.created_at)} · {entry.type_label}</span>
                    </span>
                    <span className="amount shrink-0 text-sm font-semibold">
                      {entry.direction === 'in' ? '+' : '−'}
                      {entry.amount_naira ?? entry.amount_usdc}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Invoices" action={<button type="button" className={linkButton} onClick={() => onGo('invoices')}>Open ›</button>}>
            {invoicesFailed ? (<p role="status" className="text-sm text-[var(--muted)]">Invoices are unavailable right now. Open Invoices to try again.</p>) : invoices === null ? (
              <p className="text-sm text-[var(--muted)]">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="text-xs text-[var(--muted)]">Waiting</span>
                  <span className="amount text-lg font-semibold">{nairaOf(open.reduce((sum, invoice) => sum + invoice.amount_naira, 0))}</span>
                  <span className="text-xs text-[var(--muted)]">{open.length} invoice{open.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="text-xs text-[var(--muted)]">Paid this month</span>
                  <span className="amount text-lg font-semibold">{nairaOf(paidThisMonth.reduce((sum, invoice) => sum + invoice.amount_naira, 0))}</span>
                  <span className="text-xs text-[var(--muted)]">{paidThisMonth.length} invoice{paidThisMonth.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            )}
          </Panel>
          <button
            type="button"
            onClick={() => onGo('schedules')}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-2)]"><CalendarIcon /></span>
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-semibold">Scheduled payments</span>
              <span className="text-xs text-[var(--muted)]">Monthly and later payments</span>
            </span>
            <span className="text-[var(--muted)]">›</span>
          </button>
        </div>
      </div>

    </div>
  );
}
