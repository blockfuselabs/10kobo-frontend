'use client';

import { duration, HIGHLIGHTS, PROOFS, proofAt, when, type Proof } from '@/lib/proof';
import { Logo } from './icons';

const KIND_LABEL: Record<Proof['kind'], string> = { bank: 'Bank payout', airtime: 'Airtime', wallet: 'Crypto send', deposit: 'Naira deposit', agent: 'AI agent', 'naira-in': 'Naira in' };

function Links({ proof }: { proof: Proof }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {proof.links.map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-medium transition-colors hover:border-[var(--foreground)]">
          {link.label} ↗
        </a>
      ))}
    </span>
  );
}

/** Every highlighted payment, ready to drop into the landing page. */
export function ProofHighlights({ linkToAll = true }: { linkToAll?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item) => {
          const proof = proofAt(item.at);
          return (
            <li key={item.at} className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
              <span className="w-fit rounded-full bg-[var(--pop)] px-2.5 py-1 text-xs font-semibold text-[#111]">{KIND_LABEL[proof.kind]}</span>
              <p className="font-display text-lg font-bold leading-snug tracking-tight">{item.headline}</p>
              <p className="text-sm text-[var(--muted)]">{item.line}</p>
              <span className="mt-auto flex flex-col gap-2 pt-1">
                <span className="text-xs text-[var(--muted)]">{when(proof.at)}</span>
                <Links proof={proof} />
              </span>
            </li>
          );
        })}
      </ul>
      {linkToAll && (
        <a href="/proof" className="w-fit text-sm font-semibold underline underline-offset-4">
          See all {PROOFS.length} real payments →
        </a>
      )}
    </div>
  );
}

/** A public list of real payments with their transactions, so anyone can check that 10kobo moves real money. */
export function ProofPage() {
  const networks = new Set(PROOFS.flatMap((item) => item.networks.filter((name) => !['NEAR Intents', 'Nigerian bank'].includes(name))));
  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-8 md:px-8 md:py-12">
        <header className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-display text-xl font-bold tracking-tight">10kobo</span>
          </a>
          <a href="/" className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold">Open 10kobo</a>
        </header>

        <section className="flex flex-col gap-4">
          <span className="w-fit rounded-full bg-[var(--pop)] px-3 py-1 text-xs font-semibold text-[#111]">Mainnet · real money</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Real payments, with proof.</h1>
          <p className="max-w-2xl text-lg text-[var(--muted)]">
            Every payment below moved real money on mainnet, from 3 to 6 November 2026. Open any transaction to check it on its
            blockchain. Amounts are small on purpose. Bank accounts are masked and nobody is named.
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-3 sm:max-w-xl">
            {[
              [String(PROOFS.length), 'real payments'],
              [String(networks.size), 'blockchains'],
              ['3', 'Nigerian banks'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-bold">{value}</dd>
                <dd className="text-sm text-[var(--muted)]">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-4" aria-label="Highlights">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Highlights</h2>
          <ProofHighlights linkToAll={false} />
        </section>

        <section className="flex flex-col gap-4" aria-label="All payments">
          <h2 className="font-display text-2xl font-semibold tracking-tight">All payments, newest first</h2>
          <ul className="flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
            {PROOFS.map((proof) => (
              <li key={proof.at} className="flex flex-col gap-2 border-b border-[var(--line)] p-4 last:border-0 sm:flex-row sm:items-center sm:gap-4" data-testid="proof-row">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold">{KIND_LABEL[proof.kind]}</span>
                    <span className="font-medium">{proof.title}</span>
                  </span>
                  <span className="text-sm text-[var(--muted)]">{proof.detail}</span>
                  <span className="text-xs text-[var(--muted)]">{when(proof.at)} · {proof.networks.join(' → ')}{proof.seconds ? ` · ${duration(proof.seconds)}` : ''}</span>
                </div>
                <span className="amount shrink-0 font-semibold sm:text-right">{proof.amount}</span>
                <Links proof={proof} />
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">How to read this</p>
          <p>Times are when 10kobo recorded the payment, in UTC. Where a time to delivery is shown, it runs from the start of the payment to the money arriving.</p>
          <p>Moves between networks go through NEAR Intents. Naira payouts and deposits go through 10kobo&apos;s payment partner in Nigeria. 10kobo never holds the money in between.</p>
        </section>
      </div>
    </div>
  );
}
