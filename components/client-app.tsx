'use client';

import dynamic from 'next/dynamic';
import { Logo } from './icons';

const App = dynamic(() => import('./app').then((module) => module.App), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center">
      <Logo size={40} />
    </div>
  ),
});

// Sign-in and wallets only exist in the browser, so none of this is server-rendered.
export function ClientApp({ page }: { page?: 'home' | 'login' }) {
  return <App page={page} />;
}
