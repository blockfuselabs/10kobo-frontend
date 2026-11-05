import { notices, noticeIsGenuine, shopSecret } from '@/lib/shop/server';

/** Where 10kobo tells the shop about an invoice. Anything unsigned or old is refused. */
export async function POST(request: Request) {
  const secret = shopSecret();
  const body = await request.text();
  if (!secret || !noticeIsGenuine(request.headers.get('10kobo-signature'), body, secret)) return new Response('Not a genuine notice', { status: 401 });
  const event = JSON.parse(body) as { type: string; data: { id: string } };
  notices.add(event.data.id, event.type);
  return new Response(null, { status: 204 });
}
