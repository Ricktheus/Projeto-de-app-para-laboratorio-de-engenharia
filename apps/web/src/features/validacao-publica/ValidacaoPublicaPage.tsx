import {
  fckVerdict,
  FCK_VEREDITO_LABELS,
  formatMpaBr,
  formatNumberBr,
  MESSAGES,
  type FckVeredito,
  type ValidarLaudoResponse,
} from '@concreto/shared';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { BrandMark } from '../../components/BrandMark';
import { CheckCircle, Info, SealCheck, WarningCircle, XCircle } from '../../components/icons';
import { StatusPill } from '../../components/ui';

import { validarLaudoPublico, type ValidacaoResultado } from './validacao-service';

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

type Resultado = ValidarLaudoResponse['resultados'][number];

/**
 * Overall conclusion of the report versus its fck (QW-20): uses the result of the
 * HIGHEST age that has an fck to compare against — the measured strength at a
 * final age, or the 28d projection at an early age. `null` when no result has a
 * comparable fck. This is an INDICATIVE reading (not a formal NBR 12655
 * acceptance) shown so a fiscal/auditor gets the answer, not just the raw table.
 */
function conclusaoVeredito(
  resultados: readonly Resultado[],
): Exclude<FckVeredito, 'indeterminado'> | null {
  const comparaveis = resultados.filter((r) => r.fck_projeto != null);
  if (comparaveis.length === 0) {
    return null;
  }
  const alvo = comparaveis.reduce((a, b) => (b.idade_dias > a.idade_dias ? b : a));
  const { veredito } = fckVerdict({
    mpa: alvo.fcm_mpa,
    idadeDias: alvo.idade_dias,
    fckProjeto: alvo.fck_projeto,
  });
  return veredito === 'indeterminado' ? null : veredito;
}

/** Conclusion banner styling per verdict (status = icon + text, never colour only). */
const CONCLUSAO_STYLE: Record<
  Exclude<FckVeredito, 'indeterminado'>,
  { box: string; icon: React.ReactNode }
> = {
  conforme: {
    box: 'border-success/20 bg-success-soft text-success',
    icon: <CheckCircle size={20} weight="fill" />,
  },
  atencao: {
    box: 'border-warning/20 bg-warning-soft text-warning',
    icon: <Info size={20} weight="fill" />,
  },
  abaixo: {
    box: 'border-danger/20 bg-danger-soft text-danger',
    icon: <WarningCircle size={20} weight="fill" />,
  },
};

/** Standalone public shell (no app chrome / no sign-out — anonymous surface). */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-concreto-25">
      <div className="bg-grafite">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-20 pt-8">
          <BrandMark size="lg" tone="light" />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sinal-500">
              Verificação pública
            </p>
            <h1 className="mt-1 font-display text-[32px] font-semibold leading-tight text-white">
              Validação de Laudo
            </h1>
            <p className="text-concreto-300">Verificação pública de autenticidade</p>
          </div>
        </div>
        <div className="hazard h-1.5" aria-hidden />
      </div>
      <main className="mx-auto -mt-14 w-full max-w-2xl px-4 pb-12">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-10 text-center text-[12px] text-concreto-500">
        Os dados exibidos são lidos diretamente do registro do laboratório. Os resultados referem-se
        exclusivamente às amostras ensaiadas.
      </footer>
    </div>
  );
}

/** Green authenticity seal + the report's public data. */
function LaudoAutentico({ laudo }: { laudo: ValidarLaudoResponse }) {
  const conclusao = conclusaoVeredito(laudo.resultados);
  return (
    <section className="surface flex flex-col overflow-hidden shadow-raised">
      <div className="flex items-center gap-4 border-b border-concreto-100 px-6 py-5" role="status">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-success-soft text-success ring-4 ring-success/10"
        >
          <SealCheck size={32} weight="fill" />
        </span>
        <div>
          <p className="font-display text-[22px] font-semibold leading-tight text-success">
            {MESSAGES.feature.validacaoAutentico}
          </p>
          <p className="text-[13px] text-concreto-500">
            Registro conferido no sistema do laboratório.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        {conclusao ? (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${CONCLUSAO_STYLE[conclusao].box}`}
            role="status"
          >
            <span aria-hidden className="flex">
              {CONCLUSAO_STYLE[conclusao].icon}
            </span>
            <span className="text-field font-semibold">{FCK_VEREDITO_LABELS[conclusao]}</span>
          </div>
        ) : null}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Laudo nº" value={laudo.numero} mono />
          <Field label="Versão" value={String(laudo.versao)} />
          <Field label="Cliente" value={laudo.cliente ?? '—'} />
          <Field label="Obra" value={laudo.obra ?? '—'} />
          <Field label="Data de emissão" value={formatDate(laudo.data_emissao)} />
        </dl>

        <div>
          <h2 className="eyebrow mb-2">Resultados por idade</h2>
          {laudo.resultados.length === 0 ? (
            <p className="text-concreto-500">Sem resultados publicados para este laudo.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-concreto-100">
              <table className="w-full text-left">
                <thead className="bg-concreto-25">
                  <tr className="eyebrow">
                    <th className="px-4 py-2.5 font-semibold">Idade (dias)</th>
                    <th className="px-4 py-2.5 text-right font-semibold">FCM (MPa)</th>
                    <th className="px-4 py-2.5 text-right font-semibold">FCK projeto (MPa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-concreto-100">
                  {laudo.resultados.map((r) => (
                    <tr key={r.idade_dias}>
                      <td className="px-4 py-3">{r.idade_dias}</td>
                      <td className="px-4 py-3 text-right font-display text-[18px] font-semibold">
                        {formatMpaBr(r.fcm_mpa)}
                      </td>
                      <td className="px-4 py-3 text-right text-concreto-500">
                        {formatNumberBr(r.fck_projeto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!laudo.autentico ? (
          <p role="status" className="flex items-center gap-2">
            <StatusPill tone="warning" label={MESSAGES.feature.validacaoEmAtualizacao} />
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-0.5 text-[15px] text-grafite ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

/** Red banner for the not-found / not-authentic outcome (US19-CA3). */
function MensagemErro({ message }: { message: string }) {
  return (
    <section
      role="alert"
      className="surface flex flex-col items-center gap-3 p-10 text-center shadow-raised"
    >
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger"
      >
        <XCircle size={32} weight="fill" />
      </span>
      <p className="max-w-sm text-field font-semibold text-danger">{message}</p>
    </section>
  );
}

const ERRO_COPY: Record<Exclude<ValidacaoResultado['status'], 'encontrado'>, string> = {
  nao_encontrado: MESSAGES.feature.validacaoNaoAutentico,
  rate_limit: MESSAGES.http.rateLimit,
  erro: MESSAGES.http.serverError,
};

/**
 * Public validation page (F-S009-2 / US19). Reads the verification code from the
 * URL and shows the CURRENT version of the laudo without login. No app chrome,
 * no evidence photos — the anonymous, read-only anti-fraud surface.
 */
export function ValidacaoPublicaPage() {
  const { codigo } = useParams<{ codigo: string }>();

  const { data, isLoading } = useQuery<ValidacaoResultado>({
    queryKey: ['validacao-publica', codigo ?? ''],
    queryFn: () => validarLaudoPublico(codigo as string),
    enabled: Boolean(codigo),
    retry: false,
  });

  return (
    <PublicShell>
      {isLoading || !data ? (
        <div className="surface flex items-center justify-center gap-3 p-10 text-concreto-500 shadow-raised">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-concreto-200 border-t-grafite" />
          <span className="text-field">Validando laudo…</span>
        </div>
      ) : data.status === 'encontrado' ? (
        <LaudoAutentico laudo={data.laudo} />
      ) : (
        <MensagemErro message={ERRO_COPY[data.status]} />
      )}
    </PublicShell>
  );
}
