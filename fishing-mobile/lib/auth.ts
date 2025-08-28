// lib/auth.ts
import * as React from 'react';

type User = { id: string; email?: string } | null;

const AuthCtx = React.createContext<{ user: User; isLoggedIn: boolean; setUser: (u: User) => void } | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(null); // TODO: wire to real auth/session
  return (
    <AuthCtx.Provider value={{ user, isLoggedIn: !!user, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
