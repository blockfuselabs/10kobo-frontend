import { createHmac, timingSafeEqual } from 'node:crypto';

// The demo shop's own server code. It plays the part of a real shop's backend: it holds the merchant key and
// the notice secret, which never reach the browser.
export const API = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010';
export const shopKey = () => process.env.SHOP_MERCHANT_KEY;
export const shopSecret = () => process.env.SHOP_WEBHOOK_SECRET;

export { MENU } from './catalogue';

/** Checks a notice the way any shop should: the signature must match, and it must be recent so an old one cannot be replayed. */
export function noticeIsGenuine(header: string | null, body: string, secret: string, now = Date.now()): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  const given = Buffer.from(match[2]!, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Notices received since this server started. A real shop would store them in its database. */
const received = new Map<string, { type: string; at: string }>();
export const notices = {
  add: (invoiceId: string, type: string) => received.set(invoiceId, { type, at: new Date().toISOString() }),
  get: (invoiceId: string) => received.get(invoiceId) ?? null,
};
