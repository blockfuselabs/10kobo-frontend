'use client';

import { useState } from 'react';
import type { FileReading } from '@/lib/api/client';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;
export const FILE_ACCEPT = ACCEPTED.join(',');

// A picture of each attached file, kept only in this browser tab, so the chat can show the invoice itself.
const previews = new Map<string, string>();
export const rememberPreview = (fileName: string, url: string) => previews.set(fileName, url);

/** Photos are made smaller first, so they upload fast on a phone. A PDF is sent as it is. */
export async function prepareFile(file: File): Promise<{ name: string; type: string; base64: string; preview: string | null }> {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (!ACCEPTED.includes(type) && !file.type.startsWith('image/')) throw new Error('Attach a photo or a PDF.');
  if (type === 'application/pdf') {
    if (file.size > MAX_BYTES) throw new Error('PDFs can be up to 5 MB.');
    return { name: file.name, type, base64: await toBase64(file), preview: null };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That photo could not be opened. Try a JPG or PNG.');
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob || blob.size > MAX_BYTES) throw new Error('That photo is too large.');
  return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', base64: await toBase64(blob), preview: URL.createObjectURL(blob) };
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(blob);
  });
}

const BLOCK = /\n*📎 (.+?) \(read by 10kobo\)\n<<<\n([\s\S]*?)\n>>>(?:\n⚠ Hidden text in this file[^\n]*\n((?:- .*(?:\n|$))*))?\s*$/;

/** Splits a sent message into what the user typed and the attached file that was read. */
export function splitAttachment(content: string): { text: string; file: { name: string; text: string; hidden: string[] } | null } {
  const match = BLOCK.exec(content);
  if (!match) return { text: content, file: null };
  const hidden = (match[3] ?? '').split('\n').map((line) => line.replace(/^- /, '').trim()).filter(Boolean);
  return { text: content.slice(0, match.index).trim(), file: { name: match[1]!, text: match[2]!, hidden } };
}

/** The attachment inside a sent message: the file, what was found hidden in it, and what was read. */
export function AttachmentView({ file }: { file: { name: string; text: string; hidden: string[] } }) {
  const [open, setOpen] = useState(false);
  const preview = previews.get(file.name) ?? null;
  return (
    <div data-attachment className="mt-2 flex flex-col gap-1.5 rounded-xl bg-black/15 px-3 py-2 text-sm dark:bg-black/25">
      {preview && <InvoicePicture url={preview} name={file.name} />}
      <p className="font-medium">📎 {file.name}</p>
      <p className="text-xs opacity-80">Read by 10kobo</p>
      {file.hidden.length > 0 && (
        <p className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white">
          ⚠ Hidden text found: “{file.hidden[0]!.replace(/ \[[a-z ]+\]$/, '').slice(0, 140)}”
        </p>
      )}
      <button type="button" onClick={() => setOpen(!open)} className="self-start text-xs underline underline-offset-2 opacity-90">
        {open ? 'Hide what was read' : 'Show what was read'}
      </button>
      {open && <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs opacity-90">{file.text}</pre>}
    </div>
  );
}

/** The invoice itself, small in the chat; a click shows it full size over the page. */
function InvoicePicture({ url, name, small = false }: { url: string; name: string; small?: boolean }) {
  const [big, setBig] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setBig(true)} aria-label={`Show ${name} full size`} className="cursor-zoom-in self-start overflow-hidden rounded-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className={small ? 'h-14 w-11 object-cover object-top' : 'max-h-72 w-auto max-w-full'} />
      </button>
      {big && (
        <div role="dialog" aria-label={name} onClick={() => setBig(false)} className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="max-h-full max-w-full rounded-lg bg-white shadow-2xl" />
        </div>
      )}
    </>
  );
}

/** Above the message box while a file is read, and once it is ready to send. */
export function PendingAttachment({ state, onRemove }: { state: { name: string; reading: FileReading | null; error: string | null; preview?: string | null }; onRemove: () => void }) {
  return (
    <div className="mx-auto mb-2 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm shadow-[var(--shadow)]">
      {state.preview ? <InvoicePicture url={state.preview} name={state.name} small /> : <span aria-hidden>📎</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{state.name}</p>
        <p className={`text-xs ${state.error ? 'text-red-600 dark:text-red-400' : state.reading?.hidden_text.length ? 'font-medium text-red-600 dark:text-red-400' : 'text-[var(--muted)]'}`}>
          {state.error
            ? state.error
            : !state.reading
              ? 'Reading it…'
              : state.reading.hidden_text.length
                ? `⚠ Hidden text found in this file (${state.reading.seconds}s)`
                : `Read by 10kobo (${state.reading.seconds}s). Say what to do with it.`}
        </p>
      </div>
      {!state.reading && !state.error && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--muted)] border-t-transparent" />}
      <button type="button" onClick={onRemove} aria-label="Remove file" className="rounded-full px-2 py-1 text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
    </div>
  );
}
