'use client';

import { IdentityProvider as PrivyIdentityProvider } from '@/lib/privy-provider';
import { TestIdentityProvider } from '@/lib/test-provider';
import { useAuth } from '@/lib/auth/auth';
import { Home } from './home';
import { Logo } from './icons';

const IdentityProvider = process.env.NEXT_PUBLIC_IDENTITY === 'test' ? TestIdentityProvider : PrivyIdentityProvider;

function Gate() {
  const { ready, signedIn, signIn } = useAuth();
  if (!ready) return <div className="grid min-h-dvh place-items-center"><Logo size={40} /></div>;
  if (signedIn) return <Home />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-7 px-6">
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">10kobo</span>
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight">Move money by just saying it.</h1>
        <p className="text-[var(--muted)]">Send to banks and wallets, buy airtime and data, and schedule payments, all from one chat.</p>
      </div>
      <button onClick={signIn} className="btn-primary w-full py-3.5">
        Sign in with email
      </button>
      <p className="text-center text-xs text-[var(--muted)]">{process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? 'This uses real money.' : 'Test version. No real money.'}</p>
    </main>
  );
}

export function App() {
  return (
    <IdentityProvider>
      <Gate />
    </IdentityProvider>
  );
}
