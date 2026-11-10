'use client';

import { useCallback, useEffect, useState } from 'react';
import { AgentGuide } from './agent-guide';
import { Logo } from './icons';
import { Spinner } from './panels';

// Shows what the demo agent really does: every line below comes from the agent's own run, nothing is scripted.
const API = process.env.NEXT_PUBLIC_API_URL ?? '';
const POLL_MS = 1000;

interface Scenario {
  name: string;
  title: string;
  summary: string;
  invoice: string;
}

interface Setup {
  real: boolean;
  budget_usdc: string;
  busy: boolean;
  scenarios: Scenario[];
}

type AgentEvent = { type: string; at?: string } & Record<string, unknown>;

interface Run {
  id: string;
  status: 'running' | 'finished' | 'failed';
  real: boolean;
  started_at: string;
  events: AgentEvent[];
}

const STATUS_WORDS: Record<string, string> = {
  processing: 'NEAR Intents has the USDC and is moving it',
  paying: 'USDC reached the bank partner, and naira is being paid',
  paid: 'The bank payment is done',
  refunded: 'The USDC was returned',
  needs_support: 'A person needs to check this payment',
  expired: 'No payment arrived in time',
};

/** The AI repeats the invoice in its own words, so account numbers are hidden here too. This page may be filmed. */
const hideAccounts = (text: string) => text.replace(/\b\d{6}(\d{4})\b/g, '******$1');

function line(event: AgentEvent, real: boolean): { text: string; detail?: string; tone?: 'good' | 'bad' } | null {
  switch (event.type) {
    case 'started':
      return { text: 'Agent started', detail: `Budget ${event.budget} USDC${event.keyless ? '. No API key, no sign-up' : ''}` };
    case 'quote':
      return { text: 'Asked 10kobo: "402 Payment Required"', detail: `${event.amount} to ${event.name} (${event.bank} ${event.account}) costs ${event.usdc} USDC` };
    case 'thinking':
      return { text: 'Agent decided', detail: hideAccounts(String(event.text)) };
    case 'api_refused':
      return { text: '10kobo refused the request', detail: String(event.reason), tone: 'bad' };
    case 'guard_refused':
      return { text: 'The wallet rules refused it', detail: String(event.reason), tone: 'bad' };
    case 'sending':
      return real
        ? { text: `Signed ${event.usdc} USDC on NEAR`, detail: `Our relayer pays the gas. To one-time address ${String(event.to).slice(0, 10)}…` }
        : { text: `Would sign ${event.usdc} USDC on NEAR`, detail: 'Test mode: no wallet signs and nothing moves.' };
    case 'sent':
      return { text: real ? 'Payment sent' : 'Pretended to send it' };
    case 'send_unconfirmed':
      return { text: 'Could not confirm the send, so it will not be repeated', tone: 'bad' };
    case 'status':
      return { text: real ? (STATUS_WORDS[String(event.status)] ?? String(event.status)) : `Test status: ${String(event.status)}`, tone: event.status === 'paid' ? 'good' : undefined };
    default:
      return null;
  }
}

export function AgentDashboard() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [chosen, setChosen] = useState('normal');
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch(`${API}/v1/demo-agent/scenarios`)
      .then(async (response) => {
        if (!response.ok) throw new Error('The demo agent is switched off here.');
        setSetup((await response.json()) as Setup);
      })
      .catch((failure: Error) => setError(failure.message));
  }, []);

  const running = run?.status === 'running';
  const poll = useCallback(async (id: string) => {
    const response = await fetch(`${API}/v1/demo-agent/runs/${id}`);
    if (response.ok) setRun((await response.json()) as Run);
  }, []);

  useEffect(() => {
    if (!running || !run) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      void poll(run.id).catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, run, poll]);

  const start = async () => {
    if (setup?.real && chosen === 'normal' && !window.confirm('This pays real money to the bank account on the invoice. Continue?')) return;
    setStarting(true);
    setError(null);
    setRun(null);
    try {
      const response = await fetch(`${API}/v1/demo-agent/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario: chosen, confirm_real_money: Boolean(setup?.real) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'The agent could not start.');
      setRun(body as Run);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The agent could not start.');
    } finally {
      setStarting(false);
    }
  };

  const scenario = setup?.scenarios.find((item) => item.name === chosen);
  const result = run?.events.find((event) => event.type === 'result') as (AgentEvent & { outcome?: string; reason?: string; receipt?: Record<string, unknown> | null; transactions?: string[] }) | undefined;
  const elapsed = run ? Math.max(0, Math.floor(((result?.at ? new Date(result.at).getTime() : now) - new Date(run.started_at).getTime()) / 1000)) : 0;
  const paid = result?.outcome === 'paid';
  const nearTx = result?.transactions?.find((hash) => !hash.startsWith('0x') && hash !== 'simulated');

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/" aria-label="10kobo home"><Logo size={36} /></a>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Agents pay Nigerian banks</h1>
              <p className="text-sm text-[var(--muted)]">Watch an AI agent read an invoice and pay it in naira, live. Pick a case and run it.</p>
            </div>
          </div>
          {setup && (
            <p data-testid="money-mode" className={`rounded-full px-3 py-1 text-sm font-semibold ${setup.real ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-[var(--line)]'}`}>
              {setup.real ? 'Real money' : 'Test mode. No real money'}
            </p>
          )}
        </header>

        <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="flex flex-col gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5" aria-label="The task">
            <fieldset disabled={running || starting}>
              <legend className="mb-2 text-sm font-medium">Choose an invoice</legend>
              <div className="flex flex-wrap gap-2">
                {setup?.scenarios.map((item) => (
                  <button key={item.name} type="button" aria-pressed={chosen === item.name} onClick={() => setChosen(item.name)} className={`btn-small rounded-full border ${chosen === item.name ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--line)]'}`}>
                    {item.title}
                  </button>
                ))}
              </div>
            </fieldset>
            {scenario && <p className="text-sm text-[var(--muted)]">{scenario.summary}</p>}
            <pre data-testid="invoice" className="inset overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">{scenario?.invoice ?? 'Loading…'}</pre>
            {setup && <p className="text-sm">Budget: <span className="amount font-semibold">{setup.budget_usdc} USDC</span></p>}
            <button className="btn-primary" disabled={!setup || running || starting} onClick={() => void start()}>
              {running || starting ? 'Agent is working…' : 'Run agent'}
            </button>
          </section>

          <section className="flex min-h-96 flex-col gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5" aria-label="What the agent is doing">
            <div className="flex items-center justify-between">
              <p className="font-medium">What the agent is doing</p>
              {run && <p className="amount text-sm text-[var(--muted)]" role="timer">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>}
            </div>
            {!run && !error && <p className="text-sm text-[var(--muted)]">Choose an invoice and run the agent.</p>}
            <ol className="flex flex-col gap-3" data-testid="timeline">
              {run?.events.map((event, index) => {
                const shown = line(event, run.real);
                if (!shown) return null;
                return (
                  <li key={index} className="flex gap-2.5">
                    <span aria-hidden className={`w-4 shrink-0 text-center ${shown.tone === 'bad' ? 'text-red-600 dark:text-red-400' : ''}`}>{shown.tone === 'bad' ? '✕' : '✓'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{shown.text}</p>
                      {shown.detail && <p className="break-words text-sm text-[var(--muted)]">{shown.detail}</p>}
                    </div>
                  </li>
                );
              })}
              {running && (
                <li className="flex items-center gap-2.5 text-sm text-[var(--muted)]"><span className="w-4"><Spinner /></span> Working…</li>
              )}
            </ol>

            {result && (
              <div data-testid="result" className={`mt-auto rounded-2xl p-4 ${paid ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'border border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'}`}>
                <p className="font-semibold">{paid ? `${run?.real ? 'Paid' : 'Test: would have paid'} ${result.receipt?.paid ?? ''}` : result.outcome === 'refused' ? 'Refused. Nothing was sent.' : 'Not paid.'}</p>
                <p className="mt-1 text-sm">{hideAccounts(String(result.reason ?? ''))}</p>
                {paid && result.receipt && <p className="mt-2 text-sm">To {String(result.receipt.to)}, funded with {String(result.receipt.funded_with)}</p>}
                {nearTx && <a className="mt-2 inline-block text-sm font-medium underline underline-offset-2" href={`https://nearblocks.io/txns/${nearTx}`} target="_blank" rel="noreferrer">View on NEAR</a>}
              </div>
            )}
            {run?.status === 'failed' && !result && <p role="alert" className="text-sm text-red-600 dark:text-red-400">The agent stopped before finishing. Check the wallet balance before running it again.</p>}
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </section>
        </div>
        <AgentGuide />
      </div>
    </main>
  );
}
