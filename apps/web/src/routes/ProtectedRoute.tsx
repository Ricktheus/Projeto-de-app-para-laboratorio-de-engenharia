import { canAccessArea, MESSAGES, roleHome, type NavArea } from '@concreto/shared';
import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';
import { useToastStore } from '../stores/toast-store';

import { AREA_PATH } from './area-paths';

/** Full-screen loader shown while the initial session bootstrap is pending. */
function AuthLoading() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="flex min-h-screen items-center justify-center text-gray-500"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand" />
    </div>
  );
}

/** Redirects to `to` while raising an error toast exactly once (route denial). */
function RedirectWithToast({ to, message }: { to: string; message: string }) {
  const show = useToastStore((s) => s.show);
  useEffect(() => {
    show(message, 'error');
  }, [show, message]);
  return <Navigate to={to} replace />;
}

export interface ProtectedRouteProps {
  area: NavArea;
  children: ReactNode;
}

/**
 * Guards a route by role (F-S003-2):
 * - initial bootstrap (`loading`) → loader (no premature redirect / flicker);
 * - no session (incl. deep link to a protected URL) → redirect to `/login`;
 * - authenticated but role not allowed for `area` → toast "Você não tem
 *   permissão para acessar esta página." + redirect to the role's home.
 */
export function ProtectedRoute({ area, children }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'loading') {
    return <AuthLoading />;
  }
  if (status === 'unauthenticated' || !profile) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessArea(profile.role, area)) {
    return (
      <RedirectWithToast
        to={AREA_PATH[roleHome(profile.role, 'web')]}
        message={MESSAGES.auth.forbiddenPage}
      />
    );
  }
  return <>{children}</>;
}
