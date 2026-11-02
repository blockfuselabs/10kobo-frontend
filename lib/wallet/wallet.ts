import { createContext, useContext } from 'react';

/** The user's wallet, as far as the app needs to know. Signing joins this in a later phase. */
export interface Wallet {
  address: string | null;
}

export const WalletContext = createContext<Wallet | null>(null);

export function useWallet(): Wallet {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error('useWallet must be used inside the wallet provider');
  return wallet;
}
