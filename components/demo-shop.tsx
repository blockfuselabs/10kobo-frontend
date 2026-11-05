'use client';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

// A pretend shop that shows the checkout button the way a real shop would use it. Its prices and its merchant key
// live on its server (app/shop/api), so this page only sends what was picked.
const MENU = [
  { id: 'jollof', name: 'Jollof rice and chicken', naira: 900 },
  { id: 'puff', name: 'Puff-puff, six pieces', naira: 300 },
  { id: 'zobo', name: 'Zobo drink', naira: 200 },
] as const;
type Basket = Record<(typeof MENU)[number]['id'], number>;
type Order = { order: string; invoice_id: string };
type State = { status: string; amount_naira: number; order: string; notice: { type: string; at: string } | null };

declare global {
  interface Window {
    TenKobo?: { open: (invoiceId: string, options?: { onPaid?: () => void; onClose?: () => void }) => void };
  }
}

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
const STATUS: Record<string, string> = {
  unpaid: 'Waiting for payment',
  being_paid: 'Payment on its way',
  overdue: 'Waiting for payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  expired: 'Expired',
};
const remember = (order: Order) => {
  try {
    localStorage.setItem(`shop-order-${order.order}`, order.invoice_id);
  } catch {}
};
const recall = (order: string) => {
  try {
    return localStorage.getItem(`shop-order-${order}`);
  } catch {
    return null;
  }
};

export function DemoShop() {
  const [basket, setBasket] = useState<Basket>({ jollof: 1, puff: 1, zobo: 1 });
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = MENU.reduce((sum, item) => sum + item.naira * basket[item.id], 0);

  // Coming back from the checkout with ?order=…, the shop finds the order it saved.
  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get('order');
    const invoice = back ? recall(back) : null;
    if (back && invoice) setOrder({ order: back, invoice_id: invoice });
  }, []);

  const check = useCallback(async (invoiceId: string) => {
    const response = await fetch(`/shop/api/order?invoice=${invoiceId}`, { cache: 'no-store' });
    if (response.ok) setState((await response.json()) as State);
  }, []);

  useEffect(() => {
    if (!order) return;
    void check(order.invoice_id);
    const timer = setInterval(() => void check(order.invoice_id).catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, [order, check]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/shop/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: basket }) });
      const made = (await response.json()) as Order & { message?: string };
      if (!response.ok) throw new Error(made.message ?? 'We could not start the payment.');
      remember(made);
      setState(null);
      setOrder(made);
      window.TenKobo?.open(made.invoice_id, { onPaid: () => void check(made.invoice_id), onClose: () => void check(made.invoice_id) });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not start the payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#fbf6ee] px-4 py-10 text-[#2b1d12]">
      <Script src="/checkout.js" strategy="afterInteractive" />
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <p className="rounded-xl bg-[#2b1d12] px-4 py-2 text-center text-xs text-[#fbf6ee]">
          Demo shop for the 10kobo checkout button. Payments are real: naira goes to the 10kobo team&apos;s own account.
        </p>
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mama Put Kitchen</h1>
          <p className="text-sm opacity-70">Lagos street food. Pay from anywhere in the world.</p>
        </header>

        <section aria-label="Menu" className="flex flex-col gap-2">
          {MENU.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="amount text-sm opacity-70">{naira(item.naira)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`One less ${item.name}`} className="h-8 w-8 rounded-full border border-[#2b1d12]/20" onClick={() => setBasket((current) => ({ ...current, [item.id]: Math.max(current[item.id] - 1, 0) }))}>−</button>
                <span className="w-5 text-center" data-testid={`qty-${item.id}`}>{basket[item.id]}</span>
                <button type="button" aria-label={`One more ${item.name}`} className="h-8 w-8 rounded-full border border-[#2b1d12]/20" onClick={() => setBasket((current) => ({ ...current, [item.id]: Math.min(current[item.id] + 1, 5) }))}>+</button>
              </div>
            </div>
          ))}
        </section>

        <div className="flex items-center justify-between">
          <p className="text-lg">Total</p>
          <p className="amount text-2xl font-semibold" data-testid="shop-total">{naira(total)}</p>
        </div>

        <button
          type="button"
          disabled={busy || total === 0}
          onClick={() => void pay()}
          className="flex flex-col items-center gap-0.5 rounded-2xl bg-[#111] px-6 py-3 text-white disabled:opacity-50"
        >
          <span className="text-base font-semibold">{busy ? 'Starting…' : 'Pay with crypto'}</span>
          <span className="text-xs opacity-75">USDC or USDT from any chain, by 10kobo</span>
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        {order && (
          <section aria-label="Your order" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm opacity-70">Order {order.order}</p>
            <p className="mt-1 text-xl font-semibold" data-testid="order-status">{state ? STATUS[state.status] ?? state.status : 'Checking…'}</p>
            {state?.status === 'paid' && <p className="mt-1 text-sm">Thank you. Your food is being prepared.</p>}
            <p className="mt-3 text-xs opacity-70" data-testid="order-notice">
              {state?.notice ? `Signed notice from 10kobo received and checked: ${state.notice.type}` : 'No notice from 10kobo yet. This shop also checks the order itself every few seconds.'}
            </p>
            {state && !['paid', 'cancelled', 'expired'].includes(state.status) && (
              <button type="button" className="mt-3 text-sm font-medium underline" onClick={() => window.TenKobo?.open(order.invoice_id, { onPaid: () => void check(order.invoice_id), onClose: () => void check(order.invoice_id) })}>Open the checkout again</button>
            )}
          </section>
        )}

        <footer className="text-xs opacity-60">
          How a shop adds this: its server asks 10kobo for an invoice using its secret key, then its page loads{' '}
          <code className="font-mono">checkout.js</code> and calls <code className="font-mono">TenKobo.open(invoiceId)</code>. The checkout opens over the page.
        </footer>
      </div>
    </main>
  );
}
