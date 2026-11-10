import { randomUUID } from 'node:crypto';
import { API, MENU, notices, shopKey } from '@/lib/shop/server';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Makes an invoice for the basket with the shop's merchant key. Prices come from the shop's own menu, never from the browser. */
export async function POST(request: Request) {
  const key = shopKey();
  if (!key) return Response.json({ message: 'The demo shop has no merchant key set up.' }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { items?: Record<string, number> } | null;
  const lines = MENU.flatMap((item) => {
    const quantity = Math.min(Math.max(Math.floor(Number(body?.items?.[item.id] ?? 0)), 0), 5);
    return quantity ? [{ description: quantity > 1 ? `${item.name} × ${quantity}` : item.name, amount_naira: item.naira * quantity }] : [];
  });
  if (lines.length === 0) return Response.json({ message: 'Your basket is empty.' }, { status: 400 });
  const order = `order-${randomUUID().slice(0, 8)}`;
  const origin = new URL(request.url).origin;
  const response = await fetch(`${API}/v1/merchant/invoices`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ reference: order, line_items: lines, note: `Everyday Supply ${order}`, return_url: `${origin}/shop?order=${order}` }),
  }).catch(() => null);
  if (!response) return Response.json({ message: 'We could not reach the payment service.' }, { status: 502 });
  const invoice = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !invoice.id) return Response.json({ message: invoice.message ?? 'We could not start the payment.' }, { status: response.status });
  return Response.json({ order, invoice_id: invoice.id });
}

/** The order's state, asked of 10kobo with the key, plus whether a signed notice has arrived. */
export async function GET(request: Request) {
  const key = shopKey();
  const id = new URL(request.url).searchParams.get('invoice') ?? '';
  if (!key || !ID.test(id)) return Response.json({ message: 'No such order.' }, { status: 404 });
  const response = await fetch(`${API}/v1/merchant/invoices/${id}`, { headers: { authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
  if (!response?.ok) return Response.json({ message: 'We could not check the order.' }, { status: 502 });
  const invoice = (await response.json()) as { status: string; amount_naira: number; reference: string };
  return Response.json({ status: invoice.status, amount_naira: invoice.amount_naira, order: invoice.reference, notice: notices.get(id) });
}
