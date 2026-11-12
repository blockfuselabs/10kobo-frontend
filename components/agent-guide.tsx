'use client';

import { useState } from 'react';
import { CodeEditor } from './code-editor';
import { McpConnect } from './mcp-connect';
import { CheckIcon, CopyIcon } from './icons';
import styles from './agent-page.module.css';

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
  -d '{"amount_naira":1400,"bank_name":"OPay","account_number":"0123456789","pay_from":"base","refund_to":"0xYourWallet"}'

# 2. Accept it: get the exact USDC and the one-time address. Safe to repeat.
curl -X POST $TENKOBO/v1/agent/payments \\
  -H "authorization: Bearer $KEY" -d '{"quote_id":"…"}'

# 3. Send the USDC from your wallet, then follow it.
curl $TENKOBO/v1/agent/payments/<id> -H "authorization: Bearer $KEY"`;

const X402 = `// The official x402 client pays 10kobo from NEAR. No API key, and no NEAR needed for gas.
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createClientNearSigner } from '@x402/near';
import { ExactNearScheme } from '@x402/near/exact/client';

const client = new x402Client();
client.register('near:*', new ExactNearScheme(
  createClientNearSigner({ accountId: 'agent.near', secretKey: process.env.NEAR_KEY! }),
));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment(\`\${TENKOBO}/v1/agent/x402/pay\`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    amount_naira: 1400, bank_name: 'OPay', account_number: '0123456789',
    pay_from: 'near', refund_to: 'agent.near',
    payer_name: 'Your agent', payer_email: 'agent@example.com', purpose: 'Supplier invoice',
  }),
});
console.log(res.status, await res.json()); // 200: paid on NEAR, the naira is on its way`;



type Tab = 'x402' | 'http' | 'mcp';
const FILES: [Exclude<Tab, 'mcp'>, string, string][] = [
  ['x402', 'pay-with-x402.ts', X402],
  ['http', 'pay-with-key.sh', CURL],
];
const NOTES: Record<Exclude<Tab, 'mcp'>, string> = {
  x402: 'Standard x402 v2, scheme exact on near:mainnet, using the official @x402 packages. The agent signs one USDC transfer; 10kobo checks it with the official verifier and pays the NEAR gas. No key: the no-key limits apply. Full docs at /docs.',
  http: 'With an API key: your own limits, the full account name, and a CSV of your payments. The same three steps, without the 402s.',
};

/** Under the live run: how an agent pays, what keeps it safe, and how to connect one. */
export function AgentGuide() {
  const [tab, setTab] = useState<Tab>('x402');
  return (
    <div className={styles.guide}>
      <section aria-labelledby="how" className={styles.how}><span className={styles.eyebrow}>02 / THE PAYMENT PATH</span>
        <h2 id="how" className="font-display text-xl font-bold tracking-tight">How an agent pays a Nigerian bank</h2>
        <ol className={styles.steps}>
          {STEPS.map(([title, text], index) => (
            <li key={title} className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--pop)] text-xs font-bold text-[#111]">{index + 1}</span>
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-sm text-[var(--muted)]">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="safety" className={styles.safety}><span className={styles.eyebrow}>03 / CHECKS BEFORE MONEY MOVES</span>
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

      <section aria-labelledby="connect" className={styles.connect}><span className={styles.eyebrow}>04 / START BUILDING</span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="connect" className="font-display text-xl font-bold tracking-tight">Connect your agent</h2>
            <p className="text-sm text-[var(--muted)]">x402 with no key, plain HTTP with a key, or the MCP server for Claude and other MCP clients.</p>
          </div>
          <div className="flex gap-1 rounded-full bg-[var(--surface-2)] p-1" role="group" aria-label="Way to connect">
            {([['x402', 'x402'], ['http', 'HTTP API'], ['mcp', 'MCP']] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === key ? 'bg-[#141414] text-white' : 'text-[var(--muted)]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'mcp' ? (
          <McpConnect />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <CodeEditor files={FILES.map(([, name, code]) => ({ name, code }))} active={FILES.findIndex(([key]) => key === tab)} onSelect={(index) => setTab(FILES[index][0])} />
            <p className="text-sm text-[var(--muted)]">{NOTES[tab]}</p>
          </div>
        )}
      </section>
    </div>
  );
}
