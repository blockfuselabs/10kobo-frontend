import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIcon, CalendarIcon, ChatIcon, CheckIcon, Logo, PlusIcon } from './icons';

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
  { request: 'buy Tunde ₦500 airtime', name: 'Tunde', detail: '08031234567 (MTN)', kind: 'Airtime', amount: '₦500', second: '0.36 USDC', doneLabel: 'Paid', doneNote: 'Receipt · 3 Nov, 18:14' },
  { request: 'pay my rent 80k on the 28th every month', name: 'Landlord', detail: 'Musa Bello, Access ****2210', kind: 'Every month on the 28th', amount: '₦80,000', second: 'Approve once', doneLabel: 'Scheduled', doneNote: 'Runs by itself. Cancel any time.' },
  { request: 'send Ada 2 USDC in 30 minutes', name: 'Ada', detail: '0x71C7…976F', kind: 'In 30 minutes', amount: '2.00 USDC', second: 'about ₦2,750', doneLabel: 'Scheduled', doneNote: 'Runs by itself. Cancel any time.' },
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

function PhoneFrame({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`absolute overflow-hidden rounded-[2.75rem] border-[7px] border-[#0d1311] bg-white text-[#0b2a20] shadow-[0_30px_70px_rgb(8_40_30/0.25)] ${className}`}>
      <div className="flex items-center justify-between px-7 pt-3 text-[11px] font-semibold">
        <span className="amount">18:12</span>
        <span className="h-[1.1rem] w-[4.5rem] rounded-full bg-[#0d1311]" />
        <span className="amount">5G</span>
      </div>
      {children}
      <div className="mx-auto mt-1 mb-2 h-1 w-28 rounded-full bg-[#0b2a20]/25" />
    </div>
  );
}

function PhoneHeader() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#e6ece9] px-4 py-3">
      <div className="flex items-center gap-2">
        <Logo size={24} />
        <span className="text-sm font-semibold">10kobo</span>
      </div>
      <span className="amount text-[13px] font-semibold">48.20 USDC</span>
    </div>
  );
}

const ACTIVITY = [
  ['Bank to Mum', '3 Nov · completed', '₦5,000'],
  ['Airtime to Tunde', '3 Nov · completed', '₦500'],
  ['Deposit received', '3 Nov · completed', '14.40 USDC'],
  ['USDC to Ada', '2 Nov · completed', '₦2,750'],
  ['Bank to Landlord', '28 Oct · completed', '₦80,000'],
] as const;

/** Two phones showing how the app looks. The front one follows the typing box, so readers can see what a request becomes. */
function Phones({ scene, typed, phase }: { scene: Scene; typed: string; phase: Phase }) {
  const sent = phase !== 'typing';
  return (
    <div aria-hidden className="relative h-[37rem] select-none md:h-[39rem]">
      <PhoneFrame className="top-6 right-[calc(20rem+0.5rem)] hidden w-[16.5rem] -rotate-[4deg] xl:block">
        <PhoneHeader />
        <div className="flex h-[28rem] flex-col gap-2 p-3">
          <p className="px-1 text-[17px] font-semibold tracking-tight">Activity</p>
          {ACTIVITY.map(([title, when, amount]) => (
            <div key={title} className="flex justify-between gap-2 rounded-2xl border border-[#e6ece9] p-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{title}</p>
                <p className="text-[10.5px] text-[#66736e]">{when}</p>
              </div>
              <p className="amount shrink-0 text-[13px] font-semibold">{amount}</p>
            </div>
          ))}
        </div>
      </PhoneFrame>

      <PhoneFrame className="top-2 right-1/2 z-10 w-[19rem] translate-x-1/2 rotate-[3deg] md:w-[20rem] lg:right-1 lg:translate-x-0">
        <PhoneHeader />
        <div className="flex h-[29rem] flex-col justify-end gap-2.5 overflow-hidden p-3.5">
          <p className="self-center rounded-full bg-[#eef3f0] px-3 py-1 text-[11px] text-[#55695f]">You received 14.40 USDC. <span className="font-medium text-[#0a7f5c]">View</span></p>
          <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#0a7f5c] px-3.5 py-2 text-[13.5px] text-white">how much do I have?</p>
          <p className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-[#eef3f0] px-3.5 py-2 text-[13.5px]">You have 48.20 USDC, about ₦66,300.</p>
          {sent && (
            <>
              <p key={scene.request} className="rise max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#0a7f5c] px-3.5 py-2 text-[13.5px] text-white">{scene.request}</p>
              <p className="rise self-start rounded-2xl rounded-bl-md bg-[#eef3f0] px-3.5 py-2 text-[13.5px]">Please check the details and approve.</p>
              <div className="rise flex flex-col gap-2.5 rounded-2xl border border-[#dbe5df] p-3.5">
                <div className="flex justify-between gap-3 border-b border-[#e6ece9] pb-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{scene.name}</p>
                    <p className="truncate text-[11.5px] text-[#66736e]">{scene.detail}</p>
                    <p className="text-[11.5px] text-[#66736e]">{scene.kind}</p>
                    {phase === 'done' && <p className="rise mt-0.5 text-[13px] font-semibold text-[#0a7f5c]">{scene.doneLabel}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="amount text-sm font-semibold">{scene.amount}</p>
                    <p className="amount text-[11.5px] text-[#66736e]">{scene.second}</p>
                  </div>
                </div>
                {phase === 'done' ? (
                  <p className="rise flex items-center gap-1.5 text-[11.5px] text-[#66736e]">
                    <span className="text-[#0a7f5c]"><CheckIcon /></span>
                    {scene.doneNote}
                  </p>
                ) : (
                  <div className="flex gap-2 text-[13px] font-semibold">
                    <span className="flex-1 rounded-xl bg-[#0a7f5c] py-2 text-center text-white">Approve</span>
                    <span className="rounded-xl border border-[#dbe5df] px-3 py-2">Reject</span>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="mt-0.5 flex shrink-0 items-center gap-2 rounded-2xl border border-[#dbe5df] py-1.5 pr-1.5 pl-3.5 text-[13px]">
            <span className={`min-w-0 flex-1 truncate ${sent || !typed ? 'text-[#66736e]' : ''}`}>{sent || !typed ? 'Tell me what to pay' : typed}</span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#0a7f5c] text-white">↑</span>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

export function Welcome({ onSignIn }: { onSignIn: () => void }) {
  const { scene, typed, phase } = useDemo();
  return (
    <div className="welcome min-h-dvh overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
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
          <section className="grid items-center gap-8 pt-4 pb-6 lg:grid-cols-[1fr_1.05fr] lg:gap-6 md:pt-4 md:pb-10">
            <div className="flex flex-col items-start gap-6 md:gap-7">
              <h1 className="font-display text-[3.1rem] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[4rem] lg:text-[3.4rem] xl:text-[4.4rem]">
                Send money like <br className="hidden sm:block" />
                sending a{' '}
                <span className="relative inline-block rounded-[1.1rem] bg-[#0a7f5c] px-[0.28em] pb-[0.08em] text-white">
                  text.
                  <svg aria-hidden viewBox="0 0 20 20" className="absolute -bottom-[0.12em] left-0 h-[0.32em] w-[0.32em] fill-[#0a7f5c]"><path d="M0 0h20C20 11 11 20 0 20Z" /></svg>
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[var(--muted)] md:text-xl">
                Type what you want to pay, in your own words. 10kobo gets it ready, you approve it, and you get a receipt.
              </p>
              <ChatStart onSignIn={onSignIn} typed={typed} />
              <ul className="flex flex-wrap gap-x-6 gap-y-2 pl-1 text-sm font-medium text-[#3d5248]">
                {['You approve every payment', 'Pay in naira or USDC', 'A receipt every time'].map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <span className="text-[#0a7f5c]"><CheckIcon /></span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <Phones scene={scene} typed={typed} phase={phase} />
          </section>
        </main>
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
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
