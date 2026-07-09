import { MESSAGES, type LaudoStatus } from '@concreto/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { BigButton, EmptyState, LoadingButton, StatusPill, useToast } from '../../components/ui';

import { LaudoDetalheView } from './LaudoDetalhe';
import { type LaudoListRow } from './laudos-service';
import {
  useAgruparLaudo,
  useBaixarPdf,
  useCorrigirLaudo,
  useDefinirNumero,
  useEmitirParcial,
  useGerarPdf,
  useLaudoDetalhe,
  useLaudos,
  useMarcarPronto,
  useUploadAssinado,
} from './useLaudos';

const STATUS_PILL: Readonly<
  Record<LaudoStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'danger' }>
> = {
  rascunho: { label: 'Rascunho', tone: 'warning' },
  pronto_assinatura: { label: 'Pronto p/ assinatura', tone: 'info' },
  assinado: { label: 'Assinado', tone: 'success' },
  substituido: { label: 'Substituído', tone: 'danger' },
};

/** A status filter chip: a status subset + its human label. */
type StatusFilter = 'todos' | LaudoStatus;
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pronto_assinatura', label: 'Aguardando assinatura' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'assinado', label: 'Assinado' },
];

/** Distinct obras present in the report list, for the filter dropdown. */
function obraOptions(laudos: LaudoListRow[]): { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const laudo of laudos) {
    if (!byId.has(laudo.obra_id)) {
      byId.set(laudo.obra_id, laudo.obra_sigla ?? laudo.obra_nome ?? 'Obra');
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

/**
 * Reports workspace (F-S007-3 / US13 + S008). Lists the active reports (rascunho
 * / pronto / assinado), filterable by obra / NF, and opens a consolidated detail
 * with the STATUS-AWARE actions: draft (emitir parcial, marcar pronto), pronto
 * (gerar PDF, baixar, enviar assinado) and assinado (baixar, corrigir).
 */
export function LaudosPage() {
  const { show } = useToast();
  const { data: laudos, isLoading, isError, refetch } = useLaudos();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [obraFilter, setObraFilter] = useState('');
  const [nfFilter, setNfFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [grouping, setGrouping] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const detalheRef = useRef<HTMLDivElement>(null);

  const detalhe = useLaudoDetalhe(selectedId);
  const definirNumero = useDefinirNumero();
  const marcarPronto = useMarcarPronto();
  const emitirParcial = useEmitirParcial();
  const agrupar = useAgruparLaudo();
  const gerarPdf = useGerarPdf();
  const baixarPdf = useBaixarPdf();
  const uploadAssinado = useUploadAssinado();
  const corrigir = useCorrigirLaudo();

  const lista = useMemo(() => laudos ?? [], [laudos]);
  const options = useMemo(() => obraOptions(lista), [lista]);
  const aguardandoAssinatura = useMemo(
    () => lista.filter((l) => l.status === 'pronto_assinatura').length,
    [lista],
  );
  const filtered = useMemo(
    () =>
      lista.filter(
        (laudo) =>
          (statusFilter === 'todos' || laudo.status === statusFilter) &&
          (obraFilter === '' || laudo.obra_id === obraFilter) &&
          (nfFilter.trim() === '' ||
            laudo.nfs.some((nf) => nf.toLowerCase().includes(nfFilter.trim().toLowerCase()))),
      ),
    [lista, statusFilter, obraFilter, nfFilter],
  );

  // QW-16: bring the detail into view when a report is opened (it renders below
  // a potentially long list, where the click can otherwise look like a no-op).
  useEffect(() => {
    if (selectedId && !grouping && typeof detalheRef.current?.scrollIntoView === 'function') {
      detalheRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId, grouping]);

  // Grouping is over single-NF DRAFTS of the SAME obra (US13-CA3).
  const selectedRows = lista.filter((l) => selectedForGroup.includes(l.id));
  const sameObra =
    selectedRows.length >= 2 && new Set(selectedRows.map((l) => l.obra_id)).size === 1;

  function toggleGroupSelection(id: string) {
    setSelectedForGroup((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleDefinirNumero(numero: string) {
    if (!selectedId) {
      return;
    }
    try {
      await definirNumero.mutateAsync({ laudoId: selectedId, numero });
      show(MESSAGES.feature.laudoNumeroDefinido, 'success');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleMarcarPronto() {
    if (!selectedId) {
      return;
    }
    try {
      await marcarPronto.mutateAsync(selectedId);
      show(MESSAGES.feature.laudoMarcadoPronto, 'success');
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

  async function handleGerarPdf() {
    if (!selectedId) {
      return;
    }
    try {
      await gerarPdf.mutateAsync(selectedId);
      show(MESSAGES.feature.laudoPdfGerado, 'success');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleBaixarPdf() {
    const path = detalhe.data?.pdf_original_url;
    if (!path) {
      return;
    }
    try {
      const url = await baixarPdf.mutateAsync(path);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleUploadAssinado(pdf: File, elaborador: File | null) {
    if (!selectedId) {
      return;
    }
    try {
      await uploadAssinado.mutateAsync({ laudoId: selectedId, pdf, elaborador });
      show(MESSAGES.feature.laudoAssinadoPublicado, 'success');
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleCorrigir() {
    if (!selectedId) {
      return;
    }
    try {
      await corrigir.mutateAsync(selectedId);
      show(MESSAGES.feature.laudoCorrigido, 'success');
      setSelectedId(null);
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
        <p className="text-gray-600">Laudos pré-prontos, geração de PDF, assinatura e correção.</p>
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
          {/* QW-13: the signature queue — the costliest pending state — surfaced. */}
          {aguardandoAssinatura > 0 ? (
            <button
              type="button"
              onClick={() => setStatusFilter('pronto_assinatura')}
              className="flex items-center gap-3 self-start rounded-xl bg-blue-50 px-4 py-3 text-left hover:bg-blue-100"
            >
              <span className="text-2xl font-bold tabular-nums text-brand">
                {aguardandoAssinatura}
              </span>
              <span className="text-field font-medium text-blue-900">
                laudo(s) aguardando assinatura — clique para filtrar
              </span>
            </button>
          ) : null}

          {/* QW-13: status chips. */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
            {STATUS_FILTERS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                aria-pressed={statusFilter === chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={[
                  'min-h-touch rounded-xl px-4 text-field font-medium',
                  statusFilter === chip.value
                    ? 'bg-brand text-brand-fg'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {chip.label}
              </button>
            ))}
          </div>

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
                Selecione 2 ou mais rascunhos da mesma obra para consolidar.
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

          {/* Report list. */}
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
                    disabled={laudo.status !== 'rascunho'}
                    onChange={() => toggleGroupSelection(laudo.id)}
                    className="h-6 w-6 accent-brand disabled:opacity-40"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-field font-medium text-gray-900">{laudo.numero}</p>
                  <p className="truncate text-sm text-gray-500">
                    {laudo.obra_sigla ?? 'Obra'} · NF {laudo.nfs.join(', ') || '—'}
                  </p>
                </div>
                <StatusPill
                  label={STATUS_PILL[laudo.status].label}
                  tone={STATUS_PILL[laudo.status].tone}
                />
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
            <div ref={detalheRef}>
              {detalhe.isLoading ? (
                <div className="h-64 animate-pulse rounded-2xl bg-gray-200" aria-hidden />
              ) : detalhe.isError || !detalhe.data ? (
                <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-field text-danger">
                  {MESSAGES.http.serverError}
                </div>
              ) : (
                <LaudoDetalheView
                  detalhe={detalhe.data}
                  onDefinirNumero={handleDefinirNumero}
                  definindoNumero={definirNumero.isPending}
                  onMarcarPronto={handleMarcarPronto}
                  marcandoPronto={marcarPronto.isPending}
                  onEmitirParcial={handleEmitirParcial}
                  emitindoParcial={emitirParcial.isPending}
                  onGerarPdf={handleGerarPdf}
                  gerandoPdf={gerarPdf.isPending}
                  onBaixarPdf={handleBaixarPdf}
                  baixandoPdf={baixarPdf.isPending}
                  onUploadAssinado={handleUploadAssinado}
                  enviandoAssinado={uploadAssinado.isPending}
                  onCorrigir={handleCorrigir}
                  corrigindo={corrigir.isPending}
                />
              )}
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
