import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { BrandMark } from '../../components/BrandMark';
import { LoadingButton } from '../../components/ui';
import { useToastStore } from '../../stores/toast-store';

import { establishRecoverySession, requestPasswordReset, updatePassword } from './reset-service';

const inputClass =
  'min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field focus:outline focus:outline-2 focus:outline-brand disabled:bg-gray-100';

type Phase = 'checking' | 'request' | 'set' | 'invalid';

// ---------------------------------------------------------------- request link
const requestSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
});
type RequestValues = z.infer<typeof requestSchema>;

function RequestResetForm() {
  const showToast = useToastStore((s) => s.show);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: RequestValues): Promise<void> => {
    await requestPasswordReset(email);
    // Never reveal whether the address exists (US17-CA2): same message always.
    setSent(true);
    showToast('Se existir uma conta com este e-mail, enviamos um link de redefinição.', 'success');
  };

  if (sent) {
    return (
      <p className="text-center text-field text-gray-700">
        Se existir uma conta com este e-mail, você receberá um link para redefinir a senha. Verifique
        a caixa de entrada e o spam.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-field font-medium text-gray-800">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={errors.email ? true : undefined}
          className={inputClass}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm font-medium text-danger">{errors.email.message}</p>
        ) : null}
      </div>
      <LoadingButton type="submit" fullWidth loading={isSubmitting} loadingLabel="Enviando...">
        Enviar link de redefinição
      </LoadingButton>
    </form>
  );
}

// ------------------------------------------------------------- set new password
const setSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
    confirm: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem.',
  });
type SetValues = z.infer<typeof setSchema>;

function SetPasswordForm() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetValues>({
    resolver: zodResolver(setSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async ({ password }: SetValues): Promise<void> => {
    try {
      await updatePassword(password);
    } catch {
      showToast(
        'Não foi possível alterar a senha. O link pode ter expirado — solicite um novo.',
        'error',
      );
      return;
    }
    showToast('Senha alterada com sucesso. Entre com a nova senha.', 'success');
    navigate('/login', { replace: true });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-field font-medium text-gray-800">
          Nova senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={errors.password ? true : undefined}
          className={inputClass}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm font-medium text-danger">{errors.password.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-field font-medium text-gray-800">
          Confirmar nova senha
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={errors.confirm ? true : undefined}
          className={inputClass}
          {...register('confirm')}
        />
        {errors.confirm ? (
          <p className="text-sm font-medium text-danger">{errors.confirm.message}</p>
        ) : null}
      </div>
      <LoadingButton type="submit" fullWidth loading={isSubmitting} loadingLabel="Salvando...">
        Salvar nova senha
      </LoadingButton>
    </form>
  );
}

/**
 * Password reset (F-S003-1 companion). One route, two modes:
 * - a recovery token in the URL hash ⇒ "set a new password" form;
 * - otherwise ⇒ "request a reset link" form.
 * The token is captured and stripped from the address bar on mount; the
 * `initRef` guard keeps that one-shot even under React StrictMode's double-invoke.
 */
export function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>('checking');
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    const hash = window.location.hash;
    // Strip the recovery token from the address bar / history immediately.
    if (hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    void establishRecoverySession(hash).then((result) => {
      setPhase(result === 'ready' ? 'set' : result === 'error' ? 'invalid' : 'request');
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark size="lg" />
          <p className="text-gray-500">
            {phase === 'set' ? 'Defina sua nova senha.' : 'Redefinição de senha.'}
          </p>
        </header>

        {phase === 'checking' ? (
          <p className="text-center text-field text-gray-500">Verificando o link...</p>
        ) : null}

        {phase === 'request' ? <RequestResetForm /> : null}
        {phase === 'set' ? <SetPasswordForm /> : null}

        {phase === 'invalid' ? (
          <div className="flex flex-col gap-4">
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-field font-medium text-danger"
            >
              O link de redefinição é inválido ou expirou. Solicite um novo.
            </div>
            <button
              type="button"
              onClick={() => setPhase('request')}
              className="text-field font-medium text-brand hover:underline"
            >
              Solicitar novo link
            </button>
          </div>
        ) : null}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-field font-medium text-brand hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
