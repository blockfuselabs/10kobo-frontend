'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createApiClient, type Chat, type ChatMessage, type Me, type WalletSummary } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth';
import { useWallet } from '@/lib/wallet/wallet';
import { CancelScheduleCard, ContactConfirmCard, TxLink, PinContext, PlanApprovalCard, ScheduleApprovalCard, SetPinCard } from './cards';
import { InvoiceIcon, ActivityIcon, ArrowInIcon, ArrowOutIcon, CalendarIcon, ChatIcon, CheckIcon, CopyIcon, DotsIcon, HomeIcon, Logo, PencilIcon, PlusIcon, SendIcon, SignOutIcon, ThemeToggle, TrashIcon } from './icons';
import { ActivityPanel, DepositCard, InvoicesPanel, ReceivePanel, SchedulesPanel, Spinner } from './panels';
import { PayLinkCard, splitPayLink } from './pay-link-card';
import { SendPanel } from './send-panel';
import { Overview, type OverviewTarget } from './overview';
import { plainText, RichText } from './rich-text';

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
  ['home', 'Home', HomeIcon],
  ['chat', 'Ask 10kobo', ChatIcon],
  ['send', 'Send', ArrowOutIcon],
  ['schedules', 'Scheduled', CalendarIcon],
  ['invoices', 'Invoices', InvoiceIcon],
  ['activity', 'Activity', ActivityIcon],
  ['receive', 'Deposit', PlusIcon],
] as const;
/** On a computer the Deposit and Send money buttons above the menu open these, so the menu does not repeat them. */
const BUTTONS_ON_COMPUTER: ReadonlySet<string> = new Set(['send', 'receive']);
/** The phone's bottom bar keeps five. Activity and Scheduled open from the home screen there. */
const COMPUTER_ONLY: ReadonlySet<string> = new Set(['schedules', 'activity']);
type View = (typeof VIEWS)[number][0];

type ChatActions = { onOpen: (id: string | null) => void; onRename: (id: string, title: string) => Promise<void>; onDelete: (id: string) => Promise<void> };

/** A chat's three-dot menu. Fixed to the screen, so the scrolling list cannot cut it off. */
function ChatMenu({ chat, anchor, onClose, onStartRename, onDelete }: { chat: Chat; anchor: DOMRect; onClose: () => void; onStartRename: () => void; onDelete: (id: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [onClose]);
  const width = 232;
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 190);
  const item = 'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--surface-2)]';
  return (
    <div ref={box} role="menu" aria-label="Chat options" style={{ left, top, width }} className="rise fixed z-50 flex flex-col gap-0.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_18px_50px_rgb(0_0_0/0.22)]">
      {confirming ? (
        <div className="flex flex-col gap-2.5 p-2">
          <p className="text-sm font-semibold">Delete this chat?</p>
          <p className="text-xs leading-relaxed text-[var(--muted)]">Its messages will be gone. Your payments and scheduled payments will not change.</p>
          {failed && <p role="alert" className="text-xs text-red-600 dark:text-red-400">That did not work. Please try again.</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 cursor-pointer rounded-lg border border-[var(--line)] py-2 text-sm font-semibold">Cancel</button>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setFailed(false);
                onDelete(chat.id).then(onClose, () => {
                  setFailed(true);
                  setBusy(false);
                });
              }}
              className="flex-1 cursor-pointer rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button role="menuitem" onClick={onStartRename} className={item}><PencilIcon />Rename</button>
          <button role="menuitem" onClick={() => setConfirming(true)} className={`${item} text-red-600 dark:text-red-400`}><TrashIcon />Delete</button>
        </>
      )}
    </div>
  );
}

function ChatRow({ chat, active, actions }: { chat: Chat; active: boolean; actions: ChatActions }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(chat.title);
  const closeMenu = useCallback(() => setAnchor(null), []);
  const save = () => {
    setRenaming(false);
    const title = name.trim();
    if (title && title !== chat.title) void actions.onRename(chat.id, title).catch(() => setName(chat.title));
    else setName(chat.title);
  };
  if (renaming) {
    return (
      <li>
        <input
          autoFocus
          aria-label="Chat name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
            if (event.key === 'Escape') {
              setName(chat.title);
              setRenaming(false);
            }
          }}
          className="w-full rounded-xl border border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 text-sm"
        />
      </li>
    );
  }
  return (
    <li className={`group relative flex items-center rounded-xl transition-colors ${active ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}>
      <button
        onClick={() => actions.onOpen(chat.id)}
        aria-current={active ? 'true' : undefined}
        title={chat.title}
        className={`min-w-0 flex-1 cursor-pointer truncate rounded-xl py-2 pr-1 pl-3 text-left text-sm ${active ? 'font-medium' : 'text-[var(--muted)] group-hover:text-[var(--foreground)]'}`}
      >
        {chat.title}
      </button>
      <button
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget.getBoundingClientRect())}
        className={`mr-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg text-[var(--muted)] transition-opacity hover:text-[var(--foreground)] focus-visible:opacity-100 max-md:opacity-100 ${anchor || active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <DotsIcon />
      </button>
      {anchor && (
        <ChatMenu
          chat={chat}
          anchor={anchor}
          onClose={closeMenu}
          onStartRename={() => {
            setAnchor(null);
            setName(chat.title);
            setRenaming(true);
          }}
          onDelete={actions.onDelete}
        />
      )}
    </li>
  );
}

function ChatList({ chats, active, actions }: { chats: Chat[]; active: string | null; actions: ChatActions }) {
  return (
    <>
      <button onClick={() => actions.onOpen(null)} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]">
        <PencilIcon />
        New chat
      </button>
      {chats.length > 0 && <p className="px-3 pt-2 pb-0.5 text-xs font-medium text-[var(--muted)]">Recent chats</p>}
      <ul aria-label="Your chats" className="flex flex-col gap-0.5">
        {chats.map((chat) => (
          <ChatRow key={chat.id} chat={chat} active={chat.id === active} actions={actions} />
        ))}
      </ul>
    </>
  );
}

/** Copies one message. Always there on a phone, and on a computer it shows when the pointer is over the message. */
function CopyMessage({ text, mine }: { text: string; mine: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy this text'}
      title={copied ? 'Copied' : 'Copy'}
      className={`-mt-1 cursor-pointer rounded-lg p-1 text-[var(--muted)] transition-opacity hover:text-[var(--foreground)] focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${mine ? 'self-end' : 'self-start'}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

const SUMMARY_KEY = '10kobo-last-summary';
function savedSummary(userId: string): WalletSummary | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SUMMARY_KEY) ?? 'null') as { user?: string; summary?: WalletSummary } | null;
    return saved?.user === userId && saved.summary ? saved.summary : null;
  } catch {
    return null;
  }
}
function rememberSummary(userId: string, summary: WalletSummary) {
  try { window.localStorage.setItem(SUMMARY_KEY, JSON.stringify({ user: userId, summary })); } catch {}
}
function forgetSummary() {
  try { window.localStorage.removeItem(SUMMARY_KEY); } catch {}
}

export function Home() {
  const { getToken, signOut } = useAuth();
  const wallet = useWallet();
  const api = useMemo(() => createApiClient(API_URL, getToken), [getToken]);

  const [me, setMe] = useState<Me | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const messageBox = useRef<HTMLTextAreaElement>(null);
  // The box grows with what is typed, up to about eight lines, and then scrolls.
  useEffect(() => {
    const box = messageBox.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 220)}px`;
  }, [draft]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [view, setView] = useState<View>('home');
  const [sendWay, setSendWay] = useState<'bank' | 'phone'>('bank');
  // Set by New invoice on the home page, so the invoices page opens with the form showing.
  const [newInvoice, setNewInvoice] = useState(false);
  useEffect(() => { if (view !== 'invoices') setNewInvoice(false); }, [view]);
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

  // The last balance this browser saw for this person shows at once, then the fresh one replaces it.
  // It is per person and removed on sign out; the server is still the only source of truth.
  useEffect(() => {
    if (me?.id) setSummary((current) => current ?? savedSummary(me.id));
  }, [me?.id]);
  useEffect(() => {
    if (me?.id && summary) rememberSummary(me.id, summary);
  }, [me?.id, summary]);

  const refreshSummary = useCallback(() => api.wallet().then(value => { setSummary(value); setBalanceError(null); }, () => setBalanceError('We could not load your balance. Please try again.')), [api]);

  // Null means a new chat, which only exists once its first message is sent.
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatsOpen, setChatsOpen] = useState(false);
  const activeChatRef = useRef<string | null>(null);
  // Opens on a new chat. Past ones wait in the list.
  const startedNew = useRef(true);

  const loadMessages = useCallback(async () => {
    const id = activeChatRef.current;
    if (!id) return setMessages([]);
    const latest = await api.messages(id);
    // Only replace the list when it changed, so the view does not jump while someone reads.
    if (activeChatRef.current === id && !sendingNow.current) setMessages((current) => (JSON.stringify(current) === JSON.stringify(latest) ? current : latest));
  }, [api]);

  const loadChats = useCallback(async () => {
    const list = await api.conversations();
    setChats(list);
    // Opens on the latest chat, unless someone has just asked for a new one.
    if (!activeChatRef.current && !startedNew.current && list[0]) {
      activeChatRef.current = list[0].id;
      setActiveChat(list[0].id);
      await loadMessages();
    }
  }, [api, loadMessages]);

  const openChat = (id: string | null) => {
    activeChatRef.current = id;
    startedNew.current = id === null;
    setActiveChat(id);
    setMessages([]);
    setError(null);
    setView('chat');
    setChatsOpen(false);
    void loadMessages().catch((failure: Error) => setError(failure.message));
  };

  const chatActions: ChatActions = {
    onOpen: openChat,
    onRename: async (id, title) => {
      await api.renameChat(id, title);
      await loadChats();
    },
    onDelete: async (id) => {
      await api.deleteChat(id);
      if (activeChatRef.current === id) {
        // Moves to the next chat, or to a new one if this was the last.
        activeChatRef.current = null;
        startedNew.current = false;
        setActiveChat(null);
        setMessages([]);
      }
      await loadChats();
    },
  };

  useEffect(() => {
    void loadChats().catch((failure: Error) => setError(failure.message));
    void refreshSummary();
    const timer = setInterval(() => {
      void refreshSummary();
      // Not while sending: the saved copy of the message would appear beside the one already on screen.
      if (sendingNow.current) return;
      void loadChats().catch(() => undefined);
      void loadMessages().catch(() => undefined);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadChats, loadMessages, refreshSummary]);

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
      sendingNow.current = false;
      await loadMessages();
      await loadChats();
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
        setView('chat');
        setWaitingOn(content);
        try {
          const { conversation_id: id } = await api.send(content, activeChatRef.current);
          activeChatRef.current = id;
          startedNew.current = false;
          setActiveChat(id);
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
    return loadMessages();
  };

  const address = me?.wallet_address ?? wallet.address;
  // A new chat with nothing in it yet: the box sits in the middle until the first message.
  const fresh = activeChat === null && messages.length === 0 && !waitingOn && !sending;
  const errorLine = error && <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>;
  const composer = (
    <form
                  onSubmit={send}
                  autoComplete="off"
                  className="flex w-full items-end gap-2 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-2.5 pl-6 shadow-[var(--shadow)] transition-colors focus-within:border-[var(--muted)]"
                >
                  <textarea
                    ref={messageBox}
                    rows={1}
                    id="message"
                    aria-label="Message"
                    // Chrome would otherwise offer old messages, including account numbers, as suggestions.
                    name="chat-message-no-history"
                    autoComplete="off"
                    autoCorrect="off"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      // Enter sends and Shift+Enter starts a new line. On a phone, Enter stays a new line and the button sends.
                      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || window.matchMedia('(pointer: coarse)').matches) return;
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }}
                    maxLength={2000}
                    placeholder="Tell me what to pay"
                    className="min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none md:text-[17px] placeholder:text-[var(--muted)]"
                  />
                  <button
                    aria-label={sending ? 'Sending…' : 'Send'}
                    disabled={sending || !draft.trim()}
                    className="neutral-primary grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-text)] border-t-transparent" /> : <SendIcon />}
                  </button>
                </form>
  );

  return (
    <PinContext.Provider value={Boolean(me?.has_pin)}>
    <main className="workspace-shell fixed inset-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] md:grid-cols-[17.5rem_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--sidebar)] px-4 py-3 md:col-start-1 md:row-start-1 md:gap-6 md:border-r md:border-b-0 md:px-4 md:pt-6 md:pb-3">
        <div className="flex items-center justify-between gap-3 md:px-1">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold tracking-tight">10kobo</span>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
          <button onClick={() => { forgetSummary(); void signOut(); }} aria-label="Sign out" className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            <SignOutIcon />
          </button>
          </div>
        </div>
        {view !== 'home' && <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)] p-3.5 md:p-4">
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
          {summary?.naira_per_usdc && (
            <p className="amount hidden justify-between gap-2 border-t border-[var(--line)] pt-2.5 text-xs md:flex" data-testid="rate">
              <span className="text-[var(--muted)]">Today&apos;s rate</span>
              <span className="font-medium">₦{summary.naira_per_usdc.toLocaleString('en-NG', { maximumFractionDigits: 2 })} per $1</span>
            </p>
          )}
        </div>}
        {view !== 'home' && (
          <div className="hidden grid-cols-2 gap-2 md:grid">
            <button type="button" onClick={() => setView('receive')} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]">
              Deposit
            </button>
            <button type="button" aria-label="Send money" onClick={() => { setSendWay('bank'); setView('send'); }} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]">
              Send
            </button>
          </div>
        )}
        {summary?.latest && view !== 'home' && (
          <button onClick={() => setView('activity')} data-testid="latest" title="See all activity" className="hidden min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-1 text-left text-xs md:flex">
            <span className="min-w-0 truncate text-[var(--muted)]">{summary.latest.description}</span>
            <span className="amount shrink-0 font-semibold">
              {summary.latest.direction === 'in' ? '+' : '−'}
              {summary.latest.amount_naira ?? summary.latest.amount_usdc} ›
            </span>
          </button>
        )}
      </header>

      <div className="row-start-3 flex min-h-0 flex-col gap-3 border-t border-[var(--line)] bg-[var(--sidebar)] px-2 py-1.5 md:col-start-1 md:row-start-2 md:overflow-y-auto md:border-t-0 md:border-r md:px-4 md:py-1">
      <nav
          aria-label="Sections"
          className="grid grid-cols-5 gap-1 md:flex md:flex-col md:gap-0.5"
        >
          {VIEWS.map(([key, label, ViewIcon]) => (
            <button
              key={key}
              onClick={() => { if (key === 'send') setSendWay('bank'); setView(key); }}
              aria-current={view === key ? 'page' : undefined}
              // On the phone the Send tab must not be mistaken for the message box's Send button.
              aria-label={key === 'send' ? 'Send money' : key === 'chat' ? 'Ask 10kobo' : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[12px] font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${BUTTONS_ON_COMPUTER.has(key) ? 'md:hidden' : ''} ${COMPUTER_ONLY.has(key) ? 'max-md:hidden' : ''} ${
                view === key ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]'
              }`}
            >
              <ViewIcon />
              {key === 'chat' ? (
                <>
                  <span className="md:hidden">Ask</span>
                  <span className="max-md:hidden">{label}</span>
                </>
              ) : (
                label
              )}
            </button>
          ))}
        </nav>
        {view === 'chat' && (<div className="hidden min-h-0 flex-col gap-1 border-t border-[var(--line)] pt-3 md:flex">
          <ChatList chats={chats} active={activeChat} actions={chatActions} />
        </div>)}
      </div>

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
          <ThemeToggle />
          <button onClick={() => { forgetSummary(); void signOut(); }} aria-label="Sign out" title="Sign out" className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">
            <SignOutIcon />
          </button>
        </div>
      </footer>

      <div className="row-start-2 flex min-h-0 flex-col md:col-start-2 md:row-span-3 md:row-start-1">
        {view === 'home' && (
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">
              <Overview
                api={api}
                me={me}
                summary={summary}
                balanceError={balanceError}
                onRefreshBalance={() => void refreshSummary()}
                address={address}
                extra={me?.pin_required && !me.has_pin ? <SetPinCard api={api} onChange={() => api.me().then(setMe)} /> : undefined}
                onSuggest={(text) => {
                  openChat(null);
                  setDraft(text);
                }}
                onGo={(target: OverviewTarget) => {
                  if (target === 'airtime' || target === 'send') {
                    setSendWay(target === 'airtime' ? 'phone' : 'bank');
                    setView('send');
                  } else if (target === 'new-invoice') {
                    setNewInvoice(true);
                    setView('invoices');
                  } else setView(target);
                }}
              />
            </div>
          </section>
        )}

        {view !== 'chat' && view !== 'home' && (
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="workspace-panel mx-auto w-full max-w-2xl px-4 py-5 md:px-8 md:py-8">
              {view === 'schedules' && <SchedulesPanel api={api} />}
              {view === 'invoices' && <InvoicesPanel key={String(newInvoice)} api={api} startCreating={newInvoice} />}
              {view === 'activity' && <ActivityPanel api={api} />}
              {view === 'receive' && <ReceivePanel summary={summary} api={api} onChanged={refreshSummary} />}
              {view === 'send' && <SendPanel key={sendWay} initialWay={sendWay} summary={summary} api={api} onChanged={refreshSummary} onAddMoney={() => setView('receive')} />}
            </div>
          </section>
        )}

        {view === 'chat' && (
          <>
            <div className="relative flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2 md:hidden">
              <button onClick={() => setChatsOpen((open) => !open)} aria-expanded={chatsOpen} className="min-w-0 truncate text-sm font-semibold">
                {chats.find((chat) => chat.id === activeChat)?.title ?? 'New chat'} ▾
              </button>
              <button onClick={() => openChat(null)} className="shrink-0 rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold">+ New</button>
              {chatsOpen && (
                <div className="absolute inset-x-2 top-full z-20 mt-1 flex max-h-[60dvh] flex-col gap-1 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
                  <ChatList chats={chats} active={activeChat} actions={chatActions} />
                </div>
              )}
            </div>
            {fresh && (
              <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-6 md:px-8">
                {me?.pin_required && !me.has_pin && <SetPinCard api={api} onChange={() => api.me().then(setMe)} />}
                <div className="flex flex-col gap-1.5 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">What would you like to do?</h1>
                  <p className="text-sm text-[var(--muted)]">Type it the way you would say it.{process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? '' : ' Test version, so no real money moves.'}</p>
                </div>
                <div className="flex w-full max-w-3xl flex-col gap-3">
                  {errorLine}
                  {composer}
                </div>
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map(([label, text]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setDraft(text);
                        document.getElementById('message')?.focus();
                      }}
                      className="cursor-pointer rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-sm transition-colors hover:bg-[var(--surface-2)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!fresh && <section ref={conversation} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-3 px-4 py-5 md:px-8 md:py-8">
                {me?.pin_required && !me.has_pin && <SetPinCard api={api} onChange={() => api.me().then(setMe)} />}
                {messages.map((message) => (
                  <div key={message.id} className="group rise flex flex-col gap-2">
                    <div
                      data-notice={message.notice ? 'true' : undefined}
                      className={
                        message.notice
                          ? 'max-w-[90%] self-center whitespace-pre-wrap [overflow-wrap:anywhere] rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-center text-xs text-[var(--muted)]'
                          : message.role === 'user'
                            ? 'max-w-[80%] self-end whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-text)] selection:bg-[var(--accent-text)] selection:text-[var(--accent)]'
                            : 'max-w-[85%] self-start whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2.5'
                      }
                    >
                      {message.role === 'assistant' && !message.notice ? <RichText text={splitPayLink(message.content).text} /> : message.content}
                      {message.notice && message.tx_hash && (
                        <>
                          {' '}
                          <TxLink hash={message.tx_hash} />
                        </>
                      )}
                    </div>
                    {!message.notice && <CopyMessage text={plainText(message.content)} mine={message.role === 'user'} />}
                    {message.role === 'assistant' && (() => {
                      const link = splitPayLink(message.content);
                      return link.id && link.url ? <PayLinkCard id={link.id} url={link.url} /> : null;
                    })()}
                    {message.plan && <PlanApprovalCard plan={message.plan} api={api} onChange={reload} />}
                    {message.schedule_group && <ScheduleApprovalCard group={message.schedule_group} api={api} onChange={reload} />}
                    {message.cancel_schedule && <CancelScheduleCard schedule={message.cancel_schedule} api={api} onChange={reload} />}
                    {message.deposit && <DepositCard deposit={message.deposit} api={api} onChanged={refreshSummary} />}
                    {message.contact && (
                      <ContactConfirmCard
                        contact={message.contact}
                        api={api}
                        onChange={reload}
                        onConfirmed={(contactId) => respond(() => api.contactConfirmed(contactId, activeChatRef.current))}
                      />
                    )}
                  </div>
                ))}
                {waitingOn && (
                  <p className="max-w-[80%] self-end whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-text)]">{waitingOn}</p>
                )}
                {sending && (
                  <p className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-3.5" aria-label="Thinking">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </p>
                )}
              </div>
            </section>}

            {!fresh && (
              <div className="mx-auto w-full max-w-3xl px-4 pb-3 md:px-8 md:pb-6">
                {errorLine}
                {composer}
              </div>
            )}
          </>
        )}
      </div>
    </main>
    </PinContext.Provider>
  );
}
