import { roleHome } from '@concreto/shared';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

import { AREA_PATH } from './area-paths';

/**
 * Index route (`/`): sends the user to the home of their role, or to `/login`
 * when there is no session. Waits out the initial bootstrap to avoid a flicker.
 */
export function RoleHomeRedirect() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'loading') {
    return null;
  }
  if (status === 'unauthenticated' || !profile) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={AREA_PATH[roleHome(profile.role, 'web')]} replace />;
}
