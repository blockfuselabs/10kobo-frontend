'use client';

import { useCallback, useState, type FormEvent } from 'react';

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

// The token stays in this page's memory, so a refresh asks for it again and it is never stored.
export default function AdminPage() {
  const [token, setToken] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (path: string, body?: object) => {
      const response = await fetch(`${API_URL}/v1/admin/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const answer = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(answer?.message ?? 'That did not work.');
      return answer;
    },
    [token],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setOverview((await call('overview')) as unknown as Overview);
    } catch (failure) {
      setOverview(null);
      setError((failure as Error).message);
    }
  }, [call]);

  const act = async (path: string, body: object) => {
    setError(null);
    try {
      await call(path, body);
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  if (!overview) {
    return (
      <main className="admin-page mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">10kobo admin</h1>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            aria-label="Admin token"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin token"
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
          />
          <button className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)]">Open</button>
        </form>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </main>
    );
  }

  return (
    <main className="admin-page mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">10kobo admin</h1>
        <button className="rounded-lg border border-[var(--line)] px-3 py-1" onClick={() => void load()}>Refresh</button>
      </header>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section aria-label="Summary">
        <p>Mode: {overview.mode}</p>
        <p>Users: {overview.users}. Active schedules: {overview.active_schedules}.</p>
        <p>Last 24 hours: {overview.last_24h.payments} payments, {overview.last_24h.total}.</p>
        <p>Collection address holds: {overview.collection_usdc ?? 'unknown'}</p>
      </section>

      <section aria-label="Pause switches">
        <h2 className="mb-2 text-lg font-medium">Pause switches</h2>
        <ul className="flex flex-col gap-2">
          {Object.entries(overview.switches).map(([name, paused]) => (
            <li key={name} className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-2">
              <span>{name}: {paused ? <strong className="text-red-600 dark:text-red-400">PAUSED</strong> : 'running'}</span>
              <button className="rounded-lg border border-[var(--line)] px-3 py-1" onClick={() => void act('switches', { name, paused: !paused })}>
                {paused ? 'Resume' : 'Pause'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Open payments">
        <h2 className="mb-2 text-lg font-medium">Open payments</h2>
        {overview.open_payments.length === 0 && <p className="text-[var(--muted)]">None.</p>}
        <ul className="flex flex-col gap-3">
          {overview.open_payments.map((payment) => (
            <li key={payment.id} className="flex flex-col gap-1 border-b border-[var(--line)] pb-3">
              <p className="font-medium">{payment.status}: {payment.amount} ({payment.usdc}) {payment.route} to {payment.recipient}</p>
              <p className="text-sm text-[var(--muted)]">{new Date(payment.created_at).toLocaleString()} · {payment.reason ?? 'no reason recorded'}</p>
              {payment.funding_tx && <p className="break-all font-mono text-xs text-[var(--muted)]">{payment.funding_tx}</p>}
              {payment.status === 'needs_support' && (
                <div className="flex flex-wrap gap-2">
                  {(['completed', 'returned', 'failed'] as const).map((status) => (
                    <button
                      key={status}
                      className="rounded-lg border border-[var(--line)] px-3 py-1 text-sm"
                      onClick={() => {
                        const note = window.prompt(`Mark as ${status}. What did you check?`);
                        if (note) void act(`payments/${payment.id}/resolve`, { status, note });
                      }}
                    >
                      Mark {status}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
