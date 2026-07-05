import { convidarUsuarioInternoSchema, type InternalRole, MESSAGES } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LoadingButton, TextField, useToast } from '../../components/ui';

import { useCriarUsuario } from './useUsuarios';

const formSchema = convidarUsuarioInternoSchema.omit({ tipo: true });
type FormValues = z.infer<typeof formSchema>;

/** Human labels for the internal roles (UI in Portuguese). */
const ROLE_OPTIONS: ReadonlyArray<{ value: InternalRole; label: string }> = [
  { value: 'socio_campo', label: 'Sócio de Campo' },
  { value: 'eng_lab', label: 'Engenharia (Laboratório)' },
  { value: 'eng_escritorio', label: 'Engenharia (Escritório)' },
];

/**
 * "Novo usuário interno" form (F-S004-1). Same guarantees as the client form:
 * shared Zod validation, Loading state, input preserved on error, exact copy on
 * success ("Usuário cadastrado e convite enviado.").
 */
export function NovoUsuarioForm() {
  const { show } = useToast();
  const { mutateAsync, isPending } = useCriarUsuario();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '', role: 'socio_campo', isAdmin: false },
  });

  async function onSubmit(values: FormValues) {
    setErrorMessage(null);
    try {
      await mutateAsync(values);
      show(MESSAGES.feature.usuarioCriado, 'success');
      reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : MESSAGES.http.serverError);
    }
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-field font-semibold text-gray-900">Novo usuário</h3>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-field font-medium text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <TextField
        label="Nome"
        autoComplete="off"
        disabled={isPending}
        error={errors.nome?.message}
        {...register('nome')}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="off"
        disabled={isPending}
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-field font-medium text-gray-800">
          Papel
        </label>
        <select
          id="role"
          disabled={isPending}
          className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field focus:outline focus:outline-2 focus:outline-brand disabled:bg-gray-100"
          {...register('role')}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-3 text-field text-gray-800">
        <input
          type="checkbox"
          disabled={isPending}
          className="h-6 w-6 rounded border-gray-300"
          {...register('isAdmin')}
        />
        Administrador (gestão de usuários)
      </label>

      <LoadingButton
        type="submit"
        loading={isPending}
        loadingLabel="Cadastrando..."
        className="mt-2"
      >
        Cadastrar e enviar convite
      </LoadingButton>
    </form>
  );
}
