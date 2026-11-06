'use client';

import { useEffect, useState } from 'react';
import { CardHeader } from './card-header';
import { InvoiceIcon } from './icons';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';
const LINK = /(https?:\/\/\S+\/pay\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))\b/;

/** The first pay link in a chat reply, and the reply without it, because the card shows it instead. */
export function splitPayLink(text: string): { text: string; url: string | null; id: string | null } {
  const match = LINK.exec(text);
  if (!match) return { text, url: null, id: null };
  return { text: text.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim(), url: match[1]!, id: match[2]! };
}

interface Details {
  amount_naira: number;
  to: string;
  bank_name: string;
  account_number: string | null;
  receives?: string;
  note: string | null;
  due_date?: string | null;
  overdue?: boolean;
  paid: boolean;
  line_items?: { description: string; amount_naira: number }[] | null;
}

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const dueText = (date: string) => new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'long' });

/** A pay link in the chat, readable at a glance. The link itself is always there, even if the details cannot load. */
export function PayLinkCard({ id, url }: { id: string; url: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API}/v1/public/pay-links/${id}`)
      .then(async (response) => {
        if (response.ok && live) setDetails((await response.json()) as Details);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id]);

  const copy = () =>
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <section className="card rise flex flex-col gap-3" aria-label="Invoice">
      <CardHeader
        Icon={InvoiceIcon}
        title={details?.line_items?.length || details?.due_date ? 'Invoice' : 'Pay Link'}
        aside={details?.paid ? <p className="rounded-full bg-[var(--pop)] px-2.5 py-1 text-xs font-semibold text-[#111]">Paid</p> : undefined}
      >
        Share the link with whoever pays you
      </CardHeader>
      {details && <p className="amount text-2xl font-semibold tracking-tight">{naira(details.amount_naira)}</p>}
      {details?.line_items?.length ? (
        <ul className="flex flex-col gap-1 border-y border-[var(--line)] py-2.5 text-sm">
          {details.line_items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item.description}</span><span className="amount shrink-0">{naira(item.amount_naira)}</span></li>
          ))}
        </ul>
      ) : null}
      {details && (
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">To</dt><dd className="min-w-0 break-words text-right">{details.to}{details.account_number ? `, ${details.bank_name} ${details.account_number}` : ''}</dd></div>
          {details.note && <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">For</dt><dd className="min-w-0 break-words text-right">{details.note}</dd></div>}
          {details.due_date && <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Due</dt><dd className={details.overdue && !details.paid ? 'font-medium text-red-600 dark:text-red-400' : ''}>{dueText(details.due_date)}</dd></div>}
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Receiver gets</dt><dd>{details.receives ?? 'naira'}</dd></div>
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        <a className="btn-primary flex-1 text-center" href={url} target="_blank" rel="noreferrer">Open invoice</a>
        <button type="button" className="btn-secondary flex-1" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      <p className="break-all text-xs text-[var(--muted)]" data-testid="pay-link-url">{url}</p>
    </section>
  );
}
