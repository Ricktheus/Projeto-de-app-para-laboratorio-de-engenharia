import { useState } from 'react';

import { AppShell } from '../../components/AppShell';
import { ManagementNav } from '../../components/ManagementNav';
import { ClientesSection } from '../clientes/ClientesSection';

import { UsuariosSection } from './UsuariosSection';

type Tab = 'clientes' | 'usuarios';

/**
 * Client & user management (F-S004-1). Admins only (eng_lab / eng_escritorio) —
 * the route guard denies socio_campo / cliente. Two tabs: Clientes and Equipe
 * (internal users). Both create through the admin Edge Function.
 */
export function UsuariosPage() {
  const [tab, setTab] = useState<Tab>('clientes');

  return (
    <AppShell title="Clientes e Usuários">
      <ManagementNav />

      <div className="mb-6 flex gap-2" role="tablist" aria-label="Seções de gestão">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'clientes'}
          onClick={() => setTab('clientes')}
          className={[
            'min-h-touch rounded-xl px-5 text-field font-medium',
            tab === 'clientes'
              ? 'bg-brand text-brand-fg'
              : 'border border-gray-300 bg-white text-gray-700',
          ].join(' ')}
        >
          Clientes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'usuarios'}
          onClick={() => setTab('usuarios')}
          className={[
            'min-h-touch rounded-xl px-5 text-field font-medium',
            tab === 'usuarios'
              ? 'bg-brand text-brand-fg'
              : 'border border-gray-300 bg-white text-gray-700',
          ].join(' ')}
        >
          Equipe
        </button>
      </div>

      {tab === 'clientes' ? <ClientesSection /> : <UsuariosSection />}
    </AppShell>
  );
}
