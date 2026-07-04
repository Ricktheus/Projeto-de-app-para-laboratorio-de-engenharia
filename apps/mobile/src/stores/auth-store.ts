import { pruneLoginAttempts, type UserRole } from '@concreto/shared';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/** Routing profile read from `usuarios` (SPEC F-S003-2). */
export interface AuthProfile {
  role: UserRole;
  nome: string;
  isAdmin: boolean;
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: AuthProfile | null;
  failedAttempts: number[];
  setAuthenticated: (session: Session, profile: AuthProfile) => void;
  setUnauthenticated: () => void;
  recordFailedAttempt: (at: number) => void;
  clearFailedAttempts: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  failedAttempts: [],
  setAuthenticated: (session, profile) =>
    set({ status: 'authenticated', session, profile, failedAttempts: [] }),
  setUnauthenticated: () => set({ status: 'unauthenticated', session: null, profile: null }),
  recordFailedAttempt: (at) =>
    set({ failedAttempts: [...pruneLoginAttempts(get().failedAttempts, at), at] }),
  clearFailedAttempts: () => set({ failedAttempts: [] }),
}));
