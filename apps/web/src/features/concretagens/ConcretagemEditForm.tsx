import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BigButton, LoadingButton, NumericInput, TextField } from '../../components/ui';

import { type ConcretagemPatch, type ConcretagemRow } from './concretagens-service';

/** Parses a decimal accepting both "." and "," as the separator. */
function parseDecimal(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

const requiredPositive = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      const n = parseDecimal(value);
      return value.length > 0 && Number.isFinite(n) && n > 0;
    }, message);

const optionalNonNegative = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value.length === 0) {
        return true;
      }
      const n = parseDecimal(value);
      return Number.isFinite(n) && n >= 0;
    }, message);

/**
 * Concretagem edit schema (F-S007-2). Every field is a string (the inputs are
 * text/decimal), so the resolver's input and output types match — the numeric
 * conversion happens in {@link toPatch} on submit. Domain rules stay permissive,
 * matching the create schema in `packages/shared` (out-of-range values are
 * non-blocking warnings, not validation errors).
 */
const concretagemEditSchema = z.object({
  fckProjeto: requiredPositive('Informe o FCK de projeto.'),
  volumeM3: requiredPositive('Informe o volume.'),
  concreteira: z.string().trim(),
  slumpProjetoMm: optionalNonNegative('Valor inválido.'),
  slumpToleranciaMm: optionalNonNegative('Valor inválido.'),
  slumpMedidoMm: optionalNonNegative('Valor inválido.'),
  quadra: z.string().trim(),
  lote: z.string().trim(),
  traco: z.string().trim(),
  placaCaminhao: z.string().trim(),
  lacreCaminhao: z.string().trim(),
  aditivo: z.string().trim(),
});

type ConcretagemEditValues = z.infer<typeof concretagemEditSchema>;

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalNumber(value: string): number | null {
  return value.trim().length === 0 ? null : parseDecimal(value);
}

function toPatch(values: ConcretagemEditValues): ConcretagemPatch {
  return {
    fck_projeto: parseDecimal(values.fckProjeto),
    volume_m3: parseDecimal(values.volumeM3),
    concreteira: optionalText(values.concreteira),
    slump_projeto: optionalNumber(values.slumpProjetoMm),
    slump_tolerancia: optionalNumber(values.slumpToleranciaMm),
    slump_medido: optionalNumber(values.slumpMedidoMm),
    quadra: optionalText(values.quadra),
    lote: optionalText(values.lote),
    traco: optionalText(values.traco),
    placa_caminhao: optionalText(values.placaCaminhao),
    lacre_caminhao: optionalText(values.lacreCaminhao),
    aditivo: optionalText(values.aditivo),
  };
}

function numberText(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

export interface ConcretagemEditFormProps {
  concretagem: ConcretagemRow;
  submitting: boolean;
  /** Server error to display (kept above the form; never clears the input). */
  errorMessage?: string | null;
  /** Optional CTA rendered inside the error banner (e.g. "Recarregar" on 409). */
  errorAction?: React.ReactNode;
  onSubmit: (patch: ConcretagemPatch) => void;
  onCancel: () => void;
}

/**
 * Inline editor for a concretagem's office fields (F-S007-2 / US12b). Numeric
 * measurements (fck, volume, slump) and the report numbering fields (quadra,
 * lote, traço, placa, lacre, aditivo). The obra, NF and molding basis are
 * immutable here. Owns the Loading UI-state via {@link LoadingButton} and never
 * discards typed input on error.
 */
export function ConcretagemEditForm({
  concretagem,
  submitting,
  errorMessage,
  errorAction,
  onSubmit,
  onCancel,
}: ConcretagemEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConcretagemEditValues>({
    resolver: zodResolver(concretagemEditSchema),
    defaultValues: {
      fckProjeto: numberText(concretagem.fck_projeto),
      volumeM3: numberText(concretagem.volume_m3),
      concreteira: concretagem.concreteira ?? '',
      slumpProjetoMm: numberText(concretagem.slump_projeto),
      slumpToleranciaMm: numberText(concretagem.slump_tolerancia),
      slumpMedidoMm: numberText(concretagem.slump_medido),
      quadra: concretagem.quadra ?? '',
      lote: concretagem.lote ?? '',
      traco: concretagem.traco ?? '',
      placaCaminhao: concretagem.placa_caminhao ?? '',
      lacreCaminhao: concretagem.lacre_caminhao ?? '',
      aditivo: concretagem.aditivo ?? '',
    },
  });

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6"
      onSubmit={handleSubmit((values) => onSubmit(toPatch(values)))}
      noValidate
    >
      {errorMessage ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg bg-red-50 px-4 py-3 text-field font-medium text-danger"
        >
          <span>{errorMessage}</span>
          {errorAction}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumericInput
          label="FCK de projeto (MPa)"
          suffix="MPa"
          disabled={submitting}
          error={errors.fckProjeto?.message}
          {...register('fckProjeto')}
        />
        <NumericInput
          label="Volume"
          suffix="m³"
          disabled={submitting}
          error={errors.volumeM3?.message}
          {...register('volumeM3')}
        />
        <TextField
          label="Concreteira"
          disabled={submitting}
          error={errors.concreteira?.message}
          {...register('concreteira')}
        />
        <NumericInput
          label="Slump de projeto (mm)"
          suffix="mm"
          disabled={submitting}
          error={errors.slumpProjetoMm?.message}
          {...register('slumpProjetoMm')}
        />
        <NumericInput
          label="Tolerância de slump (mm)"
          suffix="mm"
          disabled={submitting}
          error={errors.slumpToleranciaMm?.message}
          {...register('slumpToleranciaMm')}
        />
        <NumericInput
          label="Slump medido (mm)"
          suffix="mm"
          disabled={submitting}
          error={errors.slumpMedidoMm?.message}
          {...register('slumpMedidoMm')}
        />
        <TextField
          label="Quadra"
          disabled={submitting}
          error={errors.quadra?.message}
          {...register('quadra')}
        />
        <TextField label="Lote" disabled={submitting} error={errors.lote?.message} {...register('lote')} />
        <TextField
          label="Traço"
          disabled={submitting}
          error={errors.traco?.message}
          {...register('traco')}
        />
        <TextField
          label="Placa do caminhão"
          disabled={submitting}
          error={errors.placaCaminhao?.message}
          {...register('placaCaminhao')}
        />
        <TextField
          label="Lacre do caminhão"
          disabled={submitting}
          error={errors.lacreCaminhao?.message}
          {...register('lacreCaminhao')}
        />
        <TextField
          label="Aditivo"
          disabled={submitting}
          error={errors.aditivo?.message}
          {...register('aditivo')}
        />
      </div>

      <div className="mt-2 flex gap-2">
        <LoadingButton type="submit" loading={submitting} loadingLabel="Salvando...">
          Salvar alterações
        </LoadingButton>
        <BigButton type="button" variant="neutral" onClick={onCancel} disabled={submitting}>
          Cancelar
        </BigButton>
      </div>
    </form>
  );
}
