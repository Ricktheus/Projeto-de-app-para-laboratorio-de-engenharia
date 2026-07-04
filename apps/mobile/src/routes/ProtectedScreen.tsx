import { canAccessArea, MESSAGES, roleHome, type NavArea } from '@concreto/shared';
import { Redirect } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../stores/auth-store';
import { useToastStore } from '../stores/toast-store';

import { AREA_HREF } from './area-hrefs';

/** Redirects while raising an error toast exactly once (route denial). */
function RedirectWithToast({ href, message }: { href: string; message: string }) {
  const show = useToastStore((s) => s.show);
  useEffect(() => {
    show(message, 'error');
  }, [show, message]);
  return <Redirect href={href} />;
}

export interface ProtectedScreenProps {
  area: NavArea;
  children: ReactNode;
}

/**
 * Guards a screen by role (F-S003-2):
 * - initial bootstrap (`loading`) → spinner (no premature redirect);
 * - no session (incl. deep link to a protected route) → redirect to `/login`;
 * - authenticated but role not allowed for `area` → toast "Você não tem
 *   permissão para acessar esta página." + redirect to the role's home.
 */
export function ProtectedScreen({ area, children }: ProtectedScreenProps) {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator accessibilityLabel="Carregando" />
      </View>
    );
  }
  if (status === 'unauthenticated' || !profile) {
    return <Redirect href="/login" />;
  }
  if (!canAccessArea(profile.role, area)) {
    return (
      <RedirectWithToast
        href={AREA_HREF[roleHome(profile.role, 'mobile')]}
        message={MESSAGES.auth.forbiddenPage}
      />
    );
  }
  return <>{children}</>;
}
