'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { createWalletClient, encodeFunctionData, http, parseAbi, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { AuthContext, type Auth } from './auth/auth';
import { WalletContext, type Wallet } from './wallet/wallet';

// For automated browser tests only, selected by NEXT_PUBLIC_IDENTITY=test and never in a production build.
const EMAIL = process.env.NEXT_PUBLIC_TEST_EMAIL ?? 'e2e@example.com';
const ADDRESS = process.env.NEXT_PUBLIC_TEST_WALLET ?? '';
const RPC = process.env.NEXT_PUBLIC_TEST_RPC ?? '';
const OWNER_KEY = process.env.NEXT_PUBLIC_TEST_OWNER_KEY ?? '';

const executeBatch = parseAbi(['function executeBatch((address target, uint256 value, bytes data)[] calls) payable']);

/** Sends through the same wallet contract a real user has, on a local chain, with a public test key. */
async function sendOnTestChain(calls: Wallet extends { sendCalls: (c: infer C) => unknown } ? C : never): Promise<string> {
  const client = createWalletClient({ account: privateKeyToAccount(OWNER_KEY as Hex), chain: baseSepolia, transport: http(RPC) });
  return client.sendTransaction({
    to: ADDRESS as Address,
    gas: 2_000_000n,
    data: encodeFunctionData({
      abi: executeBatch,
      functionName: 'executeBatch',
      args: [calls.map((call) => ({ target: call.to as Address, value: 0n, data: call.data as Hex }))],
    }),
  });
}

export function TestIdentityProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') throw new Error('The test sign-in cannot run in production');
  const [signedIn, setSignedIn] = useState(true);
  const getToken = useCallback(async () => (signedIn ? `test|${EMAIL}|${ADDRESS}` : null), [signedIn]);
  const auth = useMemo<Auth>(
    () => ({ ready: true, signedIn, signIn: () => setSignedIn(true), signOut: async () => setSignedIn(false), getToken }),
    [signedIn, getToken],
  );
  const wallet = useMemo<Wallet>(
    () => ({
      address: ADDRESS || null,
      sendCalls: async (calls) => {
        if (!RPC || !OWNER_KEY) throw new Error('No test wallet is set up');
        return sendOnTestChain(calls);
      },
    }),
    [],
  );
  return (
    <AuthContext.Provider value={auth}>
      <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
    </AuthContext.Provider>
  );
}
