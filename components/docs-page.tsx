'use client';

import { useState, type ReactNode } from 'react';
import { CodeEditor } from './code-editor';
import { McpConnect } from './mcp-connect';
import { PublicNav } from './public-nav';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.10kobo.xyz').replace(/\/$/, '');
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://10kobo.xyz').replace(/\/$/, '');

const SECTIONS: [string, string][] = [
  ['start', 'Getting started'],
  ['x402', 'x402 for AI agents'],
  ['http', 'HTTP API'],
  ['mcp', 'MCP'],
  ['links', 'Payment links and widget'],
  ['merchant', 'Checkout for developers'],
  ['webhooks', 'Webhooks'],
  ['statuses', 'Payment statuses'],
  ['limits', 'Limits'],
  ['errors', 'Errors'],
];

const X402_CODE = `// npm install @x402/core @x402/fetch @x402/near
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createClientNearSigner } from '@x402/near';
import { ExactNearScheme } from '@x402/near/exact/client';

// The agent's NEAR account. It needs USDC, and no NEAR for gas: 10kobo pays the gas.
const client = new x402Client();
client.register('near:*', new ExactNearScheme(createClientNearSigner({
  accountId: process.env.NEAR_ACCOUNT_ID,
  secretKey: process.env.NEAR_PRIVATE_KEY,
})));
client.setSpendControls({ maxAmountPerPayment: '$50' }); // the client refuses more than $1 unless you raise it

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment('${API}/v1/agent/x402/pay', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    amount_naira: 5000,
    bank_name: 'OPay',
    account_number: '0123456789',
    pay_from: 'near',
    refund_to: process.env.NEAR_ACCOUNT_ID,
    payer_name: 'Acme procurement agent',
    payer_email: 'agent@acme.com',
    purpose: 'Invoice 1042, office supplies',
  }),
});

const { settlement, payment } = await res.json();
console.log(res.status, payment.status, payment.account_name); // 200 processing ...`;

const X402_FLOW = `POST /v1/agent/x402/pay            (no payment yet)
← 402 Payment Required
  PAYMENT-REQUIRED: { accepts: [{ scheme: "exact", network: "near:mainnet",
                      amount: "1010137", asset: <USDC on NEAR>, payTo: <one-time account> }] }
  body.payment: { account_name: "ADA OKAFOR", amount_naira: 5000, status: "awaiting_deposit" }

POST /v1/agent/x402/pay            (same request again)
  PAYMENT-SIGNATURE: <signed USDC transfer>
← 200 OK
  PAYMENT-RESPONSE: { success: true, transaction: <NEAR tx>, network: "near:mainnet" }
  body.payment: { status: "processing" }   →   "paid" when the bank confirms`;

const HTTP_CODE = `# 1. Price it and see the account holder's name. Moves nothing.
curl -X POST ${API}/v1/agent/quotes \\
  -H "authorization: Bearer $TENKOBO_KEY" -H 'content-type: application/json' \\
  -d '{"amount_naira":5000,"bank_name":"OPay","account_number":"0123456789","pay_from":"base","refund_to":"0xYourWallet"}'

# 2. Accept it: get the exact USDC and a one-time deposit address. Safe to repeat.
curl -X POST ${API}/v1/agent/payments \\
  -H "authorization: Bearer $TENKOBO_KEY" -H 'content-type: application/json' \\
  -d '{"quote_id":"<id from step 1>"}'

# 3. Send pay_usdc to deposit_address from your wallet, then follow the payment.
curl ${API}/v1/agent/payments/<id> -H "authorization: Bearer $TENKOBO_KEY"

# All your payments as a spreadsheet.
curl ${API}/v1/agent/payments.csv -H "authorization: Bearer $TENKOBO_KEY"`;

const PAYMENT_JSON = `{
  "id": "7e612f7e-…",
  "status": "awaiting_deposit",
  "amount_naira": 5000,
  "amount": "₦5,000.00",
  "pay_usdc": "3.612480",
  "pay_from": "base",
  "bank_name": "OPay",
  "account_number": "****6789",
  "account_name": "ADA OKAFOR",
  "deposit_address": "0x…",
  "deposit_deadline": "2026-11-12T10:30:00.000Z",
  "transactions": [],
  "failure_reason": null
}`;

const WIDGET_CODE = `<script src="${SITE}/checkout.js"></script>

<!-- Copy the link ID from the 10kobo app: Payment links → your link → Copy checkout widget -->
<a href="${SITE}/p/YOUR_LINK_ID" data-10kobo-link="YOUR_LINK_ID">Pay ₦3,500</a>`;

const INVOICE_CODE = `// Server only. Never put the merchant key in a web page.
const res = await fetch('${API}/v1/merchant/invoices', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + process.env.TENKOBO_MERCHANT_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({
    reference: order.id,                       // your order ID; the same reference returns the same invoice
    line_items: [{ description: 'Jollof rice', amount_naira: 3500 }],
    return_url: 'https://yourshop.com/orders/' + order.id,
  }),
});
const invoice = await res.json();              // { id, status, amount_naira, reference, checkout_url, ... }`;

const OPEN_CODE = `<script src="${SITE}/checkout.js"></script>
<script>
  // invoiceId comes from your server (the invoice you just made).
  TenKobo.open(invoiceId, {
    onPaid: () => refreshOrder(),              // a hint only: confirm on your server
    onClose: ({ paid }) => { if (!paid) showRetry(); },
  });
</script>`;

const CONFIRM_CODE = `const res = await fetch('${API}/v1/merchant/invoices/' + invoiceId, {
  headers: { authorization: 'Bearer ' + process.env.TENKOBO_MERCHANT_KEY },
});
const invoice = await res.json();
if (invoice.status === 'paid' && invoice.reference === order.id && invoice.amount_naira === order.total) {
  await fulfilOnce(order.id);
}`;

const WEBHOOK_CODE = `import { createHmac, timingSafeEqual } from 'node:crypto';

// 10kobo-signature: t=1762941000,v1=<hex>
export function verify(rawBody: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!parts.t || !parts.v1 || age > 300) return false;          // older than 5 minutes: refuse
  const expected = createHmac('sha256', secret).update(parts.t + '.' + rawBody).digest('hex');
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

// Body: { "id": "<event id>", "type": "invoice.paid", "created_at": "…", "data": { <the invoice> } }
// Answer with any 2xx. Use the 10kobo-event-id header to skip a notice you already handled.`;

const STATUSES: [string, string][] = [
  ['quoted', 'Priced, nothing accepted yet. A quote expires after a few minutes.'],
  ['awaiting_deposit', 'Accepted. Send pay_usdc to deposit_address before deposit_deadline.'],
  ['processing', 'The USDC has arrived and is on its way to the bank partner.'],
  ['paying', 'The bank partner is paying the naira.'],
  ['paid', 'The naira is in the account. A receipt is attached.'],
  ['expired', 'Nothing arrived in time. Nothing was paid; ask for a new quote.'],
  ['refunded', 'Delivery failed and the USDC went back to refund_to. No naira was paid.'],
  ['needs_support', 'Something is being checked by a person. Do not pay again.'],
];

const LIMITS: [string, string][] = [
  ['Each payment, no key (x402)', '₦50,000'],
  ['Each wallet a day, no key', '₦100,000'],
  ['Each bank account a day, no key', '₦100,000'],
  ['Unpaid payments open to one account, no key', '3 at once'],
  ['Price checks from one address', '30 an hour'],
  ['Accepted payments from one address', '10 an hour'],
  ['With an API key', 'The daily limit set for that key'],
  ['Merchant keys per account', '3 live keys, 50 invoices a day each'],
];

const ERRORS: [string, string, string][] = [
  ['invalid_request', '400', 'A field is missing or wrong. The message names it.'],
  ['invalid_key', '401', 'The API or merchant key is not valid.'],
  ['key_required', '401', 'Paying without a key is closed right now.'],
  ['account_not_found', '404/422', 'The bank has no account with that number.'],
  ['below_minimum', '422', 'Too small. The message gives the smallest amount.'],
  ['over_payment_limit', '422', 'More than one payment may be.'],
  ['over_daily_limit', '422', 'Over the day’s limit for this key.'],
  ['over_wallet_limit', '422', 'This wallet has reached its limit for today.'],
  ['over_account_limit', '422', 'This bank account has received its limit for today.'],
  ['too_many_open', '429', 'Several unpaid payments to this account are waiting. Finish one first.'],
  ['too_many_requests', '429', 'Slow down and try again later.'],
  ['quote_expired', '410', 'Ask for a new quote.'],
  ['price_changed', '409', 'The rate moved. Ask for a new quote.'],
  ['reference_used', '409', 'That invoice reference already exists with different details.'],
  ['bank_unavailable', '503', 'The bank partner is not answering. Try again soon.'],
  ['unavailable', '503', 'The API is paused. Nothing was charged.'],
];

function Code({ name, code }: { name: string; code: string }) {
  return <CodeEditor files={[{ name, code }]} active={0} onSelect={() => undefined} />;
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-5 border-t border-[var(--line)] pt-10 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">{title}</h2>
        {lead && <p className="max-w-2xl text-[15px] leading-7 text-[var(--muted)]">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows, code = true }: { head: string[]; rows: string[][]; code?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)]">
          <tr>{head.map((cell) => <th key={cell} className="px-4 py-2.5 font-medium">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] bg-[var(--surface)]">
          {rows.map((row) => (
            <tr key={row[0]}>{row.map((cell, index) => <td key={index} className={`px-4 py-3 align-top ${index === 0 ? (code ? 'font-mono text-[13px] whitespace-nowrap' : 'font-medium') : 'text-[var(--muted)]'}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="max-w-2xl text-[15px] leading-7">{children}</p>;
const C = ({ children }: { children: ReactNode }) => <code className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[13px]">{children}</code>;

/** Public developer docs. No login: people and agents can read how to pay and get paid. */
export function DocsPage() {
  const [open, setOpen] = useState(false);
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-8">
      <PublicNav current="docs" />
      <div className="mx-auto grid w-full max-w-[1152px] gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Docs sections" className="lg:sticky lg:top-6 lg:self-start">
          <button type="button" className="mb-2 w-full rounded-xl border border-[var(--line)] px-4 py-2.5 text-left text-sm font-medium lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>
            On this page {open ? '▴' : '▾'}
          </button>
          <ul className={`${open ? 'flex' : 'hidden'} flex-col gap-0.5 lg:flex`}>
            {SECTIONS.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">{label}</a></li>
            ))}
            <li className="mt-3 border-t border-[var(--line)] pt-3"><a href="/llms.txt" className="block rounded-lg px-3 py-1.5 font-mono text-xs text-[var(--muted)] hover:text-[var(--foreground)]">llms.txt</a></li>
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12 pb-24">
          <header className="flex flex-col gap-3">
            <span className="product-eyebrow">10KOBO DOCS</span>
            <h1 className="text-4xl font-semibold tracking-tight">Pay any Nigerian bank account with USDC</h1>
            <p className="max-w-2xl text-[17px] leading-8 text-[var(--muted)]">
              Agents, apps and shops send USDC from Base, NEAR, Solana and more than ten other networks. 10kobo pays naira into the bank account, usually in under a minute. Shops can also take payment by bank transfer or crypto with a link or a checkout widget.
            </p>
          </header>

          <Section id="start" title="Getting started" lead="Pick the way that fits what you are building. Reading these docs needs no account.">
            <Table code={false} head={['If you are building…', 'Use', 'Account needed?']} rows={[
              ['an AI agent that pays people', 'x402 (standard, NEAR)', 'No. Just a NEAR wallet with USDC'],
              ['an assistant in Claude or ChatGPT', 'MCP', 'No'],
              ['a backend that pays at volume', 'HTTP API with a key', 'Yes, a key from us'],
              ['a shop with no developer', 'Payment links and widget', 'Yes, a free 10kobo account'],
              ['a shop with its own server', 'Checkout for developers', 'Yes, a merchant key from Settings'],
            ]} />
            <P>Base address for every request: <C>{API}</C>. Requests and answers are JSON. Amounts in naira are whole numbers (<C>5000</C> is ₦5,000); USDC amounts are strings with six decimals.</P>
            <P>Every quote shows the <strong>account holder’s name from the bank</strong> before any money moves, so your code or agent can stop if the name does not match.</P>
          </Section>

          <Section id="x402" title="x402 for AI agents" lead="10kobo speaks the x402 standard (version 2, scheme exact on near:mainnet). Any x402 client can pay a Nigerian bank account with no API key and no sign-up.">
            <Code name="pay-with-x402.ts" code={X402_CODE} />
            <P>What happens on the wire:</P>
            <Code name="x402-flow.txt" code={X402_FLOW} />
            <Table head={['Field', 'Meaning']} rows={[
              ['amount_naira', 'Naira the account receives, whole number'],
              ['bank_name', 'The bank as people say it: “OPay”, “GTBank”, “Access Bank”'],
              ['account_number', '10 digits'],
              ['pay_from', '“near” for the standard exact scheme'],
              ['refund_to', 'Where USDC goes back if delivery fails (your NEAR account)'],
              ['payer_name, payer_email, purpose', 'Required without a key, so every payment has a record'],
            ]} />
            <P>The agent signs one USDC transfer; 10kobo checks it with the official x402 NEAR verifier, submits it and pays the gas. If the bank payout fails, the USDC returns to <C>refund_to</C>. Base, Arbitrum, Ethereum and Solana are offered in the same 402 through a draft NEAR Intents scheme; the standard <C>exact</C> scheme on those networks is coming.</P>
          </Section>

          <Section id="http" title="HTTP API" lead="Three calls, from any language. With a key you get your own daily limit and a CSV of every payment. Keys are issued by us: message @10koboPay on X.">
            <Code name="pay-with-key.sh" code={HTTP_CODE} />
            <P>A payment looks like this. Keep <C>id</C>; it is also the receipt reference.</P>
            <Code name="payment.json" code={PAYMENT_JSON} />
            <P><C>pay_from</C> can be <C>base</C>, <C>near</C>, <C>arbitrum</C>, <C>ethereum</C>, <C>solana</C>, <C>optimism</C>, <C>polygon</C>, <C>avalanche</C>, <C>bsc</C>, <C>gnosis</C>, <C>monad</C>, <C>sui</C>, <C>aptos</C>, <C>tron</C> or <C>ton</C>. On Tron and TON you pay in USDT. Send exactly <C>pay_usdc</C> to <C>deposit_address</C>; it is used once.</P>
          </Section>

          <Section id="mcp" title="MCP" lead="Give Claude, ChatGPT or any MCP client the 10kobo tools. The assistant can price and set up payments; the money is always sent from your own wallet.">
            <McpConnect />
          </Section>

          <Section id="links" title="Payment links and the checkout widget" lead="For shops and creators with no developer. Make a link in the 10kobo app and share it, or paste two lines into any website.">
            <ol className="flex max-w-2xl list-decimal flex-col gap-2 pl-5 text-[15px] leading-7">
              <li>Open the 10kobo app → <strong>Payment links</strong> and make a new link. Choose a fixed price or let customers type the amount (with a minimum).</li>
              <li>Choose where the money goes: your 10kobo wallet, a bank account, USDC on Base, or a NEAR account.</li>
              <li>Share the link, or press <strong>Copy checkout widget</strong> and paste it into your website.</li>
            </ol>
            <Code name="checkout-widget.html" code={WIDGET_CODE} />
            <P>Customers pay by <strong>bank transfer in naira</strong> or <strong>crypto from any supported network</strong>. Each customer gets their own invoice, and the link can be used again and again.</P>
          </Section>

          <Section id="merchant" title="Checkout for developers" lead="Your server sets the price, 10kobo takes the payment, your server confirms it. Get a merchant key in the 10kobo app under Settings → Developers.">
            <Code name="1-create-invoice.ts" code={INVOICE_CODE} />
            <Code name="2-open-checkout.html" code={OPEN_CODE} />
            <Code name="3-confirm.ts" code={CONFIRM_CODE} />
            <Table head={['Call', 'What it does']} rows={[
              ['POST /v1/merchant/invoices', 'Make an invoice: reference, and amount_naira or line_items. Optional note, due_date, return_url'],
              ['GET /v1/merchant/invoices/:id', 'Read an invoice and its status'],
              ['POST /v1/merchant/invoices/:id/cancel', 'Cancel an unpaid invoice'],
            ]} />
            <P>In production, <C>return_url</C> and your webhook address must be public <C>https</C> addresses.</P>
          </Section>

          <Section id="webhooks" title="Webhooks" lead="Add a webhook address to your merchant key and 10kobo tells your server when an invoice is paid, cancelled or expired.">
            <Code name="verify-notice.ts" code={WEBHOOK_CODE} />
            <Table head={['Event', 'When']} rows={[
              ['invoice.paid', 'The money arrived. Always sent, even after an earlier expired or cancelled'],
              ['invoice.cancelled', 'You or the customer cancelled it'],
              ['invoice.expired', 'Nobody paid in time'],
            ]} />
            <P>A notice that does not get a 2xx answer is sent again later, with longer waits between tries.</P>
          </Section>

          <Section id="statuses" title="Payment statuses">
            <Table head={['Status', 'Meaning']} rows={STATUSES} />
          </Section>

          <Section id="limits" title="Limits" lead="Limits are checked in code, under a lock, before any money moves. They are not left to an AI.">
            <Table code={false} head={['Limit', 'Amount']} rows={LIMITS} />
          </Section>

          <Section id="errors" title="Errors" lead={'Every refusal has the same shape, so code can act on it: { "code": "too_many_open", "message": "…" }.'}>
            <Table head={['Code', 'HTTP', 'What to do']} rows={ERRORS} />
          </Section>

          <p className="text-sm text-[var(--muted)]">For AI agents: a plain-text version of these docs is at <a className="underline" href="/llms.txt">{SITE}/llms.txt</a>. Questions: <a className="underline" href="https://x.com/10koboPay" target="_blank" rel="noreferrer">@10koboPay</a>.</p>
        </div>
      </div>
    </main>
  );
}
