import { MESSAGES } from '@concreto/shared';
import { Buildings, Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';

import { AppShell } from '../../components/AppShell';
import {
  BigButton,
  EmptyState,
  ErrorState,
  LoadingButton,
  SkeletonRows,
  StatusPill,
  useToast,
} from '../../components/ui';
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
    <AppShell
      title="Obras"
      subtitle="Cadastro e manutenção das obras por cliente."
      actions={
        <BigButton
          icon={showCreate ? <X size={16} /> : <Plus size={16} weight="bold" />}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Fechar' : 'Nova obra'}
        </BigButton>
      }
    >
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
        <SkeletonRows rows={3} className="h-20" />
      ) : isError ? (
        <ErrorState message={MESSAGES.http.serverError} />
      ) : !obras || obras.length === 0 ? (
        <EmptyState
          icon={<Buildings size={24} />}
          title={MESSAGES.feature.emptyObras}
          action={
            <BigButton icon={<Plus size={16} weight="bold" />} onClick={() => setShowCreate(true)}>
              Nova obra
            </BigButton>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {obras.map((obra) =>
            editingId === obra.id ? (
              <li key={obra.id} className="lg:col-span-2">
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
                className={`surface flex flex-col gap-4 p-5 ${obra.ativo ? '' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-concreto-50 font-display text-[13px] font-semibold text-grafite ring-1 ring-concreto-100"
                  >
                    <Buildings size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-grafite">{obra.nome}</p>
                    <p className="truncate text-[13px] text-concreto-500">
                      <span className="font-mono">{obra.sigla}</span> ·{' '}
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
                    className="rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning"
                  >
                    <p className="font-medium">{blocked.message}</p>
                    <LoadingButton
                      variant="neutral"
                      size="sm"
                      className="mt-2"
                      loading={inativar.isPending}
                      onClick={() => handleInativar(obra.id)}
                    >
                      Inativar obra
                    </LoadingButton>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-concreto-100 pt-3">
                  <BigButton
                    variant="neutral"
                    size="sm"
                    onClick={() => {
                      setEditError(null);
                      setEditingId(obra.id);
                    }}
                  >
                    Editar
                  </BigButton>
                  {obra.ativo ? (
                    <BigButton variant="ghost" size="sm" onClick={() => handleInativar(obra.id)}>
                      Inativar
                    </BigButton>
                  ) : null}
                  <BigButton
                    variant="ghost"
                    size="sm"
                    className="ml-auto !text-danger hover:!bg-danger-soft"
                    onClick={() => handleExcluir(obra)}
                  >
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
