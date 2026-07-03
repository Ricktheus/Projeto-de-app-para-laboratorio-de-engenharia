import {
  authErrorMessage,
  evaluateLoginThrottle,
  mapSupabaseAuthError,
  MESSAGES,
  roleHome,
  type AuthErrorLike,
  type LoginCredentials,
} from '@concreto/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AREA_PATH } from '../../routes/area-paths';
import { useAuthStore } from '../../stores/auth-store';

import { signInWithCredentials } from './auth-service';

/**
 * Orchestrates the login use case (F-S003-1): client-side throttle → Supabase
 * sign-in → profile fetch → session store → role-based redirect. All copy comes
 * from the shared PT catalog; raw provider errors are never surfaced.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const recordFailedAttempt = useAuthStore((s) => s.recordFailedAttempt);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: signInWithCredentials,
    // 4xx auth errors must not be retried (SPEC §1.4).
    retry: false,
    onSuccess: ({ session, profile }) => {
      setAuthenticated(session, profile);
      navigate(AREA_PATH[roleHome(profile.role, 'web')], { replace: true });
    },
    onError: (error) => {
      const now = Date.now();
      recordFailedAttempt(now);
      const throttled = evaluateLoginThrottle(useAuthStore.getState().failedAttempts, now);
      setErrorMessage(
        throttled.blocked
          ? MESSAGES.auth.tooManyAttempts
          : authErrorMessage(mapSupabaseAuthError(error as AuthErrorLike)),
      );
    },
  });

  const submit = (credentials: LoginCredentials): void => {
    setErrorMessage(null);
    const throttled = evaluateLoginThrottle(useAuthStore.getState().failedAttempts, Date.now());
    if (throttled.blocked) {
      setErrorMessage(MESSAGES.auth.tooManyAttempts);
      return;
    }
    mutation.mutate(credentials);
  };

  return { submit, isPending: mutation.isPending, errorMessage };
}
