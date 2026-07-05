import { MESSAGES } from '@concreto/shared';

import { EmptyState, StatusPill } from '../../components/ui';

import { NovoClienteForm } from './NovoClienteForm';
import { useClientes } from './useClientes';

/** Loading skeleton for the client list. */
function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
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
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-field text-danger">
            {MESSAGES.http.serverError}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon="🏢" title={MESSAGES.feature.emptyClientes} />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((cliente) => (
              <li
                key={cliente.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-field font-medium text-gray-900">{cliente.nome}</p>
                  <p className="truncate text-sm text-gray-500">
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
