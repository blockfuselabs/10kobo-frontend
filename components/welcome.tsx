import { ActivityIcon, CalendarIcon, ChatIcon, Logo, PlusIcon } from './icons';

const FEATURES = [
  [ChatIcon, 'Bank transfers', 'Send naira to Nigerian banks.'],
  [ActivityIcon, 'Airtime and data', 'Top up a line in one message.'],
  [CalendarIcon, 'Scheduled payments', 'Set it once, for later or every month.'],
  [PlusIcon, 'Deposit in naira', 'Add money from your own bank.'],
] as const;

/** A picture of the chat, not a working one, so it is hidden from screen readers. */
function ChatPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm select-none">
      <div className="absolute -inset-10 -z-10 rounded-full bg-[var(--accent)] opacity-[0.12] blur-3xl" />
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-[var(--line)] bg-[var(--sidebar)] p-4 shadow-[var(--shadow)]">
        <p className="rise max-w-[85%] self-end rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-text)]">
          Send 5k to Mum and buy Tunde ₦500 airtime
        </p>
        <p className="rise max-w-[85%] self-start rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2.5 text-sm">Please check the details and approve.</p>
        <div className="rise flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm">
          <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-3">
            <div>
              <p className="font-medium">Mum</p>
              <p className="text-xs text-[var(--muted)]">GTBank ****4821</p>
            </div>
            <p className="amount font-semibold">₦5,000</p>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-3">
            <div>
              <p className="font-medium">Tunde</p>
              <p className="text-xs text-[var(--muted)]">MTN airtime</p>
            </div>
            <p className="amount font-semibold">₦500</p>
          </div>
          <p className="amount flex justify-between font-semibold">
            <span>Total</span>
            <span>₦5,500</span>
          </p>
          <div className="flex gap-2">
            <span className="flex-1 rounded-xl bg-[var(--accent)] py-2 text-center font-semibold text-[var(--accent-text)]">Approve</span>
            <span className="rounded-xl border border-[var(--line)] px-4 py-2 font-semibold">Reject</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Welcome({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-6 md:px-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">10kobo</span>
        </div>
        <button onClick={onSignIn} className="btn-secondary px-4 py-2 text-sm">
          Sign in
        </button>
      </header>

      <section className="grid flex-1 items-center gap-12 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="flex max-w-xl flex-col gap-6">
          <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Send money like <span className="text-[var(--accent)]">sending a text.</span>
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Just type what you want to pay. 10kobo gets it ready, you approve it, and it is done.
          </p>
          <button onClick={onSignIn} className="btn-primary w-full py-3.5 sm:w-auto sm:self-start sm:px-8">
            Get started with email
          </button>
        </div>
        <ChatPreview />
      </section>

      <section aria-label="What you can do" className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-[var(--line)] py-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, title, detail]) => (
          <div key={title} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Icon />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-sm text-[var(--muted)]">{detail}</p>
            </div>
          </div>
        ))}
      </section>
      {process.env.NEXT_PUBLIC_WALLET_CHAIN !== 'base' && <p className="pb-2 text-center text-xs text-[var(--muted)]">Test version. No real money.</p>}
    </main>
  );
}
