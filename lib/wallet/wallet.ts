import { createContext, useContext } from 'react';

export interface WalletCall {
  to: string;
  data: string;
}

/** The user's wallet, as far as the app needs to know. Components use this, never the provider's SDK. */
export interface Wallet {
  address: string | null;
  /** Asks the user to sign. All the calls go in one transaction, so they all happen or none do. Returns its hash. */
  sendCalls(calls: readonly WalletCall[]): Promise<string>;
}

export const WalletContext = createContext<Wallet | null>(null);

export function useWallet(): Wallet {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error('useWallet must be used inside the wallet provider');
  return wallet;
}
