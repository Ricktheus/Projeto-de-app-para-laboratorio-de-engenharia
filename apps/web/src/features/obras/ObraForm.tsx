import { obraSchema, type ObraInput } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { BigButton, LoadingButton, TextField } from '../../components/ui';
import { type ClienteRow } from '../clientes/clientes-service';

export type ObraFormValues = ObraInput;

export interface ObraFormProps {
  clientes: ClienteRow[];
  /** Prefilled values for edit mode. */
  initial?: Partial<ObraFormValues>;
  /** Lock the client selector (client is immutable when editing). */
  lockCliente?: boolean;
  submitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
  onSubmit: (values: ObraFormValues) => void;
  onCancel?: () => void;
}

/**
 * Create/edit form for an obra (F-S004-2/3). GPS is not captured on the web desk
 * tool (it is a field/mobile concern — US20-CA2); the fields stay optional.
 */
export function ObraForm({
  clientes,
  initial,
  lockCliente = false,
  submitting,
  submitLabel,
  errorMessage,
  onSubmit,
  onCancel,
}: ObraFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      clienteId: initial?.clienteId ?? '',
      nome: initial?.nome ?? '',
      sigla: initial?.sigla ?? '',
      endereco: initial?.endereco ?? '',
      contato: initial?.contato ?? '',
    },
  });

  return (
    <form className="surface flex flex-col gap-4 p-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-field font-medium text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="clienteId" className="text-[13px] font-medium text-concreto-600">
          Cliente
        </label>
        <select
          id="clienteId"
          disabled={submitting || lockCliente}
          aria-invalid={errors.clienteId ? true : undefined}
          className="control"
          {...register('clienteId')}
        >
          <option value="">Selecione um cliente…</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
        {errors.clienteId ? (
          <p className="text-[13px] font-medium text-danger">Selecione um cliente.</p>
        ) : null}
      </div>

      <TextField
        label="Nome da obra"
        disabled={submitting}
        error={errors.nome?.message}
        {...register('nome')}
      />
      <TextField
        label="Sigla"
        disabled={submitting}
        error={errors.sigla?.message}
        {...register('sigla')}
      />
      <TextField
        label="Endereço"
        disabled={submitting}
        error={errors.endereco?.message}
        {...register('endereco')}
      />
      <TextField
        label="Contato"
        disabled={submitting}
        error={errors.contato?.message}
        {...register('contato')}
      />

      <div className="mt-2 flex gap-2">
        <LoadingButton type="submit" loading={submitting} loadingLabel="Salvando...">
          {submitLabel}
        </LoadingButton>
        {onCancel ? (
          <BigButton type="button" variant="neutral" onClick={onCancel} disabled={submitting}>
            Cancelar
          </BigButton>
        ) : null}
      </div>
    </form>
  );
}
