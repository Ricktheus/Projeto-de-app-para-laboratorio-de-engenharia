import { pruneLoginAttempts, type UserRole } from '@concreto/shared';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

/** Lifecycle of the client session. `loading` covers the initial bootstrap. */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/** The current user's profile fields relevant to routing (read from `usuarios`). */
export interface AuthProfile {
  role: UserRole;
  nome: string;
  isAdmin: boolean;
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: AuthProfile | null;
  /** Epoch-ms timestamps of recent failed login attempts (client throttle). */
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
