import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIcon, CalendarIcon, ChatIcon, CheckIcon, Logo, PlusIcon } from './icons';

const REQUESTS = [
  'send 5k to Mum',
  'buy Tunde ₦500 airtime',
  'pay my rent on the 28th every month',
  'deposit 20,000 naira',
  'send Ada 2 USDC in 30 minutes',
];

const STRIP = ['Bank transfers', 'Airtime', 'Data', 'Scheduled payments', 'Naira deposits', 'USDC', 'Built on Base', 'Receipts in the chat'];

const STEPS = [
  ['Type it', 'Say what you want in your own words, like "send 5k to Mum".'],
  ['Check it', 'See who gets paid and how much. Nothing moves until you approve.'],
  ['Done', 'It goes through, and you get a receipt right there in the chat.'],
] as const;

const FEATURES = [
  [ChatIcon, 'Bank transfers', 'The account name shows before you pay.'],
  [ActivityIcon, 'Airtime and data', 'The network is worked out for you.'],
  [CalendarIcon, 'Scheduled payments', 'Later today, next week or every month.'],
  [PlusIcon, 'Deposit in naira', 'Pay in from your bank and watch it arrive.'],
] as const;

/** Types each request, waits, then clears it. Shows the first one still for people who prefer no motion. */
function useTypedRequest(): string {
  const [text, setText] = useState(REQUESTS[0]!);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let request = 0;
    let letters = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const whole = REQUESTS[request]!;
      letters += 1;
      setText(whole.slice(0, letters));
      if (letters < whole.length) {
        timer = setTimeout(tick, 55);
      } else {
        timer = setTimeout(() => {
          request = (request + 1) % REQUESTS.length;
          letters = 0;
          tick();
        }, 1800);
      }
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, []);
  return text;
}

/** The signature of the page: the way in is itself a chat box, already typing what people ask for. */
function ChatStart({ onSignIn }: { onSignIn: () => void }) {
  const typed = useTypedRequest();
  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-[var(--line)] bg-white p-2 pl-5 shadow-[0_14px_40px_rgb(8_61_46/0.12)]">
      <p aria-hidden className="min-w-0 flex-1 truncate text-[15px] md:text-base">
        {typed}
        <span className="caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-[var(--accent)]" />
      </p>
      <button onClick={onSignIn} aria-label="Get started with email" className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#083d2e] py-2 pr-2 pl-4 text-sm font-semibold text-white transition-colors hover:bg-[#0a5a43] md:pl-5 md:text-[15px]">
        Get started
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-[#ffc53d] text-[#083d2e]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </button>
    </div>
  );
}

function Tile({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col justify-between gap-4 overflow-hidden rounded-[1.75rem] p-4 md:p-5 ${className}`}>
      <p className="max-w-[90%] self-start rounded-2xl rounded-bl-md bg-white/95 px-3 py-1.5 text-xs font-medium text-[#0b2a20] md:text-[13px]">{label}</p>
      <div>{children}</div>
    </div>
  );
}

const Paid = ({ text }: { text: string }) => (
  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium md:text-[13px]">
    <span className="grid h-4 w-4 place-items-center rounded-full bg-white/25"><CheckIcon /></span>
    {text}
  </p>
);

/** Made-up examples of what people ask for and what comes back, so screen readers skip them. */
function Tiles() {
  const figure = 'amount font-display text-[1.75rem] font-bold leading-none tracking-tight md:text-[2.5rem]';
  return (
    <div aria-hidden className="grid select-none grid-cols-2 gap-3 md:gap-4">
      <div className="flex flex-col gap-3 md:gap-4">
        <Tile className="min-h-48 bg-[#0a7f5c] text-white md:min-h-60" label="send 5k to Mum">
          <p className={figure}>₦5,000</p>
          <Paid text="Sent to her GTBank" />
        </Tile>
        <Tile className="min-h-44 bg-[#ff6b4a] text-white md:min-h-52" label="₦500 airtime for Tunde">
          <p className={figure}>₦500</p>
          <Paid text="MTN airtime" />
        </Tile>
      </div>
      <div className="flex flex-col gap-3 pt-8 md:gap-4 md:pt-12">
        <Tile className="min-h-44 bg-[#2f3bd6] text-white md:min-h-52" label="pay rent every month">
          <p className={figure}>Every 28th</p>
          <Paid text="₦80,000, approved once" />
        </Tile>
        <Tile className="min-h-48 bg-[#ffc53d] text-[#2b2100] md:min-h-60" label="deposit 20k">
          <p className={figure}>₦20,000</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium md:text-[13px]">
            <span className="h-2 w-2 rounded-full bg-[#2b2100]" />
            On its way to your wallet
          </p>
        </Tile>
      </div>
    </div>
  );
}

export function Welcome({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="welcome min-h-dvh overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-xl font-bold tracking-tight">10kobo</span>
          </div>
          <nav aria-label="Page" className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-white p-1 text-sm font-medium md:flex">
            <a href="#how" className="rounded-full px-4 py-2 transition-colors hover:bg-[var(--surface-2)]">How it works</a>
            <a href="#what" className="rounded-full px-4 py-2 transition-colors hover:bg-[var(--surface-2)]">What you can do</a>
          </nav>
          <button onClick={onSignIn} className="cursor-pointer rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]">
            Sign in
          </button>
        </header>

        <main>
          <section className="grid items-center gap-10 pt-4 pb-10 md:grid-cols-[1.08fr_1fr] md:gap-12 md:pt-6 md:pb-12">
            <div className="flex flex-col items-start gap-6 md:gap-7">
              <h1 className="font-display text-[3.1rem] font-bold leading-[1.02] tracking-[-0.03em] md:text-[4.75rem]">
                Send money like sending a{' '}
                <span className="relative inline-block rounded-[1.1rem] rounded-bl-[0.3rem] bg-[#0a7f5c] px-3.5 pb-1.5 text-white md:rounded-[1.5rem] md:rounded-bl-[0.4rem]">text.</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-[var(--muted)]">
                Type what you want to pay, in your own words. 10kobo gets it ready, you approve it, and you get a receipt.
              </p>
              <ChatStart onSignIn={onSignIn} />
            </div>
            <Tiles />
          </section>
        </main>
      </div>

      <div aria-hidden className="overflow-hidden border-y border-[var(--line)] bg-white py-4">
        <div className="marquee flex w-max">
          {[...STRIP, ...STRIP].map((item, index) => (
            <span key={index} className="font-display flex items-center gap-8 pr-8 text-lg font-semibold whitespace-nowrap md:text-xl">
              {item}
              <span className="h-2 w-2 rounded-full bg-[#ffc53d]" />
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <section id="how" className="flex scroll-mt-6 flex-col gap-7 py-14 md:py-20">
          <h2 className="font-display max-w-xl text-4xl font-bold tracking-tight md:text-5xl">Three steps. No forms.</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, detail], index) => (
              <li key={title} className="flex flex-col gap-3 rounded-[1.75rem] bg-white p-6 md:p-7">
                <span className="font-display text-5xl font-bold text-[#0a7f5c]">{index + 1}</span>
                <p className="font-display text-2xl font-bold tracking-tight">{title}</p>
                <p className="text-[var(--muted)]">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="what" className="flex scroll-mt-6 flex-col gap-7 pb-14 md:pb-20">
          <h2 className="font-display max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">One chat for all of it.</h2>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {FEATURES.map(([Icon, title, detail]) => (
              <li key={title} className="flex items-center gap-4 border-t border-[var(--line)] py-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <Icon />
                </span>
                <div>
                  <p className="font-display text-lg font-bold tracking-tight">{title}</p>
                  <p className="text-[var(--muted)]">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] py-6 text-sm text-[var(--muted)]">
          <span>© {new Date().getFullYear()} 10kobo</span>
          {process.env.NEXT_PUBLIC_WALLET_CHAIN !== 'base' && <span>Test version. No real money.</span>}
        </footer>
      </div>
    </div>
  );
}
