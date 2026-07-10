import { type UserRole } from '@concreto/shared';
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { signOut } from '../features/auth/auth-service';
import { useAuthStore } from '../stores/auth-store';

import { BrandMark } from './BrandMark';
import { StatusPill } from './ui';

/** Human-readable PT labels for each role, shown in the app header. */
const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  socio_campo: 'Sócio de Campo',
  eng_lab: 'Engenharia (Laboratório)',
  eng_escritorio: 'Engenharia (Escritório)',
  cliente: 'Cliente',
};

export interface AppShellProps {
  title: string;
  children: ReactNode;
}

/** Authenticated layout: header with the current role and a sign-out action. */
export function AppShell({ title, children }: AppShellProps) {
  const profile = useAuthStore((s) => s.profile);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    setUnauthenticated();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <BrandMark size="sm" tagline={false} />
        <h1 className="hidden text-xl font-bold text-gray-900 sm:block">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <span className="flex items-center gap-2 text-gray-700">
              <span className="hidden sm:inline">{profile.nome}</span>
              <StatusPill label={ROLE_LABELS[profile.role]} tone="info" />
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-touch rounded-xl border border-gray-300 px-4 text-field font-medium text-gray-700 hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
