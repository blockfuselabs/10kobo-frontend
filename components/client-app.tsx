'use client';

import dynamic from 'next/dynamic';

// Sign-in and wallets only exist in the browser, so none of this is server-rendered.
export const ClientApp = dynamic(() => import('./app').then((module) => module.App), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>,
});
