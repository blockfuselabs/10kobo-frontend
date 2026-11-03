'use client';

import { IdentityProvider as PrivyIdentityProvider } from '@/lib/privy-provider';
import { TestIdentityProvider } from '@/lib/test-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth';
import { Home } from './home';
import { Logo } from './icons';
import { LoginPage } from './login';
import { Welcome } from './welcome';

const IdentityProvider = process.env.NEXT_PUBLIC_IDENTITY === 'test' ? TestIdentityProvider : PrivyIdentityProvider;

function Gate({ page }: { page: 'home' | 'login' }) {
  const { ready, signedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (page === 'login' && ready && signedIn) router.replace('/');
  }, [page, ready, signedIn, router]);
  if (!ready || (page === 'login' && signedIn)) return <div className="grid min-h-dvh place-items-center"><Logo size={40} /></div>;
  if (page === 'login') return <LoginPage />;
  if (signedIn) return <Home />;
  return <Welcome onSignIn={() => router.push('/login')} />;
}

export function App({ page = 'home' }: { page?: 'home' | 'login' }) {
  return (
    <IdentityProvider>
      <Gate page={page} />
    </IdentityProvider>
  );
}
