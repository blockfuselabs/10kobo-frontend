'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { DepositNetwork } from '@/lib/api/client';

/** Most used for stablecoins in Nigeria first, then the rest in the order given. */
const POPULAR = ['tron', 'bsc', 'solana', 'ethereum'];

/** A round mark with the network's first letters, so the list can be scanned by eye without loading logos. */
function Mark({ name }: { name: string }) {
  const letters = name.replace(/[^A-Za-z]/g, '').slice(0, 2);
  return (
    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-xs font-semibold uppercase tracking-tight">
      {letters}
    </span>
  );
}

function Tokens({ tokens }: { tokens: string[] }) {
  return (
    <span className="flex gap-1">
      {tokens.map((token) => (
        <span key={token} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[12px] font-medium text-[var(--muted)]">{token}</span>
      ))}
    </span>
  );
}

/** A list to choose the network a deposit comes from, with search and full keyboard use. */
export function NetworkPicker({
  networks,
  value,
  onChange,
  label,
  placeholder = 'Choose a network',
  searchLabel = 'Search networks',
  empty = (query: string) => `No network called “${query}”. Stellar deposits are not possible yet.`,
  allowTyped = false,
  loading = false,
}: {
  networks: DepositNetwork[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  placeholder?: string;
  searchLabel?: string;
  /** What to say when the search finds nothing. */
  empty?: (query: string) => string;
  /** Offers what was typed as a choice of its own, for a bank that is not in the list. */
  allowTyped?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // Opens towards the side with more room, and no taller than that room, so the list never hides off-screen.
  const [place, setPlace] = useState<{ up: boolean; height: number }>({ up: false, height: 288 });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  const ordered = useMemo(
    () => [...networks].sort((a, b) => (POPULAR.indexOf(a.id) + 1 || 99) - (POPULAR.indexOf(b.id) + 1 || 99)),
    [networks],
  );
  const shown = ordered.filter((item) => `${item.name} ${item.tokens.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = networks.find((item) => item.id === value) ?? (allowTyped && value ? { id: value, name: value, tokens: [], family: '' } : null);
  const typed = allowTyped && query.trim().length > 1 && shown.length === 0 ? query.trim() : null;

  const toggle = () => {
    if (!open && button.current) {
      const box = button.current.getBoundingClientRect();
      const below = window.innerHeight - box.bottom - 16;
      const above = box.top - 16;
      const up = below < 300 && above > below;
      // Room for the search box and margins comes off the list's own height.
      setPlace({ up, height: Math.max(160, Math.min(288, (up ? above : below) - 76)) });
    }
    setOpen(!open);
    setActive(0);
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus({ preventScroll: true });
    // On a very short screen it may still not fit, so bring it fully into view.
    panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const away = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const keys = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((at) => Math.min(at + 1, shown.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((at) => Math.max(at - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (shown[active]) choose(shown[active].id);
      else if (typed) choose(typed);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative flex flex-col gap-1 text-sm">
      <span id={labelId}>{label}</span>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={toggle}
        onKeyDown={(event) => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); toggle(); } }}
        className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-[var(--surface)] px-3.5 py-2 text-left transition-colors hover:border-[var(--foreground)] ${open ? 'border-[var(--foreground)]' : 'border-[var(--line)]'}`}
        data-testid="network-picker"
      >
        {chosen ? (
          <>
            <Mark name={chosen.name} />
            <span className="flex-1 font-medium">{chosen.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[var(--muted)]">{placeholder}</span>
        )}
        <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div ref={panel} className={`absolute right-0 left-0 z-30 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl ${place.up ? 'bottom-full mb-2' : 'top-full mt-2'}`} onKeyDown={keys} data-opens={place.up ? 'up' : 'down'}>
          <div className="border-b border-[var(--line)] p-2">
            <input
              ref={search}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              placeholder={searchLabel}
              aria-label={searchLabel}
              aria-controls={listId}
              className="w-full rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <ul id={listId} role="listbox" aria-labelledby={labelId} className="overflow-y-auto p-1.5" style={{ maxHeight: place.height }}>
            {shown.map((item, index) => (
              <li
                key={item.id}
                role="option"
                aria-selected={item.id === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(item.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${index === active ? 'bg-[var(--surface-2)]' : ''}`}
              >
                <Mark name={item.name} />
                <span className="flex-1 font-medium">{item.name}</span>
                <Tokens tokens={item.tokens} />
                <span aria-hidden className={`w-4 text-center ${item.id === value ? '' : 'invisible'}`}>✓</span>
              </li>
            ))}
            {typed && (
              <li role="option" aria-selected={false} onClick={() => choose(typed)} className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${shown.length === 0 ? 'bg-[var(--surface-2)]' : ''}`}>
                <Mark name={typed} />
                <span className="flex-1 font-medium">Use “{typed}”</span>
              </li>
            )}
            {shown.length === 0 && !typed && (
              <li className="px-2.5 py-3 text-[var(--muted)]">{loading ? 'Loading…' : networks.length === 0 ? 'Could not load the list. Please reload the page.' : empty(query)}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
