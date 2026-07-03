import { useEffect } from 'react';

import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/auth-store';

import { fetchProfile } from './auth-service';

/**
 * Bootstraps the session on app start and keeps the auth store in sync with
 * Supabase auth events. Resolves the initial `loading` state to either
 * `authenticated` (session + profile) or `unauthenticated`. On sign-out or an
 * expired/refresh-failed token, the store is cleared so guards redirect to login.
 */
export function useInitAuth(): void {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  useEffect(() => {
    let active = true;

    async function resolveSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        setUnauthenticated();
        return;
      }
      try {
        const profile = await fetchProfile(data.session.user.id);
        if (active) setAuthenticated(data.session, profile);
      } catch {
        await supabase.auth.signOut();
        if (active) setUnauthenticated();
      }
    }

    void resolveSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUnauthenticated();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setAuthenticated, setUnauthenticated]);
}
