'use client';

import { IdentityProvider as PrivyIdentityProvider } from '@/lib/privy-provider';
import { TestIdentityProvider } from '@/lib/test-provider';
import { useAuth } from '@/lib/auth/auth';
import { Home } from './home';
import { Logo } from './icons';
import { Welcome } from './welcome';

const IdentityProvider = process.env.NEXT_PUBLIC_IDENTITY === 'test' ? TestIdentityProvider : PrivyIdentityProvider;

function Gate() {
  const { ready, signedIn, signIn } = useAuth();
  if (!ready) return <div className="grid min-h-dvh place-items-center"><Logo size={40} /></div>;
  if (signedIn) return <Home />;
  return <Welcome onSignIn={signIn} />;
}

export function App() {
  return (
    <IdentityProvider>
      <Gate />
    </IdentityProvider>
  );
}
