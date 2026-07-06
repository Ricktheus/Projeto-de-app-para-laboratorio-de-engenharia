import { MESSAGES } from '@concreto/shared';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { BigButton, EmptyState, LoadingButton, StatusPill, useToast } from '../../components/ui';

import { LaudoDetalheView } from './LaudoDetalhe';
import { type LaudoRascunhoRow } from './laudos-service';
import {
  useAgruparLaudo,
  useEmitirParcial,
  useLaudoDetalhe,
  useLaudoRascunhos,
  useMarcarPronto,
} from './useLaudos';

/** Distinct obras present in the draft list, for the filter dropdown. */
function obraOptions(rascunhos: LaudoRascunhoRow[]): { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const laudo of rascunhos) {
    if (!byId.has(laudo.obra_id)) {
      byId.set(laudo.obra_id, laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra');
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

/**
 * Pre-filled reports workspace (F-S007-3 / US13). Lists the draft reports that
 * appear after the first valid rupture, filterable by obra / NF, and opens a
 * consolidated detail (per-age KGF/MPa/FCM + resistance curve). Supports the
 * on-demand partial emission, the optional grouping of several NFs of one obra,
 * and "marcar pronto para assinatura" (CPS_PENDENTES enforced server-side).
 */
export function LaudosPage() {
  const { show } = useToast();
  const { data: rascunhos, isLoading, isError, refetch } = useLaudoRascunhos();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [obraFilter, setObraFilter] = useState('');
  const [nfFilter, setNfFilter] = useState('');
  const [grouping, setGrouping] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);

  const detalhe = useLaudoDetalhe(selectedId);
  const marcarPronto = useMarcarPronto();
  const emitirParcial = useEmitirParcial();
  const agrupar = useAgruparLaudo();

  const lista = useMemo(() => rascunhos ?? [], [rascunhos]);
  const options = useMemo(() => obraOptions(lista), [lista]);
  const filtered = useMemo(
    () =>
      lista.filter(
        (laudo) =>
          (obraFilter === '' || laudo.obra_id === obraFilter) &&
          (nfFilter.trim() === '' ||
            laudo.nfs.some((nf) => nf.toLowerCase().includes(nfFilter.trim().toLowerCase()))),
      ),
    [lista, obraFilter, nfFilter],
  );

  // Grouping is over single-NF drafts of the SAME obra (US13-CA3).
  const selectedRows = lista.filter((l) => selectedForGroup.includes(l.id));
  const sameObra =
    selectedRows.length >= 2 && new Set(selectedRows.map((l) => l.obra_id)).size === 1;

  function toggleGroupSelection(id: string) {
    setSelectedForGroup((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleMarcarPronto() {
    if (!selectedId) {
      return;
    }
    try {
      await marcarPronto.mutateAsync(selectedId);
      show(MESSAGES.feature.laudoMarcadoPronto, 'success');
      setSelectedId(null);
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleEmitirParcial(concretagemId: string, idadeDias: number) {
    try {
      await emitirParcial.mutateAsync({ concretagemId, idadeDias });
      show(MESSAGES.feature.laudoParcialEmitido, 'success');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleAgrupar() {
    const concretagemIds = selectedRows.flatMap((l) => l.concretagem_ids);
    try {
      await agrupar.mutateAsync(concretagemIds);
      show(MESSAGES.feature.laudoAgrupado, 'success');
      setGrouping(false);
      setSelectedForGroup([]);
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  return (
    <AppShell title="Laudos">
      <ManagementNav />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-gray-600">Laudos pré-prontos, gerados após os rompimentos.</p>
        <BigButton
          variant="neutral"
          onClick={() => {
            setGrouping((v) => !v);
            setSelectedForGroup([]);
          }}
        >
          {grouping ? 'Cancelar agrupamento' : 'Agrupar laudos'}
        </BigButton>
      </div>

      {isLoading ? (
        <ul className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
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
          title={MESSAGES.feature.emptyLaudos}
          action={
            <BigButton variant="neutral" onClick={() => void refetch()}>
              Atualizar
            </BigButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Filters. */}
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Obra</span>
              <select
                value={obraFilter}
                onChange={(e) => setObraFilter(e.target.value)}
                className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
              >
                <option value="">Todas as obras</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">NF</span>
              <input
                value={nfFilter}
                onChange={(e) => setNfFilter(e.target.value)}
                placeholder="Filtrar por NF"
                className="min-h-touch rounded-xl border border-gray-300 bg-white px-4 text-field"
              />
            </label>
          </div>

          {grouping ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
              <span className="text-field text-blue-900">
                Selecione 2 ou mais laudos da mesma obra para consolidar.
              </span>
              <LoadingButton
                loading={agrupar.isPending}
                loadingLabel="Agrupando..."
                disabled={!sameObra}
                onClick={handleAgrupar}
              >
                Agrupar selecionados ({selectedForGroup.length})
              </LoadingButton>
            </div>
          ) : null}

          {/* Draft list. */}
          <ul className="flex flex-col gap-3">
            {filtered.map((laudo) => (
              <li
                key={laudo.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                {grouping ? (
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${laudo.numero}`}
                    checked={selectedForGroup.includes(laudo.id)}
                    onChange={() => toggleGroupSelection(laudo.id)}
                    className="h-6 w-6 accent-brand"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-field font-medium text-gray-900">{laudo.numero}</p>
                  <p className="truncate text-sm text-gray-500">
                    {laudo.obra_sigla ?? 'Obra'} · NF {laudo.nfs.join(', ') || '—'}
                  </p>
                </div>
                <StatusPill label="Rascunho" tone="warning" />
                {!grouping ? (
                  <BigButton
                    variant="neutral"
                    onClick={() => setSelectedId((cur) => (cur === laudo.id ? null : laudo.id))}
                  >
                    {selectedId === laudo.id ? 'Fechar' : 'Ver laudo'}
                  </BigButton>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Selected report detail. */}
          {selectedId && !grouping ? (
            detalhe.isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-gray-200" aria-hidden />
            ) : detalhe.isError || !detalhe.data ? (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-field text-danger">
                {MESSAGES.http.serverError}
              </div>
            ) : (
              <LaudoDetalheView
                detalhe={detalhe.data}
                onMarcarPronto={handleMarcarPronto}
                marcandoPronto={marcarPronto.isPending}
                onEmitirParcial={handleEmitirParcial}
                emitindoParcial={emitirParcial.isPending}
              />
            )
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
