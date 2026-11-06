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
        <span key={token} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">{token}</span>
      ))}
    </span>
  );
}

/** A list to choose the network a deposit comes from, with search and full keyboard use. */
export function NetworkPicker({ networks, value, onChange, label }: { networks: DepositNetwork[]; value: string; onChange: (id: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  const ordered = useMemo(
    () => [...networks].sort((a, b) => (POPULAR.indexOf(a.id) + 1 || 99) - (POPULAR.indexOf(b.id) + 1 || 99)),
    [networks],
  );
  const shown = ordered.filter((item) => `${item.name} ${item.tokens.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = networks.find((item) => item.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
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
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative flex flex-col gap-1 text-sm">
      <span id={labelId}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => { setOpen(!open); setActive(0); }}
        onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}
        className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-[var(--surface)] px-3.5 py-2 text-left transition-colors hover:border-[var(--foreground)] ${open ? 'border-[var(--foreground)]' : 'border-[var(--line)]'}`}
        data-testid="network-picker"
      >
        {chosen ? (
          <>
            <Mark name={chosen.name} />
            <span className="flex-1 font-medium">{chosen.name}</span>
            <Tokens tokens={chosen.tokens} />
          </>
        ) : (
          <span className="flex-1 text-[var(--muted)]">Choose a network</span>
        )}
        <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl" onKeyDown={keys}>
          <div className="border-b border-[var(--line)] p-2">
            <input
              ref={search}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              placeholder="Search networks"
              aria-label="Search networks"
              aria-controls={listId}
              className="w-full rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <ul id={listId} role="listbox" aria-labelledby={labelId} className="max-h-72 overflow-y-auto p-1.5">
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
            {shown.length === 0 && <li className="px-2.5 py-3 text-[var(--muted)]">No network called “{query}”. Stellar deposits are not possible yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
