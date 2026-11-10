'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { ActivityEntry, ApiClient, Invoice, Me, WalletSummary } from '@/lib/api/client';
import { ArrowInIcon, ArrowOutIcon, CalendarIcon, InvoiceIcon, PhoneIcon, EyeIcon } from './icons';
import { Spinner } from './panels';
import { shortenAddresses } from '@/lib/short-address';
import { asDollars, useHiddenBalance, wholeNaira } from '@/lib/money-display';

export type OverviewTarget = 'send' | 'airtime' | 'receive' | 'invoices' | 'new-invoice' | 'activity' | 'schedules';

const nairaOf = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const OPEN_INVOICE: ReadonlySet<Invoice['status']> = new Set(['unpaid', 'overdue', 'being_paid']);

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });


// On a phone: a row of four round buttons under the balance, like a banking app. On a computer: tiles with a line of detail.
function Action({ label, short, detail, icon, onClick }: { label: string; short?: string; detail: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-2 text-center md:items-start md:gap-3 md:rounded-2xl md:border md:border-[var(--line)] md:bg-[var(--surface)] md:p-4 md:text-left md:transition-[transform,background-color] md:hover:-translate-y-0.5 md:hover:bg-[var(--surface-2)]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] md:h-9 md:w-9 md:border-0 md:bg-[var(--surface-2)] md:group-hover:bg-[var(--surface)]">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-xs font-medium md:text-sm md:font-semibold"><span className="md:hidden">{short ?? label}</span><span className="hidden md:inline">{label}</span></span>
        <span className="hidden text-xs text-[var(--muted)] md:block">{detail}</span>
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
      api.activity(1).then((page) => !cancelled && (setActivity(page.activity.slice(0, 4)), setActivityFailed(false)), () => !cancelled && setActivityFailed(true));
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
  const [hidden, toggleHidden] = useHiddenBalance();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold md:text-2xl">{greeting()}{name ? `, ${name.charAt(0).toUpperCase()}${name.slice(1)}` : ''}</h1>

      {extra}

      {/* Like a banking app: the balance, a band with the rate, then the latest payment and a way to all of them. */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="p-5 md:p-7">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span>Your dollars</span>
            <button type="button" onClick={toggleHidden} aria-label={hidden ? 'Show balance' : 'Hide balance'} title={hidden ? 'Show balance' : 'Hide balance'} className="cursor-pointer rounded-md p-1 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">
              <EyeIcon off={hidden} />
            </button>
          </div>
          <p data-testid="balance" className="amount mt-1 flex flex-col gap-1">
            {summary?.balance_usdc ? (
              <>
                <span className="text-[2.25rem] leading-tight font-semibold tracking-tight md:text-[2.5rem]">{hidden ? '$••••' : asDollars(summary.balance_usdc)}</span>
                {summary.balance_naira && <span className="text-sm text-[var(--muted)]">In naira: <span className="font-medium text-[var(--foreground)]">{hidden ? '₦••••' : wholeNaira(summary.balance_naira)}</span></span>}
              </>
            ) : (
              <span className="text-lg text-[var(--muted)]">{balanceError ? 'Balance unavailable' : address ? 'Checking your balance…' : 'Setting up your wallet…'}</span>
            )}
          </p>
          {balanceError && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><p role="status" className="text-[var(--muted)]">{balanceError}</p><button type="button" className="btn-secondary" onClick={onRefreshBalance}>Try again</button></div>}
          {summary?.deposit_on_the_way && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium" data-testid="deposit-on-the-way">
              <Spinner /> {summary.deposit_on_the_way} on its way
            </p>
          )}
        </div>
        {summary?.naira_per_usdc && (
          <p className="amount flex justify-between gap-2 border-t border-[var(--line)] px-5 py-2.5 text-xs md:px-7" data-testid="rate">
            <span className="text-[var(--muted)]">Today&apos;s rate</span>
            <span className="font-semibold">₦{summary.naira_per_usdc.toLocaleString('en-NG', { maximumFractionDigits: 2 })} per $1</span>
          </p>
        )}
        {summary?.latest && (
          <div className="flex items-center gap-3 border-t border-[var(--line)] px-5 py-3 text-sm md:px-7">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]" aria-hidden>
              {summary.latest.direction === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />}
            </span>
            <button type="button" onClick={() => onGo('activity')} data-testid="latest" title="See all activity" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
              <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{shortenAddresses(summary.latest.description.replace(/^Sent USDC to /, 'Sent to '))}</span>
              <span className={`amount shrink-0 font-semibold ${summary.latest.direction === 'in' ? 'text-[var(--positive)]' : ''}`}>
                {summary.latest.direction === 'in' ? '+' : '−'}
                {hidden ? '••••' : asDollars(summary.latest.amount_usdc)}
              </span>
            </button>
            <button type="button" onClick={() => onGo('activity')} className="shrink-0 cursor-pointer font-medium hover:underline">Transactions ›</button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-4 gap-2 md:gap-3">
        <Action label="Send" detail="Bank, wallet or phone" icon={<ArrowOutIcon />} onClick={() => onGo('send')} />
        <Action label="Deposit" detail="Naira or crypto" icon={<ArrowInIcon />} onClick={() => onGo('receive')} />
        <Action label="New invoice" short="Invoice" detail="Get paid by link" icon={<InvoiceIcon />} onClick={() => onGo('new-invoice')} />
        <Action label="Airtime & data" short="Airtime" detail="MTN, Airtel, Glo, 9mobile" icon={<PhoneIcon />} onClick={() => onGo('airtime')} />
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
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
                      {entry.direction === 'in' ? <ArrowInIcon /> : <ArrowOutIcon />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{shortenAddresses(entry.description)}</span>
                      <span className="truncate text-xs text-[var(--muted)]">{when(entry.created_at)} · {entry.type_label}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className={`amount text-sm font-semibold ${entry.direction === 'in' ? 'text-[var(--positive)]' : ''}`}>
                        {entry.direction === 'in' ? '+' : '−'}
                        {asDollars(entry.amount_usdc)}
                      </span>
                      {entry.amount_naira && <span className="amount text-xs text-[var(--muted)]">{wholeNaira(entry.amount_naira)}</span>}
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
