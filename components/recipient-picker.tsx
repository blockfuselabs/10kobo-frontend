'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { SendOptions } from '@/lib/api/client';

type Recipient = SendOptions['recipients'][number];

export const NEW_RECIPIENT = 'new';
/** With no search, only the most recently paid are shown, so a long list of people never fills the screen. */
const RECENT = 5;
const MOST_RESULTS = 30;

function Initials({ name }: { name: string }) {
  const letters = name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 2) || '?';
  return <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-xs font-semibold uppercase">{letters}</span>;
}

/**
 * Chooses who to pay: the people paid most recently first, a search over everyone, and "Someone new" always at the
 * top. Built for hundreds of saved recipients.
 */
export function RecipientPicker({ recipients, value, onChange }: { recipients: Recipient[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ up: boolean; height: number }>({ up: false, height: 320 });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  const wanted = query.trim().toLowerCase();
  const matches = wanted ? recipients.filter((item) => `${item.name} ${item.detail}`.toLowerCase().includes(wanted)) : recipients.slice(0, RECENT);
  const shown = matches.slice(0, MOST_RESULTS);
  const hidden = wanted ? matches.length - shown.length : recipients.length - shown.length;
  // "Someone new" is always the first choice, then the people.
  const choices = [NEW_RECIPIENT, ...shown.map((item) => item.destination_id)];
  const chosen = recipients.find((item) => item.destination_id === value) ?? null;

  const toggle = () => {
    if (!open && button.current) {
      const box = button.current.getBoundingClientRect();
      const below = window.innerHeight - box.bottom - 16;
      const above = box.top - 16;
      const up = below < 320 && above > below;
      setPlace({ up, height: Math.max(180, Math.min(320, (up ? above : below) - 76)) });
    }
    setOpen(!open);
    setActive(0);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus({ preventScroll: true });
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
    button.current?.focus();
  };

  const keys = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((at) => Math.min(at + 1, choices.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((at) => Math.max(at - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // While searching, Enter picks the first person found rather than "Someone new".
      const pick = wanted && active === 0 && shown.length > 0 ? shown[0]!.destination_id : choices[active];
      if (pick) choose(pick);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative flex flex-col gap-1 text-sm">
      <span id={labelId}>To</span>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={toggle}
        onKeyDown={(event) => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); toggle(); } }}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-[var(--surface)] px-3.5 py-2 text-left transition-colors hover:border-[var(--foreground)] ${open ? 'border-[var(--foreground)]' : 'border-[var(--line)]'}`}
        data-testid="recipient-picker"
      >
        {chosen ? (
          <>
            <Initials name={chosen.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{chosen.name}</span>
              <span className="truncate text-xs text-[var(--muted)]">{chosen.detail}</span>
            </span>
          </>
        ) : (
          <>
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--pop)] text-lg font-semibold text-[#111]">+</span>
            <span className="flex-1 font-medium">Someone new</span>
          </>
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
              placeholder="Search by name, bank or number"
              aria-label="Search recipients"
              aria-controls={listId}
              className="w-full rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <ul id={listId} role="listbox" aria-labelledby={labelId} className="overflow-y-auto p-1.5" style={{ maxHeight: place.height }}>
            <li role="option" aria-selected={value === NEW_RECIPIENT} onMouseEnter={() => setActive(0)} onClick={() => choose(NEW_RECIPIENT)} className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${active === 0 ? 'bg-[var(--surface-2)]' : ''}`}>
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--pop)] text-lg font-semibold text-[#111]">+</span>
              <span className="flex-1 font-medium">Someone new</span>
            </li>
            {shown.length > 0 && <li aria-hidden className="px-2.5 pt-2 pb-1 text-xs font-medium text-[var(--muted)]">{wanted ? 'Found' : 'Recent'}</li>}
            {shown.map((item, index) => (
              <li
                key={item.destination_id}
                role="option"
                aria-selected={item.destination_id === value}
                onMouseEnter={() => setActive(index + 1)}
                onClick={() => choose(item.destination_id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${active === index + 1 ? 'bg-[var(--surface-2)]' : ''}`}
              >
                <Initials name={item.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="truncate text-xs text-[var(--muted)]">{item.detail}</span>
                </span>
                <span aria-hidden className={`w-4 text-center ${item.destination_id === value ? '' : 'invisible'}`}>✓</span>
              </li>
            ))}
            {wanted && shown.length === 0 && <li className="px-2.5 py-3 text-[var(--muted)]">Nobody saved called “{query.trim()}”. Choose Someone new to add them.</li>}
            {hidden > 0 && <li className="px-2.5 py-2 text-xs text-[var(--muted)]">{wanted ? `${hidden} more found. Type more to narrow it down.` : `${hidden} more saved. Search to find them.`}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
