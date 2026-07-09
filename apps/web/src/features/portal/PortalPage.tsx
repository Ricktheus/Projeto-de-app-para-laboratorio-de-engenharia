import { MESSAGES, type LaudoTipo } from '@concreto/shared';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { BigButton, EmptyState, LoadingButton, StatusPill, useToast } from '../../components/ui';

import { type PortalLaudoRow } from './portal-service';
import { usePortalLaudos, useBaixarLaudoAssinado } from './usePortal';

const LAUDO_TIPO_LABELS: Readonly<Record<LaudoTipo, string>> = {
  parcial_7d: 'Parcial 7 dias',
  parcial_14d: 'Parcial 14 dias',
  final_28d: 'Final (28 dias)',
};

/** Distinct obras present in the report list, for the obra filter (US18-CA2). */
function obraOptions(laudos: PortalLaudoRow[]): { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const laudo of laudos) {
    if (!byId.has(laudo.obra_id)) {
      byId.set(laudo.obra_id, laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra');
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [year, month, day] = iso.split('-');
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

/**
 * Client portal (F-S009-1 / US18). Lists ONLY the client's signed reports
 * (enforced by RLS), filterable by obra, each downloadable as its signed PDF.
 * Loading (skeleton), Error (retry) and Empty (SPEC copy) states are all handled.
 */
export function PortalPage() {
  const { show } = useToast();
  const { data: laudos, isLoading, isError, refetch } = usePortalLaudos();
  const baixar = useBaixarLaudoAssinado();
  const [obraFilter, setObraFilter] = useState('');
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const lista = useMemo(() => laudos ?? [], [laudos]);
  const options = useMemo(() => obraOptions(lista), [lista]);
  const filtered = useMemo(
    () => lista.filter((laudo) => obraFilter === '' || laudo.obra_id === obraFilter),
    [lista, obraFilter],
  );

  async function handleBaixar(laudoId: string) {
    setBaixandoId(laudoId);
    try {
      const url = await baixar.mutateAsync(laudoId);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    } finally {
      setBaixandoId(null);
    }
  }

  return (
    <AppShell title="Portal do Cliente">
      {isLoading ? (
        <ul className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </ul>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-field text-danger"
        >
          <span className="font-medium">{MESSAGES.http.serverError}</span>
          <BigButton variant="neutral" onClick={() => void refetch()}>
            {MESSAGES.feature.painelTentarNovamente}
          </BigButton>
        </div>
      ) : lista.length === 0 ? (
        <EmptyState
          icon="📄"
          title={MESSAGES.feature.emptyPortalLaudos}
          action={
            <BigButton variant="neutral" onClick={() => void refetch()}>
              Atualizar
            </BigButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <label className="flex max-w-xs flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Obra</span>
            <select
              value={obraFilter}
              onChange={(e) => setObraFilter(e.target.value)}
              className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
            >
              <option value="">{MESSAGES.feature.portalTodasObras}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <ul className="flex flex-col gap-3">
            {filtered.map((laudo) => (
              <li
                key={laudo.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-field font-medium text-gray-900">{laudo.numero}</p>
                  <p className="truncate text-sm text-gray-500">
                    {laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra'} · Emitido em{' '}
                    {formatDate(laudo.data_emissao)}
                  </p>
                </div>
                <StatusPill label={LAUDO_TIPO_LABELS[laudo.tipo_laudo]} tone="info" />
                {laudo.versao > 1 ? (
                  <StatusPill label={`Versão ${laudo.versao}`} tone="info" />
                ) : null}
                {laudo.codigo_verificacao ? (
                  <a
                    href={`/validar/${laudo.codigo_verificacao}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-touch inline-flex items-center rounded-xl border border-gray-300 px-4 text-field font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {MESSAGES.feature.portalValidarAutenticidade}
                  </a>
                ) : null}
                <LoadingButton
                  loading={baixandoId === laudo.id}
                  loadingLabel={MESSAGES.feature.laudoBaixandoPdf}
                  onClick={() => handleBaixar(laudo.id)}
                >
                  {MESSAGES.feature.portalBaixarLaudo}
                </LoadingButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
