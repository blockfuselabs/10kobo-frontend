import { createContext, useContext } from 'react';

/** What the app needs from sign-in. Components use this, never the provider's SDK. */
export interface Auth {
  ready: boolean;
  signedIn: boolean;
  signIn(): void;
  signOut(): Promise<void>;
  getToken(): Promise<string | null>;
}

export const AuthContext = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside the auth provider');
  return auth;
}
