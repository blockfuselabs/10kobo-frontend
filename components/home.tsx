'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createApiClient, type ChatMessage, type Me } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth';
import { useWallet } from '@/lib/wallet/wallet';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010';
const WALLET_POLL_MS = 3000;

export function Home() {
  const { getToken, signOut } = useAuth();
  const wallet = useWallet();
  const api = useMemo(() => createApiClient(API_URL, getToken), [getToken]);

  const [me, setMe] = useState<Me | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    api.messages().then(setMessages, (failure: Error) => setError(failure.message));
  }, [api]);

  useEffect(() => {
    end.current?.scrollIntoView();
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.send(content);
      setDraft('');
      setMessages(await api.messages());
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSending(false);
    }
  }

  const address = me?.wallet_address ?? wallet.address;

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col px-4">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{me?.email ?? '…'}</p>
          <p className="truncate font-mono text-xs text-[var(--muted)]" data-testid="wallet">
            {address ?? 'Creating your wallet…'}
          </p>
        </div>
        <button onClick={() => void signOut()} className="shrink-0 text-sm text-[var(--muted)] underline">
          Sign out
        </button>
      </header>

      <section className="flex flex-1 flex-col gap-2 overflow-y-auto py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="m-auto text-sm text-[var(--muted)]">No messages yet. The assistant is not connected yet.</p>
        )}
        {messages.map((message) => (
          <p
            key={message.id}
            className={
              message.role === 'user'
                ? 'max-w-[85%] self-end rounded-2xl bg-[var(--accent)] px-4 py-2 text-[var(--accent-text)]'
                : 'max-w-[85%] self-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2'
            }
          >
            {message.content}
          </p>
        ))}
        <div ref={end} />
      </section>

      {error && <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form onSubmit={send} className="flex gap-2 pb-4">
        <input
          id="message"
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder="Type a message"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        />
        <button
          disabled={sending || !draft.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-text)] disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </main>
  );
}
