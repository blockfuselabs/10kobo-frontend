'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiClient, Receipt } from '@/lib/api/client';
import { drawReceipt } from '@/lib/receipt-image';

const canShareFile = (file: File) => {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
};

/** Shows the receipt image, with a way to save it and, where the device allows, send it to someone. */
export function ReceiptDialog({ api, kind, id, onClose }: { api: ApiClient; kind: 'payment' | 'deposit'; id: string; onClose: () => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    api
      .receipt(kind, id)
      .then(async (found) => {
        const blob = await drawReceipt(found);
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setReceipt(found);
        setUrl(made);
        setFile(new File([blob], `10kobo-receipt-${found.reference.slice(0, 8)}.png`, { type: 'image/png' }));
      })
      .catch(() => {
        if (!cancelled) setError('We could not make this receipt. Please try again.');
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [api, kind, id]);

  useEffect(() => {
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  const copy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Your browser would not copy the image. Please download it instead.');
    }
  };

  const summary = receipt && `${receipt.title}, ${receipt.amount}${receipt.recipient ? ` to ${receipt.recipient}` : ''}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Receipt" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="receipt-sheet rise flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl bg-[var(--surface)] p-4 shadow-2xl">
        <div className="flex items-center justify-between px-1">
          <p className="font-semibold">Your receipt</p>
          <button ref={closeButton} onClick={onClose} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-lg text-[var(--muted)] hover:bg-[var(--surface-2)]">×</button>
        </div>
        {url && summary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={summary} className="w-full rounded-2xl border border-[var(--line)]" />
        ) : (
          !error && <p className="py-10 text-center text-sm text-[var(--muted)]">Making your receipt…</p>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {url && file && (
          <div className="flex flex-wrap gap-2">
            <a href={url} download={file.name} className="btn-primary flex-1">Download</a>
            {canShareFile(file) ? (
              <button className="btn-secondary flex-1" onClick={() => void navigator.share({ files: [file], title: '10kobo receipt' }).catch(() => undefined)}>Share</button>
            ) : (
              <button className="btn-secondary flex-1" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy image'}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
