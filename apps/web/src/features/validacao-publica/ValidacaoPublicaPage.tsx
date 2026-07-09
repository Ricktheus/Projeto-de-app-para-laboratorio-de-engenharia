import {
  fckVerdict,
  FCK_VEREDITO_LABELS,
  MESSAGES,
  type FckVeredito,
  type ValidarLaudoResponse,
} from '@concreto/shared';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { BrandMark } from '../../components/BrandMark';

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

/** Conclusion banner styling per verdict. */
const CONCLUSAO_STYLE: Record<
  Exclude<FckVeredito, 'indeterminado'>,
  { bg: string; text: string; icon: string }
> = {
  conforme: { bg: 'bg-green-50', text: 'text-success', icon: '✓' },
  atencao: { bg: 'bg-amber-50', text: 'text-amber-700', icon: '!' },
  abaixo: { bg: 'bg-red-50', text: 'text-danger', icon: '✕' },
};

/** Standalone public shell (no app chrome / no sign-out — anonymous surface). */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-10">
      <header className="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark size="lg" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Validação de Laudo</h1>
          <p className="text-sm text-gray-500">Verificação pública de autenticidade</p>
        </div>
      </header>
      <main className="w-full max-w-xl">{children}</main>
    </div>
  );
}

/** Green authenticity banner + the report's public data. */
function LaudoAutentico({ laudo }: { laudo: ValidarLaudoResponse }) {
  const conclusao = conclusaoVeredito(laudo.resultados);
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6">
      <div
        className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-success"
        role="status"
      >
        <span aria-hidden className="text-2xl">
          ✓
        </span>
        <span className="text-field font-semibold">{MESSAGES.feature.validacaoAutentico}</span>
      </div>

      {conclusao ? (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 ${CONCLUSAO_STYLE[conclusao].bg} ${CONCLUSAO_STYLE[conclusao].text}`}
          role="status"
        >
          <span aria-hidden className="text-xl font-bold">
            {CONCLUSAO_STYLE[conclusao].icon}
          </span>
          <span className="text-field font-semibold">{FCK_VEREDITO_LABELS[conclusao]}</span>
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Laudo nº" value={laudo.numero} />
        <Field label="Versão" value={String(laudo.versao)} />
        <Field label="Cliente" value={laudo.cliente ?? '—'} />
        <Field label="Obra" value={laudo.obra ?? '—'} />
        <Field label="Data de emissão" value={formatDate(laudo.data_emissao)} />
      </dl>

      <div>
        <h2 className="mb-2 text-field font-semibold text-gray-800">Resultados por idade</h2>
        {laudo.resultados.length === 0 ? (
          <p className="text-sm text-gray-500">Sem resultados publicados para este laudo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-medium">Idade (dias)</th>
                  <th className="px-3 py-2 font-medium">FCM (MPa)</th>
                  <th className="px-3 py-2 font-medium">FCK projeto (MPa)</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {laudo.resultados.map((r) => (
                  <tr key={r.idade_dias} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{r.idade_dias}</td>
                    <td className="px-3 py-2 text-gray-900">{r.fcm_mpa}</td>
                    <td className="px-3 py-2 text-gray-500">{r.fck_projeto ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!laudo.autentico ? (
        <p
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-field font-medium text-amber-700"
        >
          {MESSAGES.feature.validacaoEmAtualizacao}
        </p>
      ) : null}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-field text-gray-900">{value}</dd>
    </div>
  );
}

/** Red banner for the not-found / not-authentic outcome (US19-CA3). */
function MensagemErro({ message }: { message: string }) {
  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-2 rounded-2xl border border-red-200 bg-white p-8 text-center"
    >
      <span aria-hidden className="text-3xl">
        ⚠️
      </span>
      <p className="text-field font-semibold text-danger">{message}</p>
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
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-10 text-gray-500">
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-brand" />
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
