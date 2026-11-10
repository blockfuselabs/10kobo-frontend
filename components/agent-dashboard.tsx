'use client';

import { PublicNav } from './public-nav';

import { useCallback, useEffect, useState } from 'react';
import { AgentGuide } from './agent-guide';
import { BankIcon, NetworksIcon, InvoiceIcon } from './icons';
import styles from './agent-page.module.css';
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
    <main className={styles.page}>
      <div className={styles.container}>
        <PublicNav current="agents" />
        <header className={styles.hero}>
          <div><span className={styles.eyebrow}>10KOBO FOR AGENTS</span><h1>Your agent.<br /><span>Real-world payments.</span></h1><p>Give your software a way to pay Nigerian bank accounts. Fund with stablecoins. Deliver naira through x402 and NEAR Intents.</p><div className={styles.heroActions}><a className="btn-primary neutral-primary" href="#playground">Try the agent <span aria-hidden>↓</span></a><a href="#connect">Integration guide <span aria-hidden>→</span></a></div></div>
          <div className={styles.route} aria-label="AI agent funds a naira bank payment using x402">
            <div><span className={styles.routeIcon}><NetworksIcon /></span><strong>Your agent<small>USDC from its wallet</small></strong></div>
            <div className={styles.routeConnector}><span /><b>x402</b><span /><i aria-hidden>↓</i></div>
            <div><span className={styles.routeIcon}><BankIcon /></span><strong>Nigerian bank<small>Naira to the recipient</small></strong></div>
            <p>Quote → verify → fund → receipt</p>
          </div>
        </header>
        <section id="playground" className={styles.playground} aria-labelledby="playground-title">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / SEE IT IN ACTION</span><h2 id="playground-title">An invoice in. A decision out.</h2><p>Choose a case and follow the agent’s actual decisions and payment status.</p></div>
            {setup && <span data-testid="money-mode" className={`${styles.mode} ${setup.real ? styles.realMode : ''}`}>{setup.real ? 'Real money' : 'Test mode · No real money'}</span>}
          </div>

        <div className={styles.workbench}>
          <section className={styles.task} aria-label="The task">
            <fieldset disabled={running || starting}>
              <legend className={styles.panelTitle}><InvoiceIcon /> Choose a scenario</legend>
              <div className={styles.scenarios}>
                {setup?.scenarios.map((item) => (
                  <button key={item.name} type="button" aria-pressed={chosen === item.name} onClick={() => setChosen(item.name)} className={styles.scenario}>
                    <span>{item.title}</span><span aria-hidden>{chosen === item.name ? '●' : '○'}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {scenario && <p className="text-sm text-[var(--muted)]">{scenario.summary}</p>}
            <pre data-testid="invoice" className={styles.invoice}>{scenario?.invoice ?? (error ? 'The demo is unavailable. You can still read the integration guide below.' : 'Loading the available scenarios…')}</pre>
            {setup && <p className="text-sm">Budget: <span className="amount font-semibold">{setup.budget_usdc} USDC</span></p>}
            <button className="btn-primary neutral-primary" disabled={!setup || running || starting} onClick={() => void start()}>
              {running || starting ? 'Agent is working…' : 'Run agent'}
            </button>
          </section>

          <section className={styles.execution} aria-label="What the agent is doing">
            <div className="flex items-center justify-between">
              <p className={styles.panelTitle}>Run activity</p>
              {run && <p className="amount text-sm text-[var(--muted)]" role="timer">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>}
            </div>
            {!run && <div className={styles.emptyRun}><NetworksIcon /><h3>{error ? 'Waiting for a connection' : 'Ready when you are.'}</h3><p>{error ? 'The run will appear here once the demo service is available.' : 'Start a scenario to see the quote, checks and payment outcome here.'}</p><div><span>Quote</span><span>Verify</span><span>Pay</span><span>Receipt</span></div></div>}
            <ol className={styles.timeline} data-testid="timeline">
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
        </section>
        <AgentGuide />
        <footer className={styles.footer}><a href="/">10kobo.</a><span>Naira and stablecoins, both ways.</span><a href="/proof">Explore payment proof →</a></footer>
      </div>
    </main>
  );
}
