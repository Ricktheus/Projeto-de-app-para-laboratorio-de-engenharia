import { type CpStatus, type LaudoTipo } from '@concreto/shared';

import { BigButton, LoadingButton, StatusPill } from '../../components/ui';

import { ResistenciaChart } from './ResistenciaChart';
import { type LaudoDetalhe as LaudoDetalheData } from './laudos-service';

const LAUDO_TIPO_LABELS: Readonly<Record<LaudoTipo, string>> = {
  parcial_7d: 'Parcial 7 dias',
  parcial_14d: 'Parcial 14 dias',
  final_28d: 'Final (28 dias)',
};

const CP_STATUS_LABELS: Readonly<Record<CpStatus, string>> = {
  moldado: 'Moldado',
  coletado: 'Coletado',
  rompido: 'Rompido',
  descartado: 'Descartado',
  expurgado: 'Expurgado',
};

/** The partial ages a report can be emitted for on demand (US13-CA2). */
const PARTIAL_AGES = [7, 14] as const;

export interface LaudoDetalheViewProps {
  detalhe: LaudoDetalheData;
  onMarcarPronto: () => void;
  marcandoPronto: boolean;
  onEmitirParcial: (concretagemId: string, idadeDias: number) => void;
  emitindoParcial: boolean;
}

/**
 * Read-only, pre-filled view of a report draft (F-S007-3 / US13): client/obra +
 * NF header, per-age KGF/MPa/FCM table and the resistance curve. Offers the
 * on-demand partial emission (single-NF finals) and "marcar pronto para
 * assinatura" — whose CPS_PENDENTES guard is enforced server-side.
 */
export function LaudoDetalheView({
  detalhe,
  onMarcarPronto,
  marcandoPronto,
  onEmitirParcial,
  emitindoParcial,
}: LaudoDetalheViewProps) {
  const singleConcretagem =
    detalhe.concretagens.length === 1 ? detalhe.concretagens[0]! : null;
  const idadesComResultado = new Set(
    detalhe.consolidado.idades.filter((i) => i.fcm !== null).map((i) => i.idadeAlvoDias),
  );
  const podeParcial = detalhe.tipo_laudo === 'final_28d' && singleConcretagem !== null;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{detalhe.numero}</h2>
          <StatusPill label={LAUDO_TIPO_LABELS[detalhe.tipo_laudo]} tone="info" />
          <StatusPill label="Rascunho" tone="warning" />
        </div>
        <p className="text-field text-gray-700">
          {detalhe.obra_sigla ?? 'Obra'} · {detalhe.obra_nome ?? '—'}
        </p>
        <p className="text-sm text-gray-500">
          {detalhe.cliente_nome ?? 'Cliente'} · NF {detalhe.concretagens.map((c) => c.nf_numero).join(', ') || '—'}
        </p>
      </header>

      {/* Per-age results (KGF/MPa/FCM). */}
      <div className="flex flex-col gap-4">
        {detalhe.consolidado.idades.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não há corpos de prova para este laudo.</p>
        ) : (
          detalhe.consolidado.idades.map((idade) => (
            <div key={idade.idadeAlvoDias} className="rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                <span className="text-field font-semibold text-gray-800">
                  Idade: {idade.idadeAlvoDias} dias
                </span>
                {idade.expurgada ? (
                  <StatusPill label="Idade expurgada — sem resultado" tone="danger" />
                ) : idade.pendente ? (
                  <StatusPill label="CPs pendentes" tone="warning" />
                ) : (
                  <StatusPill label={`FCM ${idade.fcm} MPa`} tone="success" />
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2 font-medium">CP</th>
                      <th className="px-4 py-2 font-medium">KGF</th>
                      <th className="px-4 py-2 font-medium">MPa</th>
                      <th className="px-4 py-2 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {idade.cps.map((cp) => (
                      <tr key={cp.codigoRastreio} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{cp.codigoRastreio}</td>
                        <td className="px-4 py-2 text-gray-900">
                          {cp.status === 'rompido' ? (cp.cargaRupturaKgf ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {cp.status === 'rompido' ? (cp.mpaCalculado ?? '—') : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{CP_STATUS_LABELS[cp.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resistance curve + fck reference line. */}
      <div>
        <h3 className="mb-2 text-field font-semibold text-gray-800">Curva de resistência</h3>
        <ResistenciaChart curva={detalhe.consolidado.curva} fckProjeto={detalhe.fckProjeto} />
      </div>

      {/* Actions. */}
      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        {podeParcial
          ? PARTIAL_AGES.filter((age) => idadesComResultado.has(age)).map((age) => (
              <BigButton
                key={age}
                variant="neutral"
                disabled={emitindoParcial}
                onClick={() => onEmitirParcial(singleConcretagem!.id, age)}
              >
                Emitir parcial {age}d
              </BigButton>
            ))
          : null}
        <LoadingButton
          loading={marcandoPronto}
          loadingLabel="Marcando..."
          onClick={onMarcarPronto}
        >
          Marcar pronto para assinatura
        </LoadingButton>
      </div>
    </section>
  );
}
