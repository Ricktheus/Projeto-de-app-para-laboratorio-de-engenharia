import { convidarClienteSchema, MESSAGES } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LoadingButton, TextField, useToast } from '../../components/ui';

import { useCriarCliente } from './useClientes';

/** Form fields = client invite payload without the discriminator `tipo`. */
const formSchema = convidarClienteSchema.omit({ tipo: true });
type FormValues = z.infer<typeof formSchema>;

/**
 * "Novo cliente" form (F-S004-1). Validates with the shared Zod schema (CNPJ
 * check digits ⇒ "CNPJ inválido."), owns the Loading state (submit disabled +
 * spinner, no double submit) and keeps the user's input on error. On success it
 * shows "Cliente cadastrado e convite enviado." and clears the form.
 */
export function NovoClienteForm() {
  const { show } = useToast();
  const { mutateAsync, isPending } = useCriarCliente();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', cnpj: '', email: '' },
  });

  async function onSubmit(values: FormValues) {
    setErrorMessage(null);
    try {
      await mutateAsync(values);
      show(MESSAGES.feature.clienteCriado, 'success');
      reset();
    } catch (error) {
      // Keeps the typed values; shows the exact PT message from the function.
      setErrorMessage(error instanceof Error ? error.message : MESSAGES.http.serverError);
    }
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-field font-semibold text-gray-900">Novo cliente</h3>

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
        label="CNPJ"
        placeholder="00.000.000/0000-00"
        disabled={isPending}
        error={errors.cnpj?.message}
        {...register('cnpj')}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="off"
        disabled={isPending}
        error={errors.email?.message}
        {...register('email')}
      />

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
