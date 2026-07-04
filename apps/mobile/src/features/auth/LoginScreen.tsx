import { roleHome } from '@concreto/shared';
import { Redirect } from 'expo-router';

import { AREA_HREF } from '../../routes/area-hrefs';
import { useAuthStore } from '../../stores/auth-store';

import { LoginForm } from './LoginForm';
import { useLogin } from './useLogin';

/**
 * Login route content: wires {@link useLogin} into {@link LoginForm}. An already
 * authenticated user is redirected to their role home instead of the form.
 */
export function LoginScreen() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const { submit, isPending, errorMessage } = useLogin();

  if (status === 'authenticated' && profile) {
    return <Redirect href={AREA_HREF[roleHome(profile.role, 'mobile')]} />;
  }

  return <LoginForm onSubmit={submit} isPending={isPending} errorMessage={errorMessage} />;
}
