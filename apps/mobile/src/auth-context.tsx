import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, clearToken } from './api';
type Auth = { signedIn: boolean; ready: boolean; setSignedIn: (value: boolean) => void; signOut: () => Promise<void> };
const Ctx = createContext<Auth>({ signedIn: false, ready: false, setSignedIn: () => {}, signOut: async () => {} });
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [signedIn, setSignedIn] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => { getToken().then(t => setSignedIn(!!t)).finally(() => setReady(true)); }, []);
  const signOut = async () => { await clearToken(); setSignedIn(false); };
  return <Ctx.Provider value={{ signedIn, ready, setSignedIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
