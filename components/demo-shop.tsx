'use client';

import { PublicNav } from './public-nav';
import { CheckoutIntegration } from './checkout-integration';
import styles from './storefront.module.css';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

// A pretend shop that shows the checkout button the way a real shop would use it. Its prices and its merchant key
// live on its server (app/shop/api), so this page only sends what was picked.
import { MENU } from '@/lib/shop/catalogue';
type Basket = Record<(typeof MENU)[number]['id'], number>;
type Order = { order: string; invoice_id: string };
type State = { status: string; amount_naira: number; order: string; notice: { type: string; at: string } | null };

declare global {
  interface Window {
    TenKobo?: { open: (invoiceId: string, options?: { onPaid?: () => void; onClose?: (result: { paid: boolean }) => void }) => void };
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
  const [basket, setBasket] = useState<Basket>({ headphones: 1, backpack: 1, sunglasses: 1 });
  const [category, setCategory] = useState('All products');
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  // The customer shut the checkout before paying. Nothing was charged, and they can open it again.
  const [closedUnpaid, setClosedUnpaid] = useState(false);
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
    void check(order.invoice_id).catch(() => setError('We could not check your order. Please try again.'));
    const timer = setInterval(() => void check(order.invoice_id).catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, [order, check]);

  const openCheckout = (invoiceId: string) => {
    setClosedUnpaid(false);
    if (!window.TenKobo) { setError('Checkout is still loading. Please try opening it again.'); return; }
    window.TenKobo.open(invoiceId, {
      onPaid: () => void check(invoiceId),
      onClose: ({ paid }) => {
        if (!paid) setClosedUnpaid(true);
        void check(invoiceId);
      },
    });
  };

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
      openCheckout(made.invoice_id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not start the payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <Script src="/checkout.js" strategy="afterInteractive" />
      <PublicNav current="shop" />
      <div className={styles.intro}><div><span className={styles.eyebrow}>10KOBO CHECKOUT / INTERACTIVE STOREFRONT</span><h1>A familiar shop.<br /><span>A new way to pay.</span></h1><p>Build a basket and try the checkout your customers would use.</p></div><a href="#integration">Add checkout to your store <span aria-hidden>↓</span></a></div>
      <div className={styles.store}>
        <header className={styles.storeHeader}><div className={styles.storeBrand}><span aria-hidden>e.</span><div><strong>Everyday Supply</strong><small>Considered essentials. For your everyday.</small></div></div><span className={styles.storeBadge}>Powered by 10kobo</span></header>
        <div className={styles.storeGrid}>
          <section className={styles.catalogue} aria-label="Products"><div className={styles.catalogueHeading}><h2>The everyday collection.</h2><span>Demo prices · 3 essentials</span></div><div className={styles.categories} role="group" aria-label="Product categories">{['All products', 'Tech', 'Bags', 'Accessories'].map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><div className={styles.products}>
          {MENU.filter(item => category === 'All products' || item.category === category).map((item) => <article key={item.id} className={styles.product}>
            <div className={styles.productArt} data-product={item.id} aria-hidden="true">
              <img src={`/images/shop/${item.id}.webp`} alt="" width={900} height={900} loading="lazy" className={styles.productPhoto} />
            </div>
            <div className={styles.productInfo}><small>{item.category}</small><h3>{item.name}</h3><div className={styles.productBottom}><strong>{naira(item.naira)}</strong><div className={styles.quantity}><button type="button" disabled={basket[item.id] === 0} aria-label={`One less ${item.name}`} onClick={() => setBasket(current => ({ ...current, [item.id]: Math.max(current[item.id] - 1, 0) }))}>−</button><span data-testid={`qty-${item.id}`}>{basket[item.id]}</span><button type="button" disabled={basket[item.id] === 5} aria-label={`One more ${item.name}`} onClick={() => setBasket(current => ({ ...current, [item.id]: Math.min(current[item.id] + 1, 5) }))}>+</button></div></div></div>
          </article>)}
          </div></section>
          <aside className={styles.cart} aria-label="Your basket"><div className={styles.cartHeading}><h2>Your basket</h2><span>{Object.values(basket).reduce((a,b)=>a+b,0)} items</span></div>
            <ul>{MENU.filter(item => basket[item.id] > 0).map(item => <li key={item.id}><span>{basket[item.id]} × {item.name}</span><strong>{naira(basket[item.id]*item.naira)}</strong></li>)}</ul>
            {total === 0 && <p className={styles.empty}>Your basket is empty. Add a favourite to get started.</p>}
            <div className={styles.total}><span>Total</span><strong data-testid="shop-total">{naira(total)}</strong></div>
            <button type="button" disabled={busy || total === 0} onClick={() => void pay()} className={styles.payButton}>{busy ? 'Opening checkout…' : 'Checkout with 10kobo'}<span aria-hidden>→</span></button>
            <p className={styles.paymentNote}>Real-payment demo · No products are shipped. Review the quote before paying.</p>
            {error && <p role="alert" className={styles.error}>{error}</p>}
        {order && (
          <section aria-label="Your order" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm opacity-70">Order {order.order}</p>
            <p className="mt-1 text-xl font-semibold" data-testid="order-status">
              {state && closedUnpaid && ['unpaid', 'overdue'].includes(state.status) ? 'Not paid' : state ? (STATUS[state.status] ?? state.status) : 'Checking…'}
            </p>
            {state && closedUnpaid && ['unpaid', 'overdue'].includes(state.status) && (
              <p className="mt-1 text-sm" data-testid="order-closed">You closed the checkout before paying. Nothing was charged.</p>
            )}
            {state?.status === 'paid' && <p className="mt-1 text-sm">Payment confirmed. This was a demo order; no products will be shipped.</p>}
            <p className="mt-3 text-xs opacity-70" data-testid="order-notice">
              {state?.notice ? `Signed notice from 10kobo received and checked: ${state.notice.type}` : 'No notice from 10kobo yet. This shop also checks the order itself every few seconds.'}
            </p>
            {state && !['paid', 'cancelled', 'expired'].includes(state.status) && (
              <button type="button" className="mt-3 rounded-xl bg-[#111] px-4 py-2 text-sm font-semibold text-white" onClick={() => openCheckout(order.invoice_id)}>{closedUnpaid ? 'Pay now' : 'Open the checkout again'}</button>
            )}
          </section>
        )}

          </aside>
        </div>
      </div>
      <CheckoutIntegration />
      <footer className={styles.footer}><a href="/">10kobo.</a><span>Naira and stablecoins, both ways.</span><a href="/proof">See payment proof →</a></footer>
    </main>
  );
}
