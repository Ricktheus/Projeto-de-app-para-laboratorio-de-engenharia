import { MESSAGES, type LaudoStatus, type LaudoTipo } from '@concreto/shared';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ArrowsClockwise, FileText, MagnifyingGlass, Stack, X } from '../../components/icons';
import {
  BigButton,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingButton,
  SkeletonRows,
  StatusPill,
  useToast,
  type StatusTone,
} from '../../components/ui';

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

const STATUS_PILL: Readonly<Record<LaudoStatus, { label: string; tone: StatusTone }>> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  pronto_assinatura: { label: 'Pronto p/ assinatura', tone: 'accent' },
  assinado: { label: 'Assinado', tone: 'success' },
  substituido: { label: 'Substituído', tone: 'neutral' },
};

const TIPO_LABEL: Readonly<Record<LaudoTipo, string>> = {
  parcial_7d: 'Parcial 7d',
  parcial_14d: 'Parcial 14d',
  final_28d: 'Final 28d',
};

/** A status filter tab: a status subset + its human label. */
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

const dateTimeBr = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeBr.format(d);
}

/**
 * Reports workspace (F-S007-3 / US13 + S008). A dense table of the active
 * reports with status tabs (the signature queue highlighted), obra / NF filters,
 * and the consolidated detail in a side drawer with the STATUS-AWARE actions:
 * draft (emitir parcial, marcar pronto), pronto (gerar PDF, baixar, enviar
 * assinado) and assinado (baixar, corrigir).
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
  const countByStatus = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      todos: lista.length,
      rascunho: 0,
      pronto_assinatura: 0,
      assinado: 0,
      substituido: 0,
    };
    for (const l of lista) {
      counts[l.status] += 1;
    }
    return counts;
  }, [lista]);
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

  const selectedRow = lista.find((l) => l.id === selectedId) ?? null;

  return (
    <AppShell
      title="Laudos"
      subtitle="Laudos pré-prontos, geração de PDF, assinatura gov.br e correção."
      actions={
        <BigButton
          variant="neutral"
          icon={grouping ? <X size={16} /> : <Stack size={16} />}
          onClick={() => {
            setGrouping((v) => !v);
            setSelectedForGroup([]);
            setSelectedId(null);
          }}
        >
          {grouping ? 'Cancelar agrupamento' : 'Agrupar laudos'}
        </BigButton>
      }
    >
      {isLoading ? (
        <SkeletonRows rows={5} className="h-12" />
      ) : isError ? (
        <ErrorState
          message={MESSAGES.http.serverError}
          action={
            <BigButton variant="neutral" size="sm" onClick={() => void refetch()}>
              {MESSAGES.feature.painelTentarNovamente}
            </BigButton>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title={MESSAGES.feature.emptyLaudos}
          action={
            <BigButton
              variant="neutral"
              icon={<ArrowsClockwise size={16} />}
              onClick={() => void refetch()}
            >
              Atualizar
            </BigButton>
          }
        />
      ) : (
        <div className="surface overflow-hidden">
          {/* QW-13: status tabs with counts — the signature queue stands out. */}
          <div
            className="flex gap-1 overflow-x-auto border-b border-concreto-100 px-3 pt-2"
            role="group"
            aria-label="Filtrar por status"
          >
            {STATUS_FILTERS.map((chip) => {
              const active = statusFilter === chip.value;
              const queue =
                chip.value === 'pronto_assinatura' && countByStatus.pronto_assinatura > 0;
              return (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(chip.value)}
                  className={[
                    'relative flex h-11 items-center gap-2 whitespace-nowrap px-3 text-[14px] font-medium transition-colors',
                    active
                      ? 'text-grafite after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-grafite'
                      : 'text-concreto-500 hover:text-grafite',
                  ].join(' ')}
                >
                  {chip.label}
                  <span
                    className={[
                      'rounded-md px-1.5 text-[12px] tabular-nums',
                      queue
                        ? 'bg-sinal-500 font-semibold text-grafite'
                        : 'bg-concreto-50 text-concreto-600',
                    ].join(' ')}
                  >
                    {countByStatus[chip.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters. */}
          <div className="flex flex-wrap items-center gap-3 border-b border-concreto-100 px-4 py-3">
            <label className="flex items-center gap-2">
              <span className="sr-only">Obra</span>
              <select
                value={obraFilter}
                onChange={(e) => setObraFilter(e.target.value)}
                aria-label="Obra"
                className="control w-48"
              >
                <option value="">Todas as obras</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">NF</span>
              <MagnifyingGlass
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-concreto-400"
              />
              <input
                value={nfFilter}
                onChange={(e) => setNfFilter(e.target.value)}
                placeholder="Filtrar por NF"
                aria-label="NF"
                className="control w-56 pl-9"
              />
            </label>
            <span className="ml-auto text-[13px] text-concreto-500">
              {filtered.length} de {lista.length}
            </span>
          </div>

          {grouping ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-cobalto-100 bg-cobalto-50 px-4 py-3">
              <span className="text-field text-cobalto-700">
                Selecione 2 ou mais rascunhos da mesma obra para consolidar.
              </span>
              <LoadingButton
                size="sm"
                className="ml-auto"
                loading={agrupar.isPending}
                loadingLabel="Agrupando..."
                disabled={!sameObra}
                onClick={handleAgrupar}
              >
                Agrupar selecionados ({selectedForGroup.length})
              </LoadingButton>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<MagnifyingGlass size={22} />}
              title="Nenhum laudo para os filtros selecionados."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-concreto-25">
                  <tr className="eyebrow">
                    {grouping ? <th className="w-10 px-4 py-2.5" aria-label="Selecionar" /> : null}
                    <th className="px-4 py-2.5 font-semibold">Laudo</th>
                    <th className="px-4 py-2.5 font-semibold">Obra</th>
                    <th className="px-4 py-2.5 font-semibold">NF</th>
                    <th className="px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 font-semibold">Situação</th>
                    <th className="px-4 py-2.5 font-semibold">Atualizado</th>
                    {!grouping ? <th className="px-4 py-2.5" aria-label="Ações" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-concreto-100">
                  {filtered.map((laudo) => (
                    <tr
                      key={laudo.id}
                      className={[
                        'h-12 transition-colors duration-150',
                        selectedId === laudo.id ? 'bg-cobalto-50/60' : 'hover:bg-concreto-25',
                        laudo.status === 'pronto_assinatura' ? 'bg-sinal-50/40' : '',
                      ].join(' ')}
                    >
                      {grouping ? (
                        <td className="px-4">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${laudo.numero}`}
                            checked={selectedForGroup.includes(laudo.id)}
                            disabled={laudo.status !== 'rascunho'}
                            onChange={() => toggleGroupSelection(laudo.id)}
                            className="h-4 w-4 accent-grafite disabled:opacity-40"
                          />
                        </td>
                      ) : null}
                      <td className="px-4">
                        <span className="font-mono text-[13px] font-medium text-grafite">
                          {laudo.numero}
                        </span>
                        {laudo.versao > 1 ? (
                          <span className="ml-2 text-[12px] text-concreto-500">
                            v{laudo.versao}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4">
                        <p className="font-medium text-grafite">{laudo.obra_sigla ?? 'Obra'}</p>
                        <p className="text-[12px] text-concreto-500">{laudo.cliente_nome ?? ''}</p>
                      </td>
                      <td className="px-4 font-mono text-[13px] text-concreto-600">
                        {laudo.nfs.join(', ') || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 text-concreto-600">
                        {TIPO_LABEL[laudo.tipo_laudo]}
                      </td>
                      <td className="px-4">
                        <StatusPill
                          label={STATUS_PILL[laudo.status].label}
                          tone={STATUS_PILL[laudo.status].tone}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 tabular-nums text-concreto-500">
                        {formatUpdated(laudo.updated_at)}
                      </td>
                      {!grouping ? (
                        <td className="px-4 text-right">
                          <BigButton
                            variant="neutral"
                            size="sm"
                            onClick={() =>
                              setSelectedId((cur) => (cur === laudo.id ? null : laudo.id))
                            }
                          >
                            {selectedId === laudo.id ? 'Fechar' : 'Ver laudo'}
                          </BigButton>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selected report detail, in a side drawer (plan §6.5). */}
      <Drawer
        open={selectedId !== null && !grouping}
        onClose={() => setSelectedId(null)}
        title={detalhe.data?.numero ?? selectedRow?.numero ?? 'Laudo'}
        subtitle={
          selectedRow
            ? `${selectedRow.obra_sigla ?? 'Obra'} · ${selectedRow.cliente_nome ?? 'Cliente'}`
            : undefined
        }
        widthClassName="max-w-[760px]"
      >
        {detalhe.isLoading ? (
          <SkeletonRows rows={4} className="h-24" />
        ) : detalhe.isError || !detalhe.data ? (
          <ErrorState message={MESSAGES.http.serverError} />
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
      </Drawer>
    </AppShell>
  );
}
