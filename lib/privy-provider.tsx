'use client';

import { addRpcUrlOverrideToChain, PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { SmartWalletsProvider, useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useMemo, type ReactNode } from 'react';
import type { Address, Hex } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { AuthContext, type Auth } from './auth/auth';
import { WalletContext, type Wallet } from './wallet/wallet';

// The only file that knows about Privy. Replacing it means providing Auth and Wallet another way.
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
const network = process.env.NEXT_PUBLIC_WALLET_CHAIN === 'base' ? base : baseSepolia;
// The public Base RPC refuses busy networks, so the wallet can read through our own route instead.
const chain = process.env.NEXT_PUBLIC_WALLET_RPC ? addRpcUrlOverrideToChain(network, process.env.NEXT_PUBLIC_WALLET_RPC) : network;

/** The backend and this page could be started with different settings. Real USDC must not go to a test address. */
async function assertSameNetwork(chainId: number) {
  const health = (await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`).then((r) => r.json()).catch(() => null)) as { chain_id?: number } | null;
  if (health?.chain_id !== chainId) throw new Error('This app is set up wrongly, so nothing was sent. Please contact support.');
}

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
  const wallet = useMemo<Wallet>(
    () => ({
      address,
      sendCalls: async (calls) => {
        if (!client) throw new Error('Your wallet is not ready yet. Please try again in a moment.');
        await assertSameNetwork(chain.id);
        try {
          return await client.sendTransaction({ calls: calls.map((call) => ({ to: call.to as Address, data: call.data as Hex })) });
        } catch (failure) {
          // The card shows a plain sentence, so the real reason must be kept somewhere.
          console.error('Wallet send failed:', failure);
          throw failure;
        }
      },
    }),
    [address, client],
  );

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
        // The approval card in the app is the one confirmation, so Privy's own prompt stays hidden, as in Tokkenly.
        embeddedWallets: { showWalletUIs: false, ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <SmartWalletsProvider>
        <Bridge>{children}</Bridge>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
