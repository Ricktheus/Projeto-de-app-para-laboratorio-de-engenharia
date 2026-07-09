import { loginCredentialsSchema, roleHome, type LoginCredentials } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';

import { BrandMark } from '../../components/BrandMark';
import { LoadingButton } from '../../components/ui';
import { AREA_PATH } from '../../routes/area-paths';
import { useAuthStore } from '../../stores/auth-store';

import { useLogin } from './useLogin';

/**
 * Login screen (F-S003-1). Validates with the shared Zod schema, submits via
 * {@link useLogin}, and owns the Loading UI-state (button disabled + spinner,
 * inputs locked). A user who is already authenticated is redirected to their
 * role home instead of seeing the form again.
 */
export function LoginPage() {
  const profile = useAuthStore((s) => s.profile);
  const status = useAuthStore((s) => s.status);
  const { submit, isPending, errorMessage } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated' && profile) {
    return <Navigate to={AREA_PATH[roleHome(profile.role, 'web')]} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark size="lg" />
          <p className="text-gray-500">Entre com suas credenciais.</p>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-field font-medium text-danger"
          >
            {errorMessage}
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-field font-medium text-gray-800">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              aria-invalid={errors.email ? true : undefined}
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field focus:outline focus:outline-2 focus:outline-brand disabled:bg-gray-100"
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-sm font-medium text-danger">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-field font-medium text-gray-800">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              aria-invalid={errors.password ? true : undefined}
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field focus:outline focus:outline-2 focus:outline-brand disabled:bg-gray-100"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm font-medium text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          <LoadingButton
            type="submit"
            fullWidth
            loading={isPending}
            loadingLabel="Entrando..."
            className="mt-2"
          >
            Entrar
          </LoadingButton>
        </form>
      </div>
    </main>
  );
}
