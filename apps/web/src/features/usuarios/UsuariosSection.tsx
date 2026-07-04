import { MESSAGES, type UserRole } from '@concreto/shared';

import { EmptyState, StatusPill } from '../../components/ui';

import { NovoUsuarioForm } from './NovoUsuarioForm';
import { useUsuarios } from './useUsuarios';

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  socio_campo: 'Sócio de Campo',
  eng_lab: 'Engenharia (Laboratório)',
  eng_escritorio: 'Engenharia (Escritório)',
  cliente: 'Cliente',
};

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
 * Internal-users tab (F-S004-1): create form + list, with the four UI-states.
 * The list shows every provisioned user (RLS grants admins full visibility).
 */
export function UsuariosSection() {
  const { data, isLoading, isError } = useUsuarios();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <NovoUsuarioForm />

      <section aria-label="Usuários cadastrados" className="flex flex-col gap-3">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-field text-danger">
            {MESSAGES.http.serverError}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon="👥" title={MESSAGES.feature.emptyUsuarios} />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((usuario) => (
              <li
                key={usuario.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-field font-medium text-gray-900">{usuario.nome}</p>
                  <p className="truncate text-sm text-gray-500">{usuario.email}</p>
                </div>
                {usuario.is_admin ? <StatusPill label="Admin" tone="info" /> : null}
                <StatusPill label={ROLE_LABELS[usuario.role]} tone="neutral" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
