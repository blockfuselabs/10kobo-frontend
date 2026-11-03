'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createApiClient, type ChatMessage, type Me, type WalletSummary } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth';
import { useWallet } from '@/lib/wallet/wallet';
import { CancelScheduleCard, ContactConfirmCard, TxLink, PinContext, PlanApprovalCard, ScheduleApprovalCard, SetPinCard } from './cards';
import { ActivityIcon, CalendarIcon, ChatIcon, CheckIcon, CopyIcon, Logo, PlusIcon, SendIcon, SignOutIcon } from './icons';
import { ActivityPanel, DepositCard, ReceivePanel, SchedulesPanel, Spinner } from './panels';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010';
const WALLET_POLL_MS = 3000;
// New messages can arrive with no action from the user: deposits, reminders and scheduled payments.
const REFRESH_MS = 10000;
const wholeNaira = (amount: string) => amount.replace(/\.\d+$/, '');

/** How much of today's limit is left. The two figures are formatted naira, such as ₦1,250.50. */
function limitLeftPercent(summary: WalletSummary): number {
  const value = (amount: string) => Number(amount.replace(/[^\d.]/g, ''));
  const left = value(summary.limit_left);
  const total = left + value(summary.limit_used);
  return total > 0 ? Math.round((left / total) * 100) : 0;
}

const SUGGESTIONS = [
  ['Deposit ₦5,000', 'Deposit 5000'],
  ['Buy ₦500 airtime', 'Buy N500 airtime for '],
  ['Pay ₦2,000 to a bank', 'Pay 2000 to '],
  ['Set a monthly payment', 'Every month pay 5000 to '],
  ['What is my balance?', 'What is my balance?'],
] as const;
const VIEWS = [
  ['chat', 'Chat', ChatIcon],
  ['schedules', 'Scheduled', CalendarIcon],
  ['activity', 'Activity', ActivityIcon],
  ['receive', 'Add USDC', PlusIcon],
] as const;
type View = (typeof VIEWS)[number][0];

export function Home() {
  const { getToken, signOut } = useAuth();
  const wallet = useWallet();
  const api = useMemo(() => createApiClient(API_URL, getToken), [getToken]);

  const [me, setMe] = useState<Me | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [view, setView] = useState<View>('chat');
  // Shown straight away, until the saved copy comes back with the reply.
  const [waitingOn, setWaitingOn] = useState<string | null>(null);
  const conversation = useRef<HTMLElement>(null);
  const sendingNow = useRef(false);

  // The backend learns the wallet from the provider, which can take a moment after sign-up.
  const walletKnown = Boolean(me?.wallet_address);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.me().then(
        (user) => !cancelled && (setMe(user), setError(null)),
        (failure: Error) => !cancelled && setError(failure.message),
      );
    void load();
    if (walletKnown) return () => void (cancelled = true);
    const timer = setInterval(load, WALLET_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api, walletKnown]);

  const refreshSummary = useCallback(() => api.wallet().then(setSummary, () => undefined), [api]);

  useEffect(() => {
    api.messages().then(setMessages, (failure: Error) => setError(failure.message));
    void refreshSummary();
    const timer = setInterval(() => {
      void refreshSummary();
      // Not while sending: the saved copy of the message would appear beside the one already on screen.
      if (sendingNow.current) return;
      // Only replace the list when it changed, so the view does not jump while someone reads.
      api.messages().then(
        (latest) => {
          if (!sendingNow.current) setMessages((current) => (JSON.stringify(current) === JSON.stringify(latest) ? current : latest));
        },
        () => undefined,
      );
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [api, refreshSummary]);

  useEffect(() => {
    // Scroll only the conversation: scrolling the page could push the message box out of view.
    const box = conversation.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, view, waitingOn]);

  async function respond(request: () => Promise<unknown>) {
    setSending(true);
    sendingNow.current = true;
    setError(null);
    try {
      await request();
      setMessages(await api.messages());
      void refreshSummary();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      sendingNow.current = false;
      setSending(false);
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (content && !sending)
      void respond(async () => {
        // Cleared at once, so anything typed while this sends is kept. Restored if sending fails.
        setDraft('');
        setWaitingOn(content);
        try {
          await api.send(content);
        } catch (failure) {
          setDraft((current) => current || content);
          throw failure;
        } finally {
          setWaitingOn(null);
        }
      });
  }

  const reload = () => {
    void refreshSummary();
    return api.messages().then(setMessages);
  };

  const address = me?.wallet_address ?? wallet.address;

  return (
    <PinContext.Provider value={Boolean(me?.has_pin)}>
    <main className="fixed inset-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] md:grid-cols-[17.5rem_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--sidebar)] px-4 py-3 md:col-start-1 md:row-start-1 md:gap-6 md:border-r md:border-b-0 md:px-4 md:pt-6 md:pb-3">
        <div className="flex items-center justify-between gap-3 md:px-1">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold tracking-tight">10kobo</span>
          </div>
          <button onClick={() => void signOut()} aria-label="Sign out" className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] md:hidden">
            <SignOutIcon />
          </button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)] p-3.5 md:p-4">
          <div className="flex flex-col gap-0.5">
            <p className="hidden text-xs font-medium text-[var(--muted)] md:block">Your balance</p>
            <p data-testid="balance" className="amount flex flex-wrap items-baseline gap-x-2 md:flex-col md:gap-0.5">
              {summary?.balance_usdc ? (
                <>
                  <span className="text-xl font-semibold leading-tight tracking-tight md:text-[1.75rem]">{summary.balance_usdc}</span>
                  {summary.balance_naira && <span className="text-sm text-[var(--muted)]">≈ {summary.balance_naira}</span>}
                </>
              ) : (
                <span className="text-sm text-[var(--muted)]">{address ? 'Balance unavailable' : 'Setting up your wallet…'}</span>
              )}
            </p>
          </div>
          {summary?.deposit_on_the_way && (
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)]" data-testid="deposit-on-the-way">
              <Spinner /> {summary.deposit_on_the_way} on its way
            </p>
          )}
          {summary && (
            <div className="hidden flex-col gap-1.5 md:flex">
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-[var(--muted)]">Left to send today</span>
                <span className="amount font-medium">{wholeNaira(summary.limit_left)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${limitLeftPercent(summary)}%` }} />
              </div>
            </div>
          )}
        </div>
      </header>

      <nav
        aria-label="Sections"
        className="row-start-3 grid grid-cols-4 gap-1 border-t border-[var(--line)] bg-[var(--sidebar)] px-2 py-1.5 md:col-start-1 md:row-start-2 md:flex md:min-h-0 md:flex-col md:gap-0.5 md:overflow-y-auto md:border-t-0 md:border-r md:px-4 md:py-1"
      >
        {VIEWS.map(([key, label, ViewIcon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-current={view === key ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
              view === key ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]'
            }`}
          >
            <ViewIcon />
            {label}
          </button>
        ))}
      </nav>

      <footer className="hidden flex-col gap-1 border-t border-r border-[var(--line)] bg-[var(--sidebar)] px-4 py-3 md:col-start-1 md:row-start-3 md:flex">
        <div className="flex items-center gap-2 px-1 py-1" title={address ?? undefined}>
          <span className="flex-1 text-xs text-[var(--muted)]">Wallet</span>
          <span className="font-mono text-xs" data-testid="wallet">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Creating your wallet…'}</span>
          {address && (
            <button
              aria-label="Copy wallet address"
              title="Copy wallet address"
              className="rounded p-0.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              onClick={() => void navigator.clipboard?.writeText(address).then(() => {
                setCopiedWallet(true);
                setTimeout(() => setCopiedWallet(false), 1500);
              })}
            >
              {copiedWallet ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-xs font-semibold uppercase">
            {(me?.email ?? '?').slice(0, 1)}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm" title={me?.email ?? undefined}>{me?.email ?? '…'}</p>
          <button onClick={() => void signOut()} aria-label="Sign out" title="Sign out" className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">
            <SignOutIcon />
          </button>
        </div>
      </footer>

      <div className="row-start-2 flex min-h-0 flex-col md:col-start-2 md:row-span-3 md:row-start-1">
        {view !== 'chat' && (
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-4 py-5 md:px-8 md:py-8">
              {view === 'schedules' && <SchedulesPanel api={api} />}
              {view === 'activity' && <ActivityPanel api={api} />}
              {view === 'receive' && <ReceivePanel summary={summary} api={api} onChanged={refreshSummary} />}
            </div>
          </section>
        )}

        {view === 'chat' && (
          <>
            <section ref={conversation} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
              <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-3 px-4 py-5 md:px-8 md:py-8">
                {me?.pin_required && !me.has_pin && <SetPinCard api={api} onChange={() => api.me().then(setMe)} />}
                {messages.length === 0 && (
                  <div className="m-auto flex flex-col items-center gap-5 py-6 text-center">
                    <div className="flex flex-col gap-1.5">
                      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">What would you like to do?</h1>
                      <p className="text-sm text-[var(--muted)]">
                        Type it the way you would say it.{process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? ' This uses real money.' : ' Test version, so no real money moves.'}
                      </p>
                    </div>
                    <div className="flex max-w-md flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map(([label, text]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setDraft(text);
                            document.getElementById('message')?.focus();
                          }}
                          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-sm transition-colors hover:border-[var(--accent)]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className="rise flex flex-col gap-2">
                    <p
                      data-notice={message.notice ? 'true' : undefined}
                      className={
                        message.notice
                          ? 'max-w-[90%] self-center whitespace-pre-wrap rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-center text-xs text-[var(--muted)]'
                          : message.role === 'user'
                            ? 'max-w-[80%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-text)]'
                            : 'max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2.5'
                      }
                    >
                      {message.content}
                      {message.notice && message.tx_hash && (
                        <>
                          {' '}
                          <TxLink hash={message.tx_hash} />
                        </>
                      )}
                    </p>
                    {message.plan && <PlanApprovalCard plan={message.plan} api={api} onChange={reload} />}
                    {message.schedule_group && <ScheduleApprovalCard group={message.schedule_group} api={api} onChange={reload} />}
                    {message.cancel_schedule && <CancelScheduleCard schedule={message.cancel_schedule} api={api} onChange={reload} />}
                    {message.deposit && <DepositCard deposit={message.deposit} api={api} onChanged={refreshSummary} />}
                    {message.contact && (
                      <ContactConfirmCard
                        contact={message.contact}
                        api={api}
                        onChange={reload}
                        onConfirmed={(contactId) => respond(() => api.contactConfirmed(contactId))}
                      />
                    )}
                  </div>
                ))}
                {waitingOn && (
                  <p className="max-w-[80%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-text)]">{waitingOn}</p>
                )}
                {sending && (
                  <p className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-3.5" aria-label="Thinking">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </p>
                )}
              </div>
            </section>

            <div className="mx-auto w-full max-w-2xl px-4 pb-3 md:px-8 md:pb-6">
              {error && <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <form
                onSubmit={send}
                autoComplete="off"
                className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 pl-4 shadow-[var(--shadow)] transition-colors focus-within:border-[var(--accent)]"
              >
                <input
                  id="message"
                  aria-label="Message"
                  // Chrome would otherwise offer old messages, including account numbers, as suggestions.
                  name="chat-message-no-history"
                  autoComplete="off"
                  autoCorrect="off"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  placeholder="Tell me what to pay"
                  className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-[var(--muted)] focus-visible:outline-none"
                />
                <button
                  aria-label={sending ? 'Sending…' : 'Send'}
                  disabled={sending || !draft.trim()}
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? <Spinner /> : <SendIcon />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
    </PinContext.Provider>
  );
}
