'use client';

import { IdentityProvider as PrivyIdentityProvider } from '@/lib/privy-provider';
import { TestIdentityProvider } from '@/lib/test-provider';
import { useAuth } from '@/lib/auth/auth';
import { Home } from './home';

const IdentityProvider = process.env.NEXT_PUBLIC_IDENTITY === 'test' ? TestIdentityProvider : PrivyIdentityProvider;

function Gate() {
  const { ready, signedIn, signIn } = useAuth();
  if (!ready) return <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>;
  if (signedIn) return <Home />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">10kobo</h1>
      <p className="text-[var(--muted)]">Buy airtime and send money by chat.</p>
      <button
        onClick={signIn}
        className="rounded-lg bg-[var(--accent)] px-4 py-3 font-medium text-[var(--accent-text)]"
      >
        Sign in with email
      </button>
      <p className="text-xs text-[var(--muted)]">Test version. No real money.</p>
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
