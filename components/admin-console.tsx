'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Logo, ThemeToggle } from './icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010';

interface OpenPayment {
  id: string;
  user_id: string;
  status: string;
  route: string;
  recipient: string | null;
  amount: string;
  usdc: string;
  reason: string | null;
  funding_tx: string | null;
  created_at: string;
}
interface Overview {
  mode: string;
  switches: Record<string, boolean>;
  users: number;
  active_schedules: number;
  last_24h: { payments: number; total: string };
  collection_usdc: string | null;
  open_payments: OpenPayment[];
}
interface Stats {
  totals: { users: number; users_7d: number; payments_paid: number; volume: string; merchants: number; payment_links: number; needs_support: number };
  days: { day: string; signups: number; payments: number; volume_naira: number }[];
}
interface UserRow {
  id: string;
  email: string | null;
  wallet_address: string | null;
  created_at: string;
  has_pin: boolean;
  payments: number;
  sent: string;
  last_payment_at: string | null;
  invoices: number;
  merchant_keys: number;
  payment_links: number;
}
interface PaymentRow {
  id: string;
  kind: string;
  channel: string;
  status: string;
  amount: string;
  usdc: string;
  to: string | null;
  from: string | null;
  tx: string | null;
  reason: string | null;
  created_at: string;
}
interface Merchants {
  merchant_keys: { id: string; name: string; owner: string | null; payout: string; webhook: boolean; websites: string[]; invoices: number; invoices_today: number; paid: number; created_at: string; revoked_at: string | null }[];
  payment_links: { id: string; title: string; owner: string | null; price: string; payout: string; checkouts: number; paid: number; created_at: string; stopped_at: string | null }[];
  agent_keys: { id: string; name: string; daily_limit: string; payments: number; paid: number; created_at: string; revoked_at: string | null }[];
}
interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  subject: string | null;
  created_at?: string;
  createdAt?: string;
}

type Tab = 'overview' | 'users' | 'payments' | 'merchants' | 'controls' | 'audit';
const TABS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['users', 'Users'],
  ['payments', 'Payments'],
  ['merchants', 'Merchants'],
  ['controls', 'Controls'],
  ['audit', 'Audit log'],
];
const KIND: Record<string, string> = { app: 'App send', x402: 'x402 agent', agent: 'API agent', invoice: 'Invoice', payment_link: 'Payment link', pay_link: 'Pay link' };
const GOOD = new Set(['completed', 'paid']);
const BAD = new Set(['failed', 'needs_support', 'refunded', 'returned', 'expired', 'rejected']);

const when = (value: string | null | undefined) => (value ? new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '—');
const short = (value: string | null | undefined) => (value && value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value ?? '—');
const explorer = (tx: string) => (tx.startsWith('0x') ? `https://basescan.org/tx/${tx}` : `https://nearblocks.io/txns/${tx}`);

function StatusPill({ status }: { status: string }) {
  const tone = GOOD.has(status) ? 'bg-[var(--positive)]/12 text-[var(--positive)]' : BAD.has(status) ? 'bg-red-500/12 text-red-600 dark:text-red-400' : 'bg-[var(--surface-2)] text-[var(--muted)]';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>{status.replace(/_/g, ' ')}</span>;
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {note && <span className="text-xs text-[var(--muted)]">{note}</span>}
    </div>
  );
}

/** Plain bars, one per day. No chart library: the numbers are small and this reads at a glance. */
function Bars({ title, days, value, format }: { title: string; days: Stats['days']; value: (day: Stats['days'][number]) => number; format: (n: number) => string }) {
  const top = Math.max(1, ...days.map(value));
  const total = days.reduce((sum, day) => sum + value(day), 0);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-[var(--muted)]">14 days · {format(total)}</span>
      </div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`${title}, last 14 days`}>
        {days.map((day) => {
          const n = value(day);
          return (
            <div key={day.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${day.day}: ${format(n)}`}>
              <div className={`w-full rounded-md ${n ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)]'}`} style={{ height: n ? `${Math.max(6, (n / top) * 100)}%` : '4px' }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--muted)]">
        <span>{days[0]?.day.slice(5)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
          <tr>{head.map((cell) => <th key={cell} className="px-4 py-3 font-medium whitespace-nowrap">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">Nothing here yet.</p>}
    </div>
  );
}
const Td = ({ children, mono = false, muted = false }: { children: ReactNode; mono?: boolean; muted?: boolean }) => (
  <td className={`px-4 py-3 align-top ${mono ? 'font-mono text-xs' : ''} ${muted ? 'text-[var(--muted)]' : ''}`}>{children}</td>
);

function Search({ value, onChange, placeholder, children }: { value: string; onChange: (value: string) => void; placeholder: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm" />
      {children}
    </div>
  );
}

function Heading({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {note && <p className="text-sm text-[var(--muted)]">{note}</p>}
      </div>
      {action}
    </div>
  );
}

/** 10kobo's back office. The admin token stays in this page's memory only, so a refresh asks for it again. */
export function AdminConsole() {
  // Shown only in the browser: the theme switch reads the page, which does not exist while Next.js prebuilds it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [token, setToken] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [merchants, setMerchants] = useState<Merchants | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [paymentQuery, setPaymentQuery] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [kind, setKind] = useState('');

  const call = useCallback(
    async <T,>(path: string, body?: object): Promise<T> => {
      const response = await fetch(`${API_URL}/v1/admin/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const answer = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
      if (!response.ok) throw new Error(answer?.message ?? 'That did not work.');
      return answer as T;
    },
    [token],
  );

  const guard = useCallback(async (work: () => Promise<void>) => {
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }, []);

  const loadOverview = useCallback(() => guard(async () => {
    const [o, s] = await Promise.all([call<Overview>('overview'), call<Stats>('stats')]);
    setOverview(o);
    setStats(s);
  }), [call, guard]);
  const loadUsers = useCallback(() => guard(async () => setUsers((await call<{ users: UserRow[] }>(`users?q=${encodeURIComponent(userQuery)}`)).users)), [call, guard, userQuery]);
  const loadPayments = useCallback(() => guard(async () => setPayments((await call<{ payments: PaymentRow[] }>(`payments?q=${encodeURIComponent(paymentQuery)}&status=${encodeURIComponent(paymentStatus)}`)).payments)), [call, guard, paymentQuery, paymentStatus]);
  const loadMerchants = useCallback(() => guard(async () => setMerchants(await call<Merchants>('merchants'))), [call, guard]);
  const loadAudit = useCallback(() => guard(async () => setAudit((await call<{ entries: AuditEntry[] }>('audit')).entries)), [call, guard]);

  const refresh = useCallback(() => {
    if (tab === 'overview' || tab === 'controls') return loadOverview();
    if (tab === 'users') return loadUsers();
    if (tab === 'payments') return loadPayments();
    if (tab === 'merchants') return loadMerchants();
    return loadAudit();
  }, [tab, loadOverview, loadUsers, loadPayments, loadMerchants, loadAudit]);

  // Searches run a moment after typing stops.
  useEffect(() => {
    if (!signedIn) return;
    const timer = setTimeout(() => void refresh(), tab === 'users' || tab === 'payments' ? 300 : 0);
    return () => clearTimeout(timer);
  }, [signedIn, refresh, tab]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const [o, s] = await Promise.all([call<Overview>('overview'), call<Stats>('stats')]);
      setOverview(o);
      setStats(s);
      setSignedIn(true);
    } catch (failure) {
      setError((failure as Error).message === 'Not allowed' ? 'That admin token is not right.' : (failure as Error).message);
    }
  };

  const act = (path: string, body: object) => guard(async () => {
    await call(path, body);
    await loadOverview();
  });

  if (!mounted) return null;

  if (!signedIn) {
    return (
      <main className="admin-page grid min-h-dvh place-items-center bg-[var(--background)] px-4">
        <form onSubmit={signIn} className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="flex-1 text-lg font-semibold">10kobo back office</span>
            <ThemeToggle />
          </div>
          <input type="password" aria-label="Admin token" autoComplete="off" autoFocus value={token} onChange={(event) => setToken(event.target.value)} placeholder="Admin token" className="rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm" />
          <button className="btn-primary justify-center">Open</button>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </main>
    );
  }

  const paused = overview ? Object.values(overview.switches).filter(Boolean).length : 0;
  const shownPayments = (payments ?? []).filter((row) => !kind || row.kind === kind);

  return (
    <div className="admin-page flex min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-[var(--line)] bg-[var(--surface)] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <Logo size={28} />
          <span className="font-semibold">Back office</span>
        </div>
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium ${tab === key ? 'bg-[var(--surface-2)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]'}`}>
            {label}
            {key === 'controls' && paused > 0 && <span className="rounded-full bg-red-500 px-2 text-[11px] text-white">{paused}</span>}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
          <span className="flex items-center justify-between">Mode: {overview?.mode ?? '—'} <ThemeToggle /></span>
          <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => { setToken(''); setSignedIn(false); }}>Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] p-2 md:hidden" aria-label="Back office sections">
          <ThemeToggle />
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${tab === key ? 'bg-[var(--surface-2)] font-medium' : 'text-[var(--muted)]'}`}>{label}</button>
          ))}
        </nav>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {tab === 'overview' && (
            <>
              <Heading title="Overview" note="All of 10kobo at a glance. Days are in Lagos time." action={<button className="btn-small border border-[var(--line)] px-4" onClick={() => void loadOverview()}>Refresh</button>} />
              {stats && overview && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Users" value={stats.totals.users} note={`${stats.totals.users_7d} new this week`} />
                    <Stat label="Payments delivered" value={stats.totals.payments_paid} note={`${overview.last_24h.payments} in the last 24 hours`} />
                    <Stat label="Naira delivered" value={stats.totals.volume} note={`${overview.last_24h.total} in the last 24 hours`} />
                    <Stat label="Needs a person" value={<span className={stats.totals.needs_support ? 'text-red-600 dark:text-red-400' : ''}>{stats.totals.needs_support}</span>} note={stats.totals.needs_support ? 'See Controls' : 'All clear'} />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Bars title="Sign-ups" days={stats.days} value={(day) => day.signups} format={(n) => `${n}`} />
                    <Bars title="Naira delivered" days={stats.days} value={(day) => day.volume_naira} format={(n) => `₦${n.toLocaleString('en-NG')}`} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Live merchant keys" value={stats.totals.merchants} />
                    <Stat label="Live payment links" value={stats.totals.payment_links} />
                    <Stat label="Active schedules" value={overview.active_schedules} />
                    <Stat label="Collection address" value={overview.collection_usdc ?? '—'} note="USDC held for refunds" />
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'users' && (
            <>
              <Heading title="Users" note={users ? `${users.length} shown, newest first` : undefined} />
              <Search value={userQuery} onChange={setUserQuery} placeholder="Search by email, wallet or ID" />
              <Table head={['User', 'Joined', 'Payments', 'Sent', 'Last payment', 'Selling', 'PIN']} empty={users?.length === 0}>
                {(users ?? []).map((user) => (
                  <tr key={user.id}>
                    <Td>
                      <span className="block font-medium">{user.email ?? 'No email'}</span>
                      <span className="block font-mono text-xs text-[var(--muted)]" title={user.wallet_address ?? ''}>{short(user.wallet_address)}</span>
                    </Td>
                    <Td muted>{when(user.created_at)}</Td>
                    <Td>{user.payments}</Td>
                    <Td>{user.sent}</Td>
                    <Td muted>{when(user.last_payment_at)}</Td>
                    <Td muted>{[user.payment_links && `${user.payment_links} links`, user.invoices && `${user.invoices} invoices`, user.merchant_keys && `${user.merchant_keys} keys`].filter(Boolean).join(' · ') || '—'}</Td>
                    <Td>{user.has_pin ? 'Set' : <span className="text-[var(--muted)]">Not set</span>}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}

          {tab === 'payments' && (
            <>
              <Heading title="Payments" note="Every kind: app sends, x402 and API agents, invoices and payment links." />
              <Search value={paymentQuery} onChange={setPaymentQuery} placeholder="Search by name, email, ID or transaction">
                <select aria-label="Kind" value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                  <option value="">All kinds</option>
                  {Object.entries(KIND).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select aria-label="Status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                  <option value="">All statuses</option>
                  {['completed', 'paid', 'awaiting_signature', 'awaiting_deposit', 'processing', 'paying', 'needs_support', 'failed', 'refunded', 'returned', 'expired'].map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                </select>
              </Search>
              <Table head={['When', 'Kind', 'To', 'From', 'Amount', 'Status', 'Transaction']} empty={shownPayments.length === 0}>
                {shownPayments.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <Td muted>{when(row.created_at)}</Td>
                    <Td>
                      <span className="block font-medium">{KIND[row.kind] ?? row.kind}</span>
                      <span className="block text-xs text-[var(--muted)]">{row.channel}</span>
                    </Td>
                    <Td>{row.to ?? '—'}</Td>
                    <Td muted>{row.from ?? '—'}</Td>
                    <Td>
                      <span className="block font-medium whitespace-nowrap">{row.amount}</span>
                      <span className="block text-xs text-[var(--muted)]">{row.usdc}</span>
                    </Td>
                    <Td>
                      <StatusPill status={row.status} />
                      {row.reason && <span className="mt-1 block max-w-56 text-xs text-[var(--muted)]">{row.reason}</span>}
                    </Td>
                    <Td mono>{row.tx ? <a className="underline-offset-2 hover:underline" href={explorer(row.tx)} target="_blank" rel="noreferrer">{short(row.tx)} ↗</a> : '—'}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}

          {tab === 'merchants' && merchants && (
            <>
              <Heading title="Merchants" note="Shops with checkout keys, sellers with payment links, and agent API keys." action={<button className="btn-small border border-[var(--line)] px-4" onClick={() => void loadMerchants()}>Refresh</button>} />
              <h2 className="text-base font-semibold">Merchant keys</h2>
              <Table head={['Shop', 'Owner', 'Paid out to', 'Invoices', 'Paid', 'Webhook', 'State']} empty={merchants.merchant_keys.length === 0}>
                {merchants.merchant_keys.map((key) => (
                  <tr key={key.id}>
                    <Td><span className="block font-medium">{key.name}</span><span className="block text-xs text-[var(--muted)]">{key.websites.join(', ') || 'No website'}</span></Td>
                    <Td muted>{key.owner ?? '—'}</Td>
                    <Td>{key.payout}</Td>
                    <Td>{key.invoices} <span className="text-xs text-[var(--muted)]">({key.invoices_today} today)</span></Td>
                    <Td>{key.paid}</Td>
                    <Td>{key.webhook ? 'Yes' : <span className="text-[var(--muted)]">No</span>}</Td>
                    <Td><StatusPill status={key.revoked_at ? 'revoked' : 'live'} /></Td>
                  </tr>
                ))}
              </Table>
              <h2 className="text-base font-semibold">Payment links</h2>
              <Table head={['Link', 'Owner', 'Price', 'Paid out to', 'Checkouts', 'Paid', 'State']} empty={merchants.payment_links.length === 0}>
                {merchants.payment_links.map((link) => (
                  <tr key={link.id}>
                    <Td><a className="font-medium underline-offset-2 hover:underline" href={`/p/${link.id}`} target="_blank" rel="noreferrer">{link.title} ↗</a></Td>
                    <Td muted>{link.owner ?? '—'}</Td>
                    <Td>{link.price}</Td>
                    <Td>{link.payout}</Td>
                    <Td>{link.checkouts}</Td>
                    <Td>{link.paid}</Td>
                    <Td><StatusPill status={link.stopped_at ? 'stopped' : 'live'} /></Td>
                  </tr>
                ))}
              </Table>
              <h2 className="text-base font-semibold">Agent API keys</h2>
              <Table head={['Name', 'Daily limit', 'Payments', 'Paid', 'Created', 'State']} empty={merchants.agent_keys.length === 0}>
                {merchants.agent_keys.map((key) => (
                  <tr key={key.id}>
                    <Td><span className="font-medium">{key.name}</span></Td>
                    <Td>{key.daily_limit}</Td>
                    <Td>{key.payments}</Td>
                    <Td>{key.paid}</Td>
                    <Td muted>{when(key.created_at)}</Td>
                    <Td><StatusPill status={key.revoked_at ? 'revoked' : 'live'} /></Td>
                  </tr>
                ))}
              </Table>
            </>
          )}

          {tab === 'controls' && overview && (
            <>
              <Heading title="Controls" note="Pause any kind of payment at once. Every change is written to the audit log." />
              <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                {Object.entries(overview.switches).map(([name, isPaused]) => (
                  <li key={name} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <span className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-red-500' : 'bg-[var(--positive)]'}`} aria-hidden />
                      <span className="text-sm font-medium">{name.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-[var(--muted)]">{isPaused ? 'Paused' : 'Running'}</span>
                    </span>
                    <button className={`btn-small border px-4 ${isPaused ? 'border-[var(--foreground)]' : 'border-[var(--line)]'}`} onClick={() => { if (isPaused || window.confirm(`Pause ${name.replace(/_/g, ' ')} for everyone?`)) void act('switches', { name, paused: !isPaused }); }}>
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  </li>
                ))}
              </ul>
              <h2 className="text-base font-semibold">Open app payments</h2>
              {overview.open_payments.length === 0 ? (
                <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-6 text-sm text-[var(--muted)]">None. Every payment has finished.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {overview.open_payments.map((payment) => (
                    <li key={payment.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{payment.amount} ({payment.usdc}) · {payment.route} to {payment.recipient ?? '—'}</span>
                        <StatusPill status={payment.status} />
                      </div>
                      <p className="text-sm text-[var(--muted)]">{when(payment.created_at)} · {payment.reason ?? 'No reason recorded'}</p>
                      {payment.funding_tx && <a className="font-mono text-xs break-all text-[var(--muted)] hover:underline" href={explorer(payment.funding_tx)} target="_blank" rel="noreferrer">{payment.funding_tx} ↗</a>}
                      {payment.status === 'needs_support' && (
                        <div className="flex flex-wrap gap-2">
                          {(['completed', 'returned', 'failed'] as const).map((status) => (
                            <button key={status} className="btn-small border border-[var(--line)] px-3" onClick={() => {
                              const note = window.prompt(`Mark as ${status}. What did you check?`);
                              if (note) void act(`payments/${payment.id}/resolve`, { status, note });
                            }}>
                              Mark {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'audit' && (
            <>
              <Heading title="Audit log" note="The last 200 actions by users, the system and staff." action={<button className="btn-small border border-[var(--line)] px-4" onClick={() => void loadAudit()}>Refresh</button>} />
              <Table head={['When', 'Who', 'Action', 'Subject']} empty={audit?.length === 0}>
                {(audit ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <Td muted>{when(entry.created_at ?? entry.createdAt)}</Td>
                    <Td mono>{short(entry.actor)}</Td>
                    <Td><span className="font-medium">{entry.action}</span></Td>
                    <Td mono>{short(entry.subject)}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
