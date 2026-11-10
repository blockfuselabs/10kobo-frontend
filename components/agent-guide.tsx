'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from './icons';

const STEPS = [
  ['Ask for a price', 'The agent sends the amount, bank and account number. 10kobo answers with the USDC price and the name the bank holds for the account. Nothing moves.'],
  ['Check before paying', 'The agent compares that name with the invoice. A wrong name, a changed account or a hidden instruction should make it stop.'],
  ['Pay with USDC', 'It accepts the quote and sends USDC to a one-time address, from Base, NEAR or another supported network. Small payments over x402 need no account or API key.'],
  ['Naira arrives', 'NEAR Intents moves the USDC, and the bank partner pays naira to the account. The agent gets a receipt.'],
] as const;

const SAFETY = [
  ['Limits in code, not in the AI', 'Without a key, over x402: at most ₦50,000 a payment and ₦100,000 a day per wallet. With a key: the daily limit set for that key. Checked under a lock, so two payments at once cannot both use the last of a limit.'],
  ['The bank name comes first', 'Every quote shows the account holder’s name before any money is sent, so a wrong or swapped account is caught.'],
  ['10kobo holds no money', 'USDC goes from the agent’s wallet to a one-time NEAR Intents address. If delivery fails, it is refunded to the agent.'],
  ['Every payment has a record', 'Status, receipt and transaction links for each payment, and a CSV for the key owner.'],
] as const;

const CURL = `# 1. Price it and see the account name. Moves nothing.
curl -X POST $TENKOBO/v1/agent/quotes \\
  -H "authorization: Bearer $KEY" -H 'content-type: application/json' \\
  -d '{"amount_naira":1400,"bank_name":"OPay","account_number":"8031234568","pay_from":"base","refund_to":"0xYourWallet"}'

# 2. Accept it: get the exact USDC and the one-time address. Safe to repeat.
curl -X POST $TENKOBO/v1/agent/payments \\
  -H "authorization: Bearer $KEY" -d '{"quote_id":"…"}'

# 3. Send the USDC from your wallet, then follow it.
curl $TENKOBO/v1/agent/payments/<id> -H "authorization: Bearer $KEY"`;

const MCP = `{ "mcpServers": { "10kobo": {
  "command": "node",
  "args": ["/path/to/mcp-server/src/main.ts"],
  "env": { "TENKOBO_API_URL": "https://…" }
} } }`;

function Code({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre aria-label={label} className="overflow-x-auto rounded-2xl bg-[#111] p-4 pr-12 text-xs leading-5 text-[#e8e8e3]"><code>{text}</code></pre>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        className="absolute top-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-lg text-[#e8e8e3] hover:bg-white/10"
        onClick={() => void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

/** Under the live run: how an agent pays, what keeps it safe, and how to connect one. */
export function AgentGuide() {
  const [tab, setTab] = useState<'http' | 'mcp'>('http');
  return (
    <div className="mt-10 flex flex-col gap-10">
      <section aria-labelledby="how" className="flex flex-col gap-4">
        <h2 id="how" className="font-display text-xl font-bold tracking-tight">How an agent pays a Nigerian bank</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--pop)] text-xs font-bold text-[#111]">{index + 1}</span>
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-sm text-[var(--muted)]">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="safety" className="flex flex-col gap-4">
        <h2 id="safety" className="font-display text-xl font-bold tracking-tight">What keeps it safe</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SAFETY.map(([title, text]) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-text)]"><CheckIcon /></span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-sm text-[var(--muted)]">{text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="connect" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="connect" className="font-display text-xl font-bold tracking-tight">Connect your agent</h2>
            <p className="text-sm text-[var(--muted)]">Plain HTTP, x402, or the MCP server for Claude and other MCP clients.</p>
          </div>
          <div className="flex gap-1 rounded-full bg-[var(--surface-2)] p-1" role="group" aria-label="Way to connect">
            {([['http', 'HTTP API'], ['mcp', 'MCP']] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className={`rounded-full px-3 py-1 text-sm font-medium ${tab === key ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--muted)]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'http' ? (
          <>
            <Code label="HTTP example" text={CURL} />
            <p className="text-sm text-[var(--muted)]">
              This API needs a key. Without one, agents that speak x402 call <code className="text-[var(--foreground)]">/v1/agent/x402/pay</code>, get a standard 402 answer, and give a name, email and purpose for the record. The no-key limits apply.
            </p>
          </>
        ) : (
          <>
            <Code label="MCP settings" text={MCP} />
            <p className="text-sm text-[var(--muted)]">Three tools: quote a naira payment, accept the quote, and check the payment. Then ask: “How much USDC to pay ₦1,400 to OPay 8031234568?”</p>
          </>
        )}
      </section>
    </div>
  );
}
