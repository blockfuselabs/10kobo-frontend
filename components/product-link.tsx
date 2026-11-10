'use client';

import { useEffect, useState } from 'react';
import { Logo } from './icons';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';
const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

interface PublicProduct {
  id: string;
  title: string;
  amount_naira: number | null;
  customer_chooses?: boolean;
  minimum_naira?: number | null;
  to: string;
  receives: string;
  open: boolean;
}

/** A seller's reusable payment link. Pay opens this customer's own invoice, where they choose bank transfer or crypto. */
export function ProductLinkPage({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    fetch(`${API}/v1/public/product-links/${id}`)
      .then(async (response) => {
        if (response.status === 404 || response.status === 400) return setMissing(true);
        if (response.ok) setProduct((await response.json()) as PublicProduct);
      })
      .catch(() => setError('We could not load this link. Please check your connection.'));
  }, [id]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API}/v1/public/product-links/${id}/checkout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(product?.amount_naira === null ? { amount_naira: Number(typed) } : {}),
      });
      const body = (await response.json()) as { invoice_id?: string; message?: string };
      if (!response.ok || !body.invoice_id) throw new Error(body.message ?? 'We could not start the payment. Please try again.');
      window.location.assign(`/pay/${body.invoice_id}${embedded ? '?embed=1' : ''}`);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  // Inside a shop's page, say how tall this is, so the pop-up fits it.
  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const report = () => window.parent.postMessage({ source: '10kobo', type: 'height', link: id, height: document.documentElement.scrollHeight }, '*');
    report();
    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [embedded, id, product]);

  return (
    <main className={embedded ? 'flex flex-col items-center bg-[var(--background)] px-4 pt-6 pb-5' : 'flex min-h-dvh flex-col items-center bg-[var(--background)] px-4 py-10'}>
      <a href="/" target={embedded ? '_blank' : undefined} rel="noreferrer" className={`${embedded ? 'mb-5' : 'mb-8'} flex items-center gap-2`}><Logo size={30} /><span className="text-xl font-bold tracking-tight">10kobo</span></a>
      <section className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm" aria-label="Payment link">
        {missing && <p className="font-medium">This payment link does not exist. Please check it with the seller.</p>}
        {!missing && !product && !error && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {product && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[var(--muted)]">Pay <span className="font-medium text-[var(--foreground)]" data-testid="product-seller">{product.to}</span></p>
              <h1 className="text-xl font-semibold" data-testid="product-title">{product.title}</h1>
              {product.amount_naira !== null && <p className="amount mt-2 text-4xl font-semibold" data-testid="product-price">{naira(product.amount_naira)}</p>}
            </div>
            {product.open ? (
              <>
                {product.amount_naira === null && (
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span>Amount to pay{product.minimum_naira ? <span className="text-[var(--muted)]"> · at least {naira(product.minimum_naira)}</span> : null}</span>
                    <span className="field flex items-center gap-2 py-3 focus-within:border-[var(--foreground)]">
                      <span className="amount text-2xl font-semibold text-[var(--muted)]" aria-hidden>₦</span>
                      <input className="amount min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none" aria-label="Amount in naira" inputMode="numeric" value={typed} onChange={(event) => setTyped(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="0" autoComplete="off" />
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  className="btn-primary w-full py-3.5"
                  disabled={busy || (product.amount_naira === null && (Number(typed) < (product.minimum_naira ?? 1) || Number(typed) > 50_000))}
                  onClick={() => void pay()}
                >
                  {busy ? 'Opening…' : `Pay ${naira(product.amount_naira ?? (Number(typed) || 0))}`}
                </button>
                <p className="text-center text-xs text-[var(--muted)]">Pay by bank transfer, or with USDC or USDT from 15 networks. No account needed.</p>
              </>
            ) : (
              <p className="rounded-xl bg-[var(--surface-2)] p-4 text-sm" role="status">The seller has stopped this payment link. Nothing can be paid here.</p>
            )}
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
      <p className="mt-6 text-xs text-[var(--muted)]">Payments by 10kobo. 10kobo never holds your money.</p>
    </main>
  );
}
