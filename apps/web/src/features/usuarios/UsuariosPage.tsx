import { useState } from 'react';

import { AppShell } from '../../components/AppShell';
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
    <AppShell
      title="Clientes e equipe"
      subtitle="Clientes com acesso ao portal e usuários internos do laboratório."
    >
      <div
        className="mb-6 inline-flex gap-1 rounded-xl border border-concreto-100 bg-white p-1 shadow-card"
        role="tablist"
        aria-label="Seções de gestão"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'clientes'}
          onClick={() => setTab('clientes')}
          className={[
            'h-9 rounded-lg px-4 text-[14px] font-medium transition-colors',
            tab === 'clientes' ? 'bg-grafite text-white' : 'text-concreto-600 hover:text-grafite',
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
            'h-9 rounded-lg px-4 text-[14px] font-medium transition-colors',
            tab === 'usuarios' ? 'bg-grafite text-white' : 'text-concreto-600 hover:text-grafite',
          ].join(' ')}
        >
          Equipe
        </button>
      </div>

      {tab === 'clientes' ? <ClientesSection /> : <UsuariosSection />}
    </AppShell>
  );
}
