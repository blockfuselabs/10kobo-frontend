import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { noticeIsGenuine } from './server';

const secret = 'whsec_test';
const body = JSON.stringify({ type: 'invoice.paid', data: { id: 'x' } });
const sign = (timestamp: number, text = body, key = secret) => `t=${timestamp},v1=${createHmac('sha256', key).update(`${timestamp}.${text}`).digest('hex')}`;
const now = 1_800_000_000_000;

describe('checking a notice from 10kobo', () => {
  it('accepts a fresh notice signed with the shop secret', () => {
    expect(noticeIsGenuine(sign(now / 1000), body, secret, now)).toBe(true);
  });

  it('refuses a wrong secret, a changed body, a missing signature and an old notice', () => {
    expect(noticeIsGenuine(sign(now / 1000, body, 'whsec_other'), body, secret, now)).toBe(false);
    expect(noticeIsGenuine(sign(now / 1000), body.replace('paid', 'cancelled'), secret, now)).toBe(false);
    expect(noticeIsGenuine(null, body, secret, now)).toBe(false);
    expect(noticeIsGenuine(sign(now / 1000 - 600), body, secret, now)).toBe(false);
  });
});
