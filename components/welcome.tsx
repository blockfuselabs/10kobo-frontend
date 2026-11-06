import { useEffect, useState, type ReactNode } from 'react';
import { ProofHighlights } from './proof-page';
import { ActivityIcon, CalendarIcon, ChatIcon, CheckIcon, Logo, PlusIcon, ThemeToggle } from './icons';

const STEPS = [
  ['Say it or pick it', 'Type "send 5k to Mum" in the chat, or choose who and how much on the Send page.'],
  ['Check it', 'See the account name, the network and what arrives. Nothing moves until you approve with your PIN.'],
  ['Done', 'It goes through in a minute or two, with a receipt and a link to check it on the blockchain.'],
] as const;

const NETWORKS = ['Base', 'NEAR', 'Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Avalanche', 'Solana', 'Stellar', 'Tron', 'BNB Chain', 'TON', 'Sui', 'Aptos', 'Gnosis', 'Monad'];
const BANKS = ['OPay', 'Moniepoint', 'PalmPay', 'Kuda', 'GTBank', 'Access', 'Zenith', 'First Bank', 'UBA'];

const FOR_YOU = [
  'Pay any Nigerian bank from your USDC, with the account name shown first',
  'Send USDC or USDT to 16 networks, from Stellar to Tron',
  'Airtime and data for MTN, Airtel, Glo and 9mobile',
  'Deposit by naira bank transfer, or from 14 other networks',
  'Schedule payments: later today, next week or every month',
];
const FOR_BUSINESS = [
  'Invoices your clients pay in naira by bank transfer, or in crypto from 15 networks',
  'Get paid in naira to your bank, or in USDC to your wallet',
  'A checkout button for your website that opens over your page',
  'Signed notices to your server the moment an order is paid',
  'An Invoices tab to see what is paid, due or overdue',
];
const AGENT_POINTS = [
  ['No sign-up needed', 'An agent can pay over x402 with no account and no API key, or use a key with its own limits.'],
  ['Pays from NEAR with no gas', 'The agent sends USDC on NEAR. A relayer covers the gas, so it needs no NEAR of its own.'],
  ['Checks before it pays', 'Every quote names the bank account holder first, so an agent can stop if the name is wrong.'],
  ['Limits it cannot pass', 'Caps per payment, per account and per day, and every payment has a receipt and its transactions.'],
] as const;
const SAFETY = [
  ['Never holds your money', 'Payments go straight through NEAR Intents and our payment partner. Nothing sits with 10kobo.'],
  ['Your approval, every time', 'Nothing moves until you approve, and new recipients and payments need your PIN.'],
  ['Mistakes caught early', 'Bank names checked, wallet addresses checksum-checked, and token contracts refused.'],
  ['Proof on the blockchain', 'Every crypto step has a transaction anyone can check. Paid means seen on chain.'],
] as const;

type Scene = {
  request: string;
  name: string;
  detail: string;
  kind: string;
  amount: string;
  second: string;
  doneLabel: string;
  doneNote: string;
};

// Made-up people and amounts, shown the way the real app shows them.
const SCENES: Scene[] = [
  { request: 'send 5k to Mum', name: 'Mum', detail: 'Adaeze Okafor, GTBank ****4821', kind: 'Bank transfer', amount: '₦5,000', second: '3.63 USDC', doneLabel: 'Paid', doneNote: 'Receipt · 3 Nov, 18:12' },
  { request: 'send Ada 10 USDC on Stellar', name: 'Ada', detail: 'GAZ6GH…Z6OB · Stellar', kind: 'Receiver gets about 9.97 USDC', amount: '10.00 USDC', second: 'about ₦13,750', doneLabel: 'Delivered in 40 s', doneNote: 'Receipt · proof on Stellar' },
  { request: 'invoice my client 50k for the logo', name: 'Invoice · Logo design', detail: 'Your client pays by bank transfer or crypto', kind: 'You get USDC in your wallet', amount: '₦50,000', second: 'naira or USDC', doneLabel: 'Paid by bank transfer', doneNote: 'USDC in your wallet · receipt sent' },
  { request: 'buy Tunde ₦500 airtime', name: 'Tunde', detail: '08031234567 (MTN)', kind: 'Airtime', amount: '₦500', second: '0.36 USDC', doneLabel: 'Paid', doneNote: 'Receipt · 3 Nov, 18:14' },
  { request: 'pay my rent 80k on the 28th every month', name: 'Landlord', detail: 'Musa Bello, Access ****2210', kind: 'Every month on the 28th', amount: '₦80,000', second: 'Approve once', doneLabel: 'Scheduled', doneNote: 'Runs by itself. Cancel any time.' },
];

type Phase = 'typing' | 'approve' | 'done';

/** Plays each request: typed in the box, then shown in the phone for approval, then paid. */
function useDemo(): { scene: Scene; typed: string; phase: Phase } {
  const [state, setState] = useState<{ index: number; letters: number; phase: Phase }>({ index: 0, letters: SCENES[0]!.request.length, phase: 'done' });
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const play = (index: number, letters: number) => {
      const scene = SCENES[index]!;
      setState({ index, letters, phase: 'typing' });
      if (letters < scene.request.length) {
        timer = setTimeout(() => play(index, letters + 1), 55);
        return;
      }
      timer = setTimeout(() => {
        setState({ index, letters, phase: 'approve' });
        timer = setTimeout(() => {
          setState({ index, letters, phase: 'done' });
          timer = setTimeout(() => play((index + 1) % SCENES.length, 0), 2600);
        }, 1500);
      }, 450);
    };
    timer = setTimeout(() => play(1, 0), 1500);
    return () => clearTimeout(timer);
  }, []);
  const scene = SCENES[state.index]!;
  return { scene, typed: scene.request.slice(0, state.letters), phase: state.phase };
}

/** The signature of the page: the way in is itself a chat box, already typing what people ask for. */
function ChatStart({ onSignIn, typed }: { onSignIn: () => void; typed: string }) {
  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 pl-5 shadow-[0_14px_40px_rgb(8_61_46/0.12)]">
      <p aria-hidden className="min-w-0 flex-1 truncate text-[15px] md:text-base">
        {typed}
        <span className="caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-[var(--accent)]" />
      </p>
      <button onClick={onSignIn} aria-label="Get started" className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[var(--deep)] py-2 pr-2 pl-4 text-sm font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--deep-hover)] md:pl-5 md:text-[15px]">
        Get started
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-[var(--pop)] text-[#111]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </button>
    </div>
  );
}

const Nav = ({ Icon, label, active = false }: { Icon: () => ReactNode; label: string; active?: boolean }) => (
  <p className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)]'}`}>
    <Icon />
    {label}
  </p>
);

/** The web app in a browser window, built to match the real one. It follows the typing box, so readers see what a request becomes. */
function AppWindow({ scene, typed, phase }: { scene: Scene; typed: string; phase: Phase }) {
  const sent = phase !== 'typing';
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-5xl select-none overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[0_34px_80px_rgb(0_0_0/0.18),0_8px_20px_rgb(0_0_0/0.06)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff6159]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c941]" />
        <span className="mx-auto rounded-lg bg-[var(--surface)] px-16 py-1 text-xs font-medium text-[var(--muted)] md:px-28">10kobo</span>
        <span className="w-[3.25rem]" />
      </div>
      <div className="grid h-[31rem] grid-cols-1 xl:grid-cols-[12.5rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-4 border-r border-[var(--line)] p-3.5 xl:flex">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-semibold tracking-tight">10kobo</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)] p-3.5">
            <p className="text-xs font-medium text-[var(--muted)]">Your balance</p>
            <p className="amount text-xl font-semibold tracking-tight">48.20 USDC</p>
            <p className="amount text-xs text-[var(--muted)]">≈ ₦66,300</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <Nav Icon={ChatIcon} label="Chat" active />
            <Nav Icon={CalendarIcon} label="Scheduled" />
            <Nav Icon={ActivityIcon} label="Activity" />
            <Nav Icon={PlusIcon} label="Deposit" />
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-5">
            <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-text)]">how much do I have?</p>
            <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2.5 text-sm">You have 48.20 USDC, about ₦66,300.</p>
            {sent && (
              <>
                <p key={scene.request} className="rise max-w-[80%] self-end rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-text)]">{scene.request}</p>
                <p className="rise self-start rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2.5 text-sm">Please check the details and approve.</p>
                <div className="rise flex w-full max-w-md flex-col gap-3 self-start rounded-2xl border border-[var(--line)] p-4">
                  <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{scene.name}</p>
                      <p className="truncate text-sm text-[var(--muted)]">{scene.detail}</p>
                      <p className="text-sm text-[var(--muted)]">{scene.kind}</p>
                      {phase === 'done' && <p className="rise mt-1 text-sm font-semibold text-[var(--accent)]">{scene.doneLabel}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="amount font-semibold">{scene.amount}</p>
                      <p className="amount text-sm text-[var(--muted)]">{scene.second}</p>
                    </div>
                  </div>
                  {phase === 'done' ? (
                    <p className="rise flex items-center gap-2 text-sm text-[var(--muted)]">
                      <span className="text-[var(--accent)]"><CheckIcon /></span>
                      {scene.doneNote}
                    </p>
                  ) : (
                    <div className="flex gap-2 text-sm font-semibold">
                      <span className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-center text-[var(--accent-text)]">Approve</span>
                      <span className="rounded-xl border border-[var(--line)] px-5 py-2.5">Reject</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] py-2 pr-2 pl-4 text-sm">
              <span className={`min-w-0 flex-1 truncate ${sent || !typed ? 'text-[var(--muted)]' : ''}`}>{sent || !typed ? 'Tell me what to pay' : typed}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-text)]">↑</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small round tags, used for networks and banks. */
const Tags = ({ items }: { items: readonly string[] }) => (
  <ul className="flex flex-wrap gap-1.5">
    {items.map((item) => (
      <li key={item} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm font-medium">{item}</li>
    ))}
  </ul>
);

const Tick = () => (
  <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--pop)] text-[#111]"><CheckIcon /></span>
);

/** Naira on one side, 16 networks on the other, and 10kobo turning one into the other in both directions. */
function BothWays() {
  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--muted)]">NAIRA</p>
        <p className="font-display text-2xl font-bold tracking-tight">Any Nigerian bank</p>
        <Tags items={[...BANKS, 'and more']} />
        <p className="text-sm text-[var(--muted)]">Pay out to any account, or pay in by bank transfer.</p>
      </div>
      <div className="flex items-center justify-center lg:flex-col" aria-hidden>
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-[var(--pop)] px-6 py-5 text-[#111] lg:py-8">
          <Logo size={40} />
          <span className="font-display text-lg font-bold">10kobo</span>
          <span className="text-2xl leading-none">⇄</span>
          <span className="text-center text-xs font-semibold">both ways,<br />in minutes</span>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--muted)]">STABLECOINS</p>
        <p className="font-display text-2xl font-bold tracking-tight">USDC and USDT on 16 networks</p>
        <Tags items={NETWORKS} />
        <p className="text-sm text-[var(--muted)]">Send to 16 · get paid from 15 · deposit from 14. Moved by NEAR Intents.</p>
      </div>
    </div>
  );
}

function Audience({ tag, title, points, cta, onClick }: { tag: string; title: string; points: string[]; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-5 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] md:p-8">
      <span className="w-fit rounded-full bg-[var(--pop)] px-3 py-1 text-xs font-semibold text-[#111]">{tag}</span>
      <p className="font-display text-3xl font-bold tracking-tight">{title}</p>
      <ul className="flex flex-col gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3"><Tick /><span>{point}</span></li>
        ))}
      </ul>
      <button onClick={onClick} className="mt-auto w-fit cursor-pointer rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]">{cta} →</button>
    </div>
  );
}

const AGENT_CODE = `POST /v1/agent/quotes
{
  "amount_naira": 5000,
  "bank_name": "OPay",
  "account_number": "8031234568",
  "pay_from": "near",
  "refund_to": "agent.near"
}

200 OK
{
  "status": "quoted",
  "account_name": "Ada Bello",
  "account_number": "****4568",
  "pay_usdc": "3.613829"
}`;

const SHOP_CODE = `<script src="YOUR_10KOBO_LINK/checkout.js"></script>
<button onclick="TenKobo.open(invoiceId)">
  Pay with naira or crypto
</button>`;

function Code({ code, label }: { code: string; label: string }) {
  return (
    <figure className="flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)]">
      <figcaption className="border-b border-[var(--line)] px-5 py-3 text-xs font-semibold text-[var(--muted)]">{label}</figcaption>
      <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed"><code>{code}</code></pre>
    </figure>
  );
}

export function Welcome({ onSignIn }: { onSignIn: () => void }) {
  const { scene, typed, phase } = useDemo();
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <header className="flex items-center justify-between py-5 md:py-7">
          <div className="flex items-center gap-2.5">
            <Logo size={42} />
            <span className="font-display text-2xl font-bold tracking-tight md:text-[1.75rem]">10kobo</span>
          </div>
          <nav aria-label="Page" className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1.5 text-base font-medium lg:flex">
            <a href="#both-ways" className="rounded-full px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]">How it works</a>
            <a href="#business" className="rounded-full px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]">Businesses</a>
            <a href="#agents" className="rounded-full px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]">AI agents</a>
            <a href="/proof" className="rounded-full px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]">Proof</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-11 w-11 rounded-full" />
            <button onClick={onSignIn} className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-[15px] font-semibold transition-colors hover:bg-[var(--surface-2)] md:px-7 md:py-3 md:text-base">
              Sign in
            </button>
          </div>
        </header>

        <main>
          <section className="flex flex-col gap-10 pt-4 pb-8 md:pt-8 md:pb-10">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
              <div className="flex flex-col items-start gap-6">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#28c941] align-middle" />
                  Live on mainnet · built on NEAR
                </span>
                <h1 className="font-display text-[2.9rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[4rem] lg:text-[3.25rem] xl:text-[4.1rem]">
                  Naira and stablecoins,{' '}
                  <span className={`relative inline-block rounded-[0.9rem] bg-[var(--accent)] px-[0.28em] pb-[0.08em] text-[var(--accent-text)] ${phase === 'approve' ? 'bubble-send' : ''}`}>
                    <span className="inline-block overflow-hidden align-bottom">
                      <span key={phase === 'approve' ? scene.request : 'rest'} className={`inline-block ${phase === 'approve' ? 'text-send' : ''}`}>both ways.</span>
                    </span>
                    <svg aria-hidden viewBox="0 0 20 20" className="absolute -bottom-[0.12em] left-0 h-[0.32em] w-[0.32em] fill-[var(--accent)]"><path d="M0 0h20C20 11 11 20 0 20Z" /></svg>
                  </span>
                </h1>
                <p className="text-lg leading-relaxed text-[var(--muted)]">
                  Pay any bank in Nigeria or any wallet on 16 networks, by chat or by tap. Get paid in naira or USDC. Let your AI agents pay too.
                </p>
                <ChatStart onSignIn={onSignIn} typed={typed} />
                <a href="/proof" className="text-sm font-semibold underline underline-offset-4">See it working with real money →</a>
              </div>
              <div className="float min-w-0 text-left">
                <AppWindow scene={scene} typed={typed} phase={phase} />
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 md:px-8">
        <section id="proof" className="flex scroll-mt-6 flex-col gap-6 pt-6 pb-14 md:pt-10 md:pb-20">
          <div className="flex flex-col gap-2">
            <span className="w-fit rounded-full bg-[var(--pop)] px-3 py-1 text-xs font-semibold text-[#111]">Mainnet · real money</span>
            <h2 className="font-display max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">Proven with real money.</h2>
            <p className="max-w-2xl text-[var(--muted)]">Not a demo: these moved real naira and real USDC. Open any of them on its blockchain.</p>
          </div>
          <ProofHighlights />
        </section>

        <section id="both-ways" className="flex scroll-mt-6 flex-col gap-7 pb-14 md:pb-20">
          <div className="flex flex-col gap-2">
            <h2 className="font-display max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">Money in, money out.</h2>
            <p className="max-w-2xl text-[var(--muted)]">Naira becomes USDC, and USDC becomes naira, between any Nigerian bank and 16 blockchains.</p>
          </div>
          <BothWays />
        </section>

        <section id="business" className="grid scroll-mt-6 gap-4 pb-14 md:pb-20 lg:grid-cols-2">
          <Audience tag="For you" title="Pay anyone, anywhere." points={FOR_YOU} cta="Get started" onClick={onSignIn} />
          <Audience tag="For businesses" title="Get paid however they pay." points={FOR_BUSINESS} cta="Make your first invoice" onClick={onSignIn} />
        </section>

        <section id="agents" className="flex scroll-mt-6 flex-col gap-8 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col gap-5">
              <span className="w-fit rounded-full bg-[var(--pop)] px-3 py-1 text-xs font-semibold text-[#111]">For AI agents</span>
              <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">AI agents can pay a Nigerian bank now.</h2>
              <p className="text-lg text-[var(--muted)]">
                One API call quotes it and names the account holder. The agent pays in USDC from NEAR, Base, Solana or 12 more networks, and the naira lands in the bank in about two minutes.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {AGENT_POINTS.map(([title, detail]) => (
                  <li key={title} className="flex gap-3">
                    <Tick />
                    <span><span className="block font-semibold">{title}</span><span className="text-sm text-[var(--muted)]">{detail}</span></span>
                  </li>
                ))}
              </ul>
              <a href="/proof" className="w-fit text-sm font-semibold underline underline-offset-4">See an agent pay OPay from NEAR, on chain →</a>
            </div>
            <Code code={AGENT_CODE} label="An agent asks for a quote" />
          </div>
        </section>

        <section className="grid gap-8 pt-14 pb-14 md:pt-20 md:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full bg-[var(--pop)] px-3 py-1 text-xs font-semibold text-[#111]">For online shops</span>
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">A checkout button in three lines.</h2>
            <p className="text-lg text-[var(--muted)]">Your customer pays by bank transfer or crypto in a box over your page. You get naira or USDC, and a signed notice the moment it is paid.</p>
            <a href="/shop" className="w-fit text-sm font-semibold underline underline-offset-4">Try the demo shop →</a>
          </div>
          <Code code={SHOP_CODE} label="On your website" />
        </section>

        <section id="how" className="flex scroll-mt-6 flex-col gap-7 pb-14 md:pb-20">
          <h2 className="font-display max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">Three steps.</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, detail], index) => (
              <li key={title} className="flex flex-col gap-3 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] md:p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--pop)] font-display text-xl font-bold text-[#111]">{index + 1}</span>
                <p className="font-display text-2xl font-bold tracking-tight">{title}</p>
                <p className="text-[var(--muted)]">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="safe" className="flex scroll-mt-6 flex-col gap-7 pb-14 md:pb-20">
          <h2 className="font-display max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">Safe by design.</h2>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {SAFETY.map(([title, detail]) => (
              <li key={title} className="flex gap-4 border-t border-[var(--line)] py-5">
                <Tick />
                <div>
                  <p className="font-display text-lg font-bold tracking-tight">{title}</p>
                  <p className="text-[var(--muted)]">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 flex flex-col items-start gap-5 rounded-[2rem] bg-[var(--pop)] p-8 text-[#111] md:mb-20 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="font-display text-3xl font-bold tracking-tight md:text-4xl">Naira and stablecoins, both ways.</p>
            <p className="mt-1 text-[#111]/70">Sign in with your email. Your wallet is made for you.</p>
          </div>
          <button onClick={onSignIn} className="cursor-pointer rounded-full bg-[#111] px-7 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90">Get started</button>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-6 text-sm text-[var(--muted)]">
          <span>© {new Date().getFullYear()} 10kobo · built for the NEAR Hackathon</span>
          <span className="flex flex-wrap gap-4">
            <a href="/proof" className="hover:text-[var(--foreground)]">Proof</a>
            <a href="/shop" className="hover:text-[var(--foreground)]">Demo shop</a>
            {process.env.NEXT_PUBLIC_WALLET_CHAIN !== 'base' && <span>Test version. No real money.</span>}
          </span>
        </footer>
      </div>
    </div>
  );
}
