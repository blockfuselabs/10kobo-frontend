'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { SmartWalletsProvider, useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useMemo, type ReactNode } from 'react';
import { base, baseSepolia } from 'viem/chains';
import { AuthContext, type Auth } from './auth/auth';
import { WalletContext, type Wallet } from './wallet/wallet';

// The only file that knows about Privy. Replacing it means providing Auth and Wallet another way.
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
const chain = process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? base : baseSepolia;

function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { client } = useSmartWallets();

  const auth = useMemo<Auth>(
    () => ({
      ready,
      signedIn: authenticated,
      signIn: () => login(),
      signOut: logout,
      getToken: getAccessToken,
    }),
    [ready, authenticated, login, logout, getAccessToken],
  );
  const address = client?.account?.address ?? null;
  const wallet = useMemo<Wallet>(() => ({ address }), [address]);

  return (
    <AuthContext.Provider value={auth}>
      <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
    </AuthContext.Provider>
  );
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) {
    return <p className="p-6 text-sm">Set NEXT_PUBLIC_PRIVY_APP_ID to run this app.</p>;
  }
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ['email'],
        defaultChain: chain,
        supportedChains: [chain],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <SmartWalletsProvider>
        <Bridge>{children}</Bridge>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
