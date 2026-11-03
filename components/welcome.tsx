import type { ReactNode } from 'react';
import { ActivityIcon, CalendarIcon, CheckIcon, ChatIcon, Logo, PlusIcon } from './icons';

const FEATURES = [
  [ChatIcon, 'Bank transfers', 'Send naira to Nigerian banks. The account name shows before you pay.'],
  [ActivityIcon, 'Airtime and data', 'Top up a line in one message. The network is worked out for you.'],
  [CalendarIcon, 'Scheduled payments', 'Pay later today, next week or every month. Approve once.'],
  [PlusIcon, 'Deposit in naira', 'Pay in from your own bank and watch it arrive, step by step.'],
] as const;

const STEPS = [
  ['Type it', 'Say what you want in your own words, like "send 5k to Mum".'],
  ['Check it', 'See who gets paid and how much. Nothing moves until you approve.'],
  ['Done', 'It goes through, and you get a receipt right there in the chat.'],
] as const;

function FloatingNote({ title, detail, amount, className }: { title: string; detail: string; amount: string; className: string }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-[#0b2a20] shadow-[0_12px_32px_rgb(3_40_28/0.28)] ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9f2e6] text-[#086b4d]">
        <CheckIcon />
      </span>
      <div>
        <p className="whitespace-nowrap text-sm font-semibold leading-tight">{title}</p>
        <p className="whitespace-nowrap text-xs text-[#55695f]">{detail}</p>
      </div>
      <p className="amount ml-2 whitespace-nowrap text-sm font-semibold">{amount}</p>
    </div>
  );
}

function PreviewRow({ name, detail, amount }: { name: string; detail: string; amount: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#e6ece9] pb-2.5">
      <div>
        <p className="text-[13px] font-semibold">{name}</p>
        <p className="text-[11px] text-[#55695f]">{detail}</p>
      </div>
      <p className="amount text-[13px] font-semibold">{amount}</p>
    </div>
  );
}

/** A picture of the chat on a phone, with made-up names. It is not a working chat, so screen readers skip it. */
function Showcase() {
  return (
    <div aria-hidden className="relative h-[27rem] select-none overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#0d5c45] to-[#083d2e] md:h-[33rem]">
      <div className="absolute inset-x-0 -top-24 mx-auto h-80 w-[70%] rounded-full bg-[#3fd8a2] opacity-25 blur-3xl" />
      <div className="absolute inset-x-0 top-10 bottom-0 mx-auto w-[18.5rem] overflow-hidden rounded-t-[2.5rem] border-[7px] border-b-0 border-[#07261c] bg-white text-[#0b2a20] shadow-[0_30px_60px_rgb(0_0_0/0.35)] md:top-12 md:w-[20.5rem]">
        <div className="flex items-center gap-2 border-b border-[#e6ece9] px-4 pt-4 pb-3">
          <Logo size={22} />
          <span className="text-sm font-semibold">10kobo</span>
          <span className="amount ml-auto text-xs font-medium text-[#55695f]">₦48,200</span>
        </div>
        <div className="flex flex-col gap-2.5 p-3.5">
          <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#0a7f5c] px-3 py-2 text-[13px] text-white">Send 5k to Mum and ₦500 airtime to Tunde</p>
          <p className="self-start rounded-2xl rounded-bl-md bg-[#eef3f0] px-3 py-2 text-[13px]">Please check the details and approve.</p>
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[#e6ece9] p-3">
            <PreviewRow name="Mum" detail="Adaeze Okafor, GTBank ****4821" amount="₦5,000" />
            <PreviewRow name="Tunde" detail="0803 123 4567, MTN airtime" amount="₦500" />
            <p className="amount flex justify-between text-[13px] font-semibold">
              <span>Total</span>
              <span>₦5,500</span>
            </p>
            <div className="flex gap-2 text-[13px] font-semibold">
              <span className="flex-1 rounded-xl bg-[#0a7f5c] py-2 text-center text-white">Approve</span>
              <span className="rounded-xl border border-[#dbe5df] px-3 py-2">Reject</span>
            </div>
          </div>
          <p className="self-center rounded-full bg-[#eef3f0] px-3 py-1 text-[11px] text-[#55695f]">Receipt shows here once it is paid</p>
        </div>
      </div>
      <FloatingNote className="drift left-[6%] top-[22%] hidden md:flex lg:left-[9%]" title="Sent to Mum" detail="Bank transfer" amount="₦5,000" />
      <FloatingNote className="drift-late right-[6%] top-[44%] hidden md:flex lg:right-[9%]" title="Rent is scheduled" detail="28th of every month" amount="₦80,000" />
      <FloatingNote className="drift bottom-[12%] left-[6%] hidden lg:flex lg:left-[7%]" title="Airtime delivered" detail="Tunde, MTN" amount="₦500" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 py-12 md:py-16">
      <h2 className="max-w-xl text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {children}
    </section>
  );
}

export function Welcome({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="welcome min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="text-xl font-bold tracking-tight">10kobo</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSignIn} className="btn-secondary px-4 py-2 text-sm">
              Sign in
            </button>
            <button onClick={onSignIn} className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex">
              Create account
            </button>
          </div>
        </header>

        <main>
          <section className="grid items-end gap-6 pt-6 pb-8 md:grid-cols-[1.45fr_1fr] md:gap-12 md:pt-10 md:pb-10">
            <h1 className="text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.035em] md:text-[4.5rem]">
              Send money like sending a text.
            </h1>
            <div className="flex flex-col items-start gap-5 md:pb-2">
              <p className="text-lg leading-relaxed text-[var(--muted)]">
                Just type what you want to pay. 10kobo gets it ready, you approve it, and it is done.
              </p>
              <button onClick={onSignIn} className="btn-primary w-full px-7 py-3.5 sm:w-auto">
                Get started with email
              </button>
            </div>
          </section>

          <Showcase />

          <Section title="Three steps. No forms.">
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map(([title, detail], index) => (
                <li key={title} className="flex flex-col gap-3 rounded-3xl bg-[var(--surface)] p-6">
                  <span className="amount grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">{index + 1}</span>
                  <p className="text-xl font-bold tracking-tight">{title}</p>
                  <p className="text-[var(--muted)]">{detail}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Everything you pay for, in one chat.">
            <ul className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map(([Icon, title, detail]) => (
                <li key={title} className="flex gap-4 rounded-3xl border border-[var(--line)] p-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <Icon />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-lg font-bold tracking-tight">{title}</p>
                    <p className="text-[var(--muted)]">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <section className="mb-12 flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-[#083d2e] p-8 text-white md:flex-row md:items-center md:p-12">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Your next payment is one message away.</h2>
              <p className="text-[#b9d8ca]">Sign in with your email to get started.</p>
            </div>
            <button onClick={onSignIn} className="w-full shrink-0 cursor-pointer rounded-[0.875rem] bg-white px-7 py-3.5 font-semibold text-[#083d2e] transition-opacity hover:opacity-90 md:w-auto">
              Get started
            </button>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] py-6 text-sm text-[var(--muted)]">
          <span>© {new Date().getFullYear()} 10kobo</span>
          {process.env.NEXT_PUBLIC_WALLET_CHAIN !== 'base' && <span>Test version. No real money.</span>}
        </footer>
      </div>
    </div>
  );
}
