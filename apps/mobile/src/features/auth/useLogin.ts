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
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AREA_HREF } from '../../routes/area-hrefs';
import { useAuthStore } from '../../stores/auth-store';

import { signInWithCredentials } from './auth-service';

/**
 * Orchestrates the login use case (F-S003-1): client-side throttle → Supabase
 * sign-in → profile fetch → session store → role-based redirect. All copy comes
 * from the shared PT catalog; raw provider errors are never surfaced.
 */
export function useLogin() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const recordFailedAttempt = useAuthStore((s) => s.recordFailedAttempt);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: signInWithCredentials,
    retry: false,
    onSuccess: ({ session, profile }) => {
      setAuthenticated(session, profile);
      router.replace(AREA_HREF[roleHome(profile.role, 'mobile')]);
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
