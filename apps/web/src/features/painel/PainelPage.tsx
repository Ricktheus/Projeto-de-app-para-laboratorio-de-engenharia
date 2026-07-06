import { formatIsoDateBr, MESSAGES } from '@concreto/shared';
import { useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { BigButton, EmptyState, StatusPill, useToast } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { ConcretagemEditForm } from '../concretagens/ConcretagemEditForm';
import {
  ConcretagemConflictError,
  type ConcretagemPatch,
  type ConcretagemRow,
} from '../concretagens/concretagens-service';
import { useAtualizarConcretagem, useConcretagens, useConcretagensRealtime } from '../concretagens/useConcretagens';

/** One labelled fact of a concretagem card. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-field text-gray-900">{value}</span>
    </div>
  );
}

/**
 * Office panel (escritório). Shows every field concretagem in real time
 * (F-S007-1 / US12 — Supabase Realtime keeps the list live) and lets the
 * engineers edit a pour with optimistic locking (F-S007-2 / US12b). Covers the
 * four UI-states; a concurrent edit surfaces the exact 409 copy + "Recarregar".
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
    <AppShell title="Painel do Escritório">
      <ManagementNav />

      <p className="mb-6 text-gray-600">
        Concretagens recebidas do campo, atualizadas em tempo real.
      </p>

      {isLoading ? (
        <ul className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </ul>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-field text-danger"
        >
          <span className="font-medium">{MESSAGES.feature.painelErroCarregar}</span>
          <BigButton variant="neutral" onClick={() => void refetch()}>
            {MESSAGES.feature.painelTentarNovamente}
          </BigButton>
        </div>
      ) : !concretagens || concretagens.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title={MESSAGES.feature.emptyConcretagensPainel}
          description="As concretagens salvas no aplicativo de campo aparecem aqui automaticamente."
          action={
            <BigButton variant="neutral" onClick={() => void refetch()}>
              Atualizar
            </BigButton>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {concretagens.map((row) =>
            editingId === row.id ? (
              <li key={row.id}>
                <ConcretagemEditForm
                  concretagem={row}
                  submitting={atualizar.isPending}
                  errorMessage={editError}
                  errorAction={
                    conflict ? (
                      <BigButton variant="neutral" onClick={handleReload}>
                        {MESSAGES.feature.concretagemRecarregar}
                      </BigButton>
                    ) : undefined
                  }
                  onSubmit={(patch) => handleEdit(row, patch)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-field font-medium text-gray-900">
                      {row.obra_sigla ?? 'Obra'} <span className="text-gray-400">·</span>{' '}
                      {row.obra_nome ?? '—'}
                    </p>
                    <p className="truncate text-sm text-gray-500">{row.cliente_nome ?? 'Cliente'}</p>
                  </div>
                  <StatusPill label={`NF ${row.nf_numero}`} tone="info" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fact label="Data" value={formatIsoDateBr(row.data_concretagem)} />
                  <Fact label="FCK" value={`${row.fck_projeto} MPa`} />
                  <Fact label="Volume" value={`${row.volume_m3} m³`} />
                  <Fact label="Concreteira" value={row.concreteira ?? '—'} />
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <BigButton variant="neutral" onClick={() => startEditing(row.id)}>
                      Editar
                    </BigButton>
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}
    </AppShell>
  );
}
