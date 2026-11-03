'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createApiClient, type ChatMessage, type Me, type WalletSummary } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth';
import { useWallet } from '@/lib/wallet/wallet';
import { CancelScheduleCard, ContactConfirmCard, PinContext, PlanApprovalCard, ScheduleApprovalCard, SetPinCard } from './cards';
import { ActivityPanel, ReceivePanel, SchedulesPanel } from './panels';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010';
const WALLET_POLL_MS = 3000;
// New messages can arrive with no action from the user: deposits, reminders and scheduled payments.
const REFRESH_MS = 10000;
const VIEWS = [
  ['chat', 'Chat'],
  ['schedules', 'Scheduled'],
  ['activity', 'Activity'],
  ['receive', 'Add USDC'],
] as const;
type View = (typeof VIEWS)[number][0];

export function Home() {
  const { getToken, signOut } = useAuth();
  const wallet = useWallet();
  const api = useMemo(() => createApiClient(API_URL, getToken), [getToken]);

  const [me, setMe] = useState<Me | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [view, setView] = useState<View>('chat');
  // Shown straight away, until the saved copy comes back with the reply.
  const [waitingOn, setWaitingOn] = useState<string | null>(null);
  const conversation = useRef<HTMLElement>(null);

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
      // Only replace the list when it changed, so the view does not jump while someone reads.
      api.messages().then(
        (latest) => setMessages((current) => (JSON.stringify(current) === JSON.stringify(latest) ? current : latest)),
        () => undefined,
      );
      void refreshSummary();
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
    setError(null);
    try {
      await request();
      setMessages(await api.messages());
      void refreshSummary();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
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
    <main className="fixed inset-x-0 top-0 mx-auto flex h-dvh max-w-2xl flex-col px-4">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{me?.email ?? '…'}</p>
          <p className="truncate font-mono text-xs text-[var(--muted)]" data-testid="wallet">
            {address ?? 'Creating your wallet…'}
          </p>
          <p className="truncate text-sm" data-testid="balance">
            {summary?.balance_usdc ? `${summary.balance_usdc} (about ${summary.balance_naira})` : address ? 'Balance unavailable' : ''}
            {summary ? ` · ${summary.limit_left} left today` : ''}
          </p>
        </div>
        <button onClick={() => void signOut()} className="shrink-0 text-sm text-[var(--muted)] underline">
          Sign out
        </button>
      </header>

      <nav className="flex gap-1 border-b border-[var(--line)] py-2 text-sm" aria-label="Sections">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-current={view === key ? 'page' : undefined}
            className={view === key ? 'rounded-lg bg-[var(--surface)] px-3 py-1 font-medium' : 'rounded-lg px-3 py-1 text-[var(--muted)]'}
          >
            {label}
          </button>
        ))}
      </nav>

      {view !== 'chat' && (
        <section className="min-h-0 flex-1 overflow-y-auto">
          {view === 'schedules' && <SchedulesPanel api={api} />}
          {view === 'activity' && <ActivityPanel api={api} />}
          {view === 'receive' && <ReceivePanel summary={summary} />}
        </section>
      )}

      {view === 'chat' && (
      <>
      <section ref={conversation} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-4" aria-live="polite">
        {me?.pin_required && !me.has_pin && <SetPinCard api={api} onChange={() => api.me().then(setMe)} />}
        {messages.length === 0 && (
          <p className="m-auto text-sm text-[var(--muted)]">Try: send N50 airtime to Kc in 30 minutes. Test version, so no real money moves.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            <p
              className={
                message.role === 'user'
                  ? 'max-w-[85%] self-end whitespace-pre-wrap rounded-2xl bg-[var(--accent)] px-4 py-2 text-[var(--accent-text)]'
                  : 'max-w-[85%] self-start whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2'
              }
            >
              {message.content}
            </p>
            {message.plan && <PlanApprovalCard plan={message.plan} api={api} onChange={reload} />}
            {message.schedule_group && <ScheduleApprovalCard group={message.schedule_group} api={api} onChange={reload} />}
            {message.cancel_schedule && <CancelScheduleCard schedule={message.cancel_schedule} api={api} onChange={reload} />}
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
          <p className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl bg-[var(--accent)] px-4 py-2 text-[var(--accent-text)]">{waitingOn}</p>
        )}
        {sending && <p className="self-start text-sm text-[var(--muted)]">Thinking…</p>}
      </section>

      {error && <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form onSubmit={send} className="flex gap-2 pb-4">
        <input
          id="message"
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder="Tell me what to pay"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        />
        <button
          disabled={sending || !draft.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)] disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
      </>
      )}
    </main>
    </PinContext.Provider>
  );
}
