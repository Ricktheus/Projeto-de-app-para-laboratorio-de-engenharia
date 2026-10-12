import { formatIsoDateBr, formatNumberBr, MESSAGES } from '@concreto/shared';
import { ArrowsClockwise, MagnifyingGlass, PencilSimple, Truck } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { AppShell } from '../../components/AppShell';
import {
  BigButton,
  Drawer,
  EmptyState,
  ErrorState,
  KpiTile,
  SkeletonRows,
  StatusPill,
  useToast,
} from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { ConcretagemEditForm } from '../concretagens/ConcretagemEditForm';
import {
  ConcretagemConflictError,
  type ConcretagemPatch,
  type ConcretagemRow,
} from '../concretagens/concretagens-service';
import {
  useAtualizarConcretagem,
  useConcretagens,
  useConcretagensRealtime,
} from '../concretagens/useConcretagens';

/** Slump measured vs project ± tolerance — a field fact, shown neutrally. */
function SlumpCell({ row }: { row: ConcretagemRow }) {
  if (row.slump_medido == null) {
    return <span className="text-concreto-400">—</span>;
  }
  const hasSpec = row.slump_projeto != null && row.slump_tolerancia != null;
  const within =
    hasSpec &&
    Math.abs(row.slump_medido - (row.slump_projeto as number)) <= (row.slump_tolerancia as number);
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{formatNumberBr(row.slump_medido)} mm</span>
      {hasSpec ? (
        <StatusPill
          tone={within ? 'neutral' : 'warning'}
          label={within ? 'na tolerância' : 'fora da tolerância'}
        />
      ) : null}
    </span>
  );
}

/** "Live" indicator for the realtime subscription (plan §6.8: motion = info). */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-concreto-200 bg-white px-3 py-1 text-[12px] font-medium text-concreto-600">
      <span aria-hidden className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
      Ao vivo
    </span>
  );
}

/**
 * Concretagens (office panel). Every field pour in real time (F-S007-1 / US12 —
 * Supabase Realtime keeps the table live) with a dense, searchable table and
 * editing in a side drawer with optimistic locking (F-S007-2 / US12b). Covers
 * the four UI-states; a concurrent edit surfaces the exact 409 copy +
 * "Recarregar".
 */
export function PainelPage() {
  const { show } = useToast();
  const role = useAuthStore((s) => s.profile?.role);
  const canEdit = role === 'eng_lab' || role === 'eng_escritorio';

  const { data: concretagens, isLoading, isError, refetch } = useConcretagens();
  useConcretagensRealtime();
  const atualizar = useAtualizarConcretagem();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [search, setSearch] = useState('');

  // QW-17: free-text filter over obra / cliente / NF, for months of history.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!concretagens || needle === '') {
      return concretagens ?? [];
    }
    return concretagens.filter((row) =>
      [row.obra_sigla, row.obra_nome, row.cliente_nome, row.nf_numero, row.concreteira].some(
        (field) => (field ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [concretagens, search]);

  const resumo = useMemo(() => {
    const rows = concretagens ?? [];
    return {
      total: rows.length,
      volume: rows.reduce((sum, r) => sum + (Number(r.volume_m3) || 0), 0),
      obras: new Set(rows.map((r) => r.obra_id)).size,
    };
  }, [concretagens]);

  const editing = concretagens?.find((row) => row.id === editingId) ?? null;

  async function handleEdit(row: ConcretagemRow, patch: ConcretagemPatch) {
    setEditError(null);
    setConflict(false);
    try {
      await atualizar.mutateAsync({ id: row.id, patch, expectedUpdatedAt: row.updated_at });
      show(MESSAGES.feature.concretagemAtualizada, 'success');
      setEditingId(null);
    } catch (error) {
      if (error instanceof ConcretagemConflictError) {
        setConflict(true);
        setEditError(error.message);
      } else {
        setEditError(error instanceof Error ? error.message : MESSAGES.http.serverError);
      }
    }
  }

  function handleReload() {
    setEditingId(null);
    setEditError(null);
    setConflict(false);
    void refetch();
  }

  function startEditing(id: string) {
    setEditError(null);
    setConflict(false);
    setEditingId(id);
  }

  return (
    <AppShell
      title="Concretagens"
      subtitle="Concretagens recebidas do campo, atualizadas em tempo real."
      actions={<LiveBadge />}
    >
      {isLoading ? (
        <SkeletonRows rows={5} className="h-12" />
      ) : isError ? (
        <ErrorState
          message={MESSAGES.feature.painelErroCarregar}
          action={
            <BigButton variant="neutral" size="sm" onClick={() => void refetch()}>
              {MESSAGES.feature.painelTentarNovamente}
            </BigButton>
          }
        />
      ) : !concretagens || concretagens.length === 0 ? (
        <EmptyState
          icon={<Truck size={24} />}
          title={MESSAGES.feature.emptyConcretagensPainel}
          description="As concretagens salvas no aplicativo de campo aparecem aqui automaticamente."
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
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile label="Concretagens" value={resumo.total} />
            <KpiTile label="Volume total" value={`${formatNumberBr(resumo.volume)} m³`} />
            <KpiTile label="Obras" value={resumo.obras} />
          </div>

          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-concreto-100 px-4 py-3">
              <label className="relative w-full max-w-sm">
                <MagnifyingGlass
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-concreto-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por obra, cliente, NF ou concreteira"
                  aria-label="Buscar concretagens"
                  className="control pl-9"
                />
              </label>
              <span className="ml-auto text-[13px] text-concreto-500">
                {filtered.length} de {concretagens.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon={<MagnifyingGlass size={22} />}
                title="Nenhuma concretagem encontrada para a busca."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="bg-concreto-25">
                    <tr className="eyebrow">
                      <th className="px-4 py-2.5 font-semibold">Data</th>
                      <th className="px-4 py-2.5 font-semibold">Obra</th>
                      <th className="px-4 py-2.5 font-semibold">NF</th>
                      <th className="px-4 py-2.5 text-right font-semibold">FCK</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Volume</th>
                      <th className="px-4 py-2.5 font-semibold">Slump</th>
                      <th className="px-4 py-2.5 font-semibold">Concreteira</th>
                      <th className="px-4 py-2.5" aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-concreto-100">
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="h-12 transition-colors duration-150 hover:bg-concreto-25"
                      >
                        <td className="whitespace-nowrap px-4 tabular-nums text-concreto-600">
                          {formatIsoDateBr(row.data_concretagem)}
                        </td>
                        <td className="px-4">
                          <p className="font-medium text-grafite">
                            {row.obra_sigla ?? 'Obra'}{' '}
                            <span className="font-normal text-concreto-500">
                              · {row.obra_nome ?? '—'}
                            </span>
                          </p>
                          <p className="text-[12px] text-concreto-500">
                            {row.cliente_nome ?? 'Cliente'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 font-mono text-[13px]">
                          NF {row.nf_numero}
                        </td>
                        <td className="whitespace-nowrap px-4 text-right font-medium">
                          {formatNumberBr(row.fck_projeto)} MPa
                        </td>
                        <td className="whitespace-nowrap px-4 text-right">
                          {formatNumberBr(row.volume_m3)} m³
                        </td>
                        <td className="whitespace-nowrap px-4">
                          <SlumpCell row={row} />
                        </td>
                        <td className="px-4 text-concreto-600">{row.concreteira ?? '—'}</td>
                        <td className="px-4 text-right">
                          {canEdit ? (
                            <BigButton
                              variant="ghost"
                              size="sm"
                              icon={<PencilSimple size={15} />}
                              onClick={() => startEditing(row.id)}
                            >
                              Editar
                            </BigButton>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditingId(null)}
        title={editing ? `NF ${editing.nf_numero}` : ''}
        subtitle={
          editing
            ? `${editing.obra_sigla ?? 'Obra'} · ${editing.cliente_nome ?? 'Cliente'} · ${formatIsoDateBr(editing.data_concretagem)}`
            : undefined
        }
      >
        {editing ? (
          <ConcretagemEditForm
            concretagem={editing}
            submitting={atualizar.isPending}
            errorMessage={editError}
            errorAction={
              conflict ? (
                <BigButton variant="neutral" size="sm" onClick={handleReload}>
                  {MESSAGES.feature.concretagemRecarregar}
                </BigButton>
              ) : undefined
            }
            onSubmit={(patch) => handleEdit(editing, patch)}
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </Drawer>
    </AppShell>
  );
}
