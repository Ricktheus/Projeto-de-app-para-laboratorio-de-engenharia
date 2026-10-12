import { MESSAGES, type UserRole } from '@concreto/shared';
import { UsersThree } from '@phosphor-icons/react';

import { EmptyState, ErrorState, StatusPill } from '../../components/ui';

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
        <li key={i} className="h-16 animate-pulse rounded-xl bg-concreto-100" />
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
          <ErrorState message={MESSAGES.http.serverError} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<UsersThree size={24} />} title={MESSAGES.feature.emptyUsuarios} />
        ) : (
          <ul className="surface divide-y divide-concreto-100">
            {data.map((usuario) => (
              <li key={usuario.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-grafite">{usuario.nome}</p>
                  <p className="truncate text-[13px] text-concreto-500">{usuario.email}</p>
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
