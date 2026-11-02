'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type Auth } from './auth/auth';
import { WalletContext, type Wallet } from './wallet/wallet';

// For automated browser tests only, selected by NEXT_PUBLIC_IDENTITY=test and never in a production build.
const EMAIL = process.env.NEXT_PUBLIC_TEST_EMAIL ?? 'e2e@example.com';
const ADDRESS = process.env.NEXT_PUBLIC_TEST_WALLET ?? '';

export function TestIdentityProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') throw new Error('The test sign-in cannot run in production');
  const [signedIn, setSignedIn] = useState(true);
  const getToken = useCallback(async () => (signedIn ? `test|${EMAIL}|${ADDRESS}` : null), [signedIn]);
  const auth = useMemo<Auth>(
    () => ({
      ready: true,
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: async () => setSignedIn(false),
      getToken,
    }),
    [signedIn, getToken],
  );
  const wallet = useMemo<Wallet>(() => ({ address: ADDRESS || null }), []);
  return (
    <AuthContext.Provider value={auth}>
      <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
    </AuthContext.Provider>
  );
}
