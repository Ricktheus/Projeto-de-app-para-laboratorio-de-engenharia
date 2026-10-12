import { loginCredentialsSchema, roleHome, type LoginCredentials } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';

import { LoadingButton } from '../../components/ui';
import { AREA_PATH } from '../../routes/area-paths';
import { useAuthStore } from '../../stores/auth-store';

import { AuthLayout } from './AuthLayout';
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
    <AuthLayout title="Acesse o Rastro" subtitle="Entre com suas credenciais.">
      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-field font-medium text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[13px] font-medium text-concreto-600">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            disabled={isPending}
            aria-invalid={errors.email ? true : undefined}
            className="control h-11"
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-[13px] font-medium text-danger">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-[13px] font-medium text-concreto-600">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isPending}
            aria-invalid={errors.password ? true : undefined}
            className="control h-11"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-[13px] font-medium text-danger">{errors.password.message}</p>
          ) : null}
        </div>

        <LoadingButton
          type="submit"
          size="lg"
          fullWidth
          loading={isPending}
          loadingLabel="Entrando..."
          className="mt-2"
        >
          Entrar
        </LoadingButton>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/reset-password"
          className="text-field font-medium text-cobalto-600 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
    </AuthLayout>
  );
}
