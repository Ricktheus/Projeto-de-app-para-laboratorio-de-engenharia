import { MESSAGES } from '@concreto/shared';
import { Briefcase } from '@phosphor-icons/react';

import { EmptyState, ErrorState, StatusPill } from '../../components/ui';

import { NovoClienteForm } from './NovoClienteForm';
import { useClientes } from './useClientes';

/** Loading skeleton for the client list. */
function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-xl bg-concreto-100" />
      ))}
    </ul>
  );
}

/**
 * Clients tab (F-S004-1): the create form plus the list, covering the four
 * UI-states (Loading skeleton / Success list / Error / Empty with CTA).
 */
export function ClientesSection() {
  const { data, isLoading, isError } = useClientes();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <NovoClienteForm />

      <section aria-label="Clientes cadastrados" className="flex flex-col gap-3">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState message={MESSAGES.http.serverError} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Briefcase size={24} />} title={MESSAGES.feature.emptyClientes} />
        ) : (
          <ul className="surface divide-y divide-concreto-100">
            {data.map((cliente) => (
              <li key={cliente.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-grafite">{cliente.nome}</p>
                  <p className="truncate text-[13px] text-concreto-500">
                    {cliente.cnpj ?? 'Sem CNPJ'} · {cliente.email ?? 'Sem e-mail'}
                  </p>
                </div>
                <StatusPill
                  label={cliente.ativo ? 'Ativo' : 'Inativo'}
                  tone={cliente.ativo ? 'success' : 'neutral'}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
