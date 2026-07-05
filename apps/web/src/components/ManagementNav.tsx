import { canAccessArea, type NavArea } from '@concreto/shared';
import { NavLink } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

/** A management destination and the area a role must be allowed to open it. */
interface NavItem {
  to: string;
  label: string;
  area: NavArea;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/painel', label: 'Painel', area: 'painel' },
  { to: '/obras', label: 'Obras', area: 'painel' },
  { to: '/usuarios', label: 'Clientes e Usuários', area: 'usuarios' },
];

/**
 * Top navigation shared by the internal (office) screens. Only renders links the
 * current role may open (mirrors the RBAC navigation rules of `packages/shared`,
 * enforced authoritatively by RLS). Keeps the S004 management screens reachable
 * without a full app-chrome redesign.
 */
export function ManagementNav() {
  const role = useAuthStore((s) => s.profile?.role);
  if (!role) {
    return null;
  }
  const items = NAV_ITEMS.filter((item) => canAccessArea(role, item.area));
  if (items.length <= 1) {
    return null;
  }
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Navegação da gestão">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'min-h-touch inline-flex items-center rounded-xl px-4 text-field font-medium',
              isActive
                ? 'bg-brand text-brand-fg'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
