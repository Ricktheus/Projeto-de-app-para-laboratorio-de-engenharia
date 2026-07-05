import { MESSAGES } from '@concreto/shared';
import { useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { BigButton, EmptyState, LoadingButton, StatusPill, useToast } from '../../components/ui';
import { useClientes } from '../clientes/useClientes';

import { ObraForm, type ObraFormValues } from './ObraForm';
import { ObraComConcretagensError, type ObraRow } from './obras-service';
import {
  useAtualizarObra,
  useCriarObra,
  useExcluirObra,
  useInativarObra,
  useObras,
} from './useObras';

/** A blocked deletion: the obra id and the exact "has concretagens" message. */
interface BlockedDelete {
  id: string;
  message: string;
}

/**
 * Obra management (F-S004-2/3): create, edit, inactivate and the guarded
 * "excluir" that blocks obras with concretagens (US21-CA1) and offers "Inativar".
 * Covers the four UI-states.
 */
export function ObrasPage() {
  const { show } = useToast();
  const { data: obras, isLoading, isError } = useObras();
  const { data: clientes } = useClientes();

  const criar = useCriarObra();
  const atualizar = useAtualizarObra();
  const inativar = useInativarObra();
  const excluir = useExcluirObra();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedDelete | null>(null);

  const clienteList = clientes ?? [];

  async function handleCreate(values: ObraFormValues) {
    setCreateError(null);
    try {
      await criar.mutateAsync(values);
      show(MESSAGES.feature.obraCriada, 'success');
      setShowCreate(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : MESSAGES.http.serverError);
    }
  }

  async function handleEdit(id: string, values: ObraFormValues) {
    setEditError(null);
    try {
      await atualizar.mutateAsync({ id, patch: values });
      show(MESSAGES.feature.obraAtualizada, 'success');
      setEditingId(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : MESSAGES.http.serverError);
    }
  }

  async function handleInativar(id: string) {
    try {
      await inativar.mutateAsync(id);
      show(MESSAGES.feature.obraInativada, 'success');
      setBlocked(null);
    } catch (error) {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    }
  }

  async function handleExcluir(obra: ObraRow) {
    setBlocked(null);
    try {
      await excluir.mutateAsync(obra.id);
      show(MESSAGES.feature.obraInativada, 'success');
    } catch (error) {
      if (error instanceof ObraComConcretagensError) {
        setBlocked({ id: obra.id, message: error.message });
      } else {
        show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
      }
    }
  }

  return (
    <AppShell title="Obras">
      <ManagementNav />

      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-gray-600">Cadastro e manutenção das obras por cliente.</p>
        <BigButton onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Fechar' : '+ Nova obra'}
        </BigButton>
      </div>

      {showCreate ? (
        <div className="mb-6">
          <ObraForm
            clientes={clienteList}
            submitting={criar.isPending}
            submitLabel="Cadastrar obra"
            errorMessage={createError}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      {isLoading ? (
        <ul className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </ul>
      ) : isError ? (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-field text-danger">
          {MESSAGES.http.serverError}
        </div>
      ) : !obras || obras.length === 0 ? (
        <EmptyState
          icon="📋"
          title={MESSAGES.feature.emptyObras}
          action={<BigButton onClick={() => setShowCreate(true)}>+ Nova obra</BigButton>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {obras.map((obra) =>
            editingId === obra.id ? (
              <li key={obra.id}>
                <ObraForm
                  clientes={clienteList}
                  initial={{
                    clienteId: obra.cliente_id,
                    nome: obra.nome,
                    sigla: obra.sigla,
                    endereco: obra.endereco ?? '',
                    contato: obra.contato ?? '',
                  }}
                  lockCliente
                  submitting={atualizar.isPending}
                  submitLabel="Salvar alterações"
                  errorMessage={editError}
                  onSubmit={(values) => handleEdit(obra.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={obra.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-field font-medium text-gray-900">
                      {obra.nome} <span className="text-gray-400">·</span> {obra.sigla}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {obra.cliente_nome ?? 'Cliente'}
                    </p>
                  </div>
                  <StatusPill
                    label={obra.ativo ? 'Ativa' : 'Inativa'}
                    tone={obra.ativo ? 'success' : 'neutral'}
                  />
                </div>

                {blocked?.id === obra.id ? (
                  <div
                    role="alert"
                    className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-900"
                  >
                    <p className="font-medium">{blocked.message}</p>
                    <LoadingButton
                      variant="neutral"
                      className="mt-2"
                      loading={inativar.isPending}
                      onClick={() => handleInativar(obra.id)}
                    >
                      Inativar obra
                    </LoadingButton>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <BigButton
                    variant="neutral"
                    onClick={() => {
                      setEditError(null);
                      setEditingId(obra.id);
                    }}
                  >
                    Editar
                  </BigButton>
                  {obra.ativo ? (
                    <BigButton variant="neutral" onClick={() => handleInativar(obra.id)}>
                      Inativar
                    </BigButton>
                  ) : null}
                  <BigButton variant="danger" onClick={() => handleExcluir(obra)}>
                    Excluir
                  </BigButton>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </AppShell>
  );
}
