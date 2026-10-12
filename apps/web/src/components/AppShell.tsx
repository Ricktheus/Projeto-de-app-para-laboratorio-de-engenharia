import { canAccessArea, type NavArea, type UserRole } from '@concreto/shared';
import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { signOut } from '../features/auth/auth-service';
import { useAuthStore } from '../stores/auth-store';

import { BrandGlyph, BrandMark } from './BrandMark';
import {
  Buildings,
  ChartLineUp,
  ClipboardText,
  FileText,
  Gauge,
  List,
  MicrosoftExcelLogo,
  SignOut,
  Truck,
  UsersThree,
  X,
} from './icons';

/** Human-readable PT labels for each role, shown in the user block. */
const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  socio_campo: 'Sócio de Campo',
  eng_lab: 'Engenharia (Laboratório)',
  eng_escritorio: 'Engenharia (Escritório)',
  cliente: 'Cliente',
};

interface NavItem {
  to: string;
  label: string;
  area: NavArea;
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

const ICON = 18;

/**
 * Sidebar destinations, grouped by job (plan §4). Each item only renders when
 * the role may open its area (RBAC from `packages/shared`, enforced by RLS).
 */
const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { to: '/dashboard', label: 'Hoje', area: 'dashboard', icon: <Gauge size={ICON} /> },
      { to: '/painel', label: 'Concretagens', area: 'painel', icon: <Truck size={ICON} /> },
      { to: '/laudos', label: 'Laudos', area: 'laudos', icon: <FileText size={ICON} /> },
      { to: '/prensa', label: 'Bancada', area: 'prensa', icon: <ChartLineUp size={ICON} /> },
      { to: '/campo', label: 'Campo', area: 'campo', icon: <ClipboardText size={ICON} /> },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/obras', label: 'Obras', area: 'painel', icon: <Buildings size={ICON} /> },
      {
        to: '/usuarios',
        label: 'Clientes e equipe',
        area: 'usuarios',
        icon: <UsersThree size={ICON} />,
      },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      {
        to: '/exportacao',
        label: 'Comparativo Excel',
        area: 'exportacao',
        icon: <MicrosoftExcelLogo size={ICON} />,
      },
    ],
  },
];

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''))
    .toUpperCase()
    .slice(0, 2);
}

/** Long PT-BR date for the page eyebrow, in the lab's local time zone. */
function todayLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

export interface AppShellProps {
  title: string;
  /** Short description under the title. */
  subtitle?: ReactNode;
  /** Right-aligned page actions (primary buttons). */
  actions?: ReactNode;
  /** Small line above the title (defaults to today's date). */
  eyebrow?: ReactNode;
  children: ReactNode;
}

function useSignOut() {
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const navigate = useNavigate();
  return async () => {
    await signOut();
    setUnauthenticated();
    navigate('/login', { replace: true });
  };
}

function PageHeader({ title, subtitle, actions, eyebrow }: Omit<AppShellProps, 'children'>) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1 first-letter:uppercase">{eyebrow ?? todayLabel()}</p>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-[0.005em] text-grafite">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-concreto-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Client-facing shell: light top bar with the lab brand (plan §6.3 "Portal"). */
function PortalShell(props: AppShellProps) {
  const profile = useAuthStore((s) => s.profile);
  const handleSignOut = useSignOut();
  return (
    <div className="min-h-screen bg-concreto-25">
      <header className="sticky top-0 z-30 border-b border-concreto-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <BrandMark size="sm" tagline={false} />
          <div className="ml-auto flex items-center gap-3">
            {profile ? (
              <span className="hidden text-concreto-600 sm:inline">{profile.nome}</span>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-concreto-200 px-3 text-[13px] font-medium text-grafite hover:bg-concreto-25"
            >
              <SignOut size={16} aria-hidden />
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader {...props} />
        {props.children}
      </main>
    </div>
  );
}

function SidebarContent({ role, onNavigate }: { role: UserRole; onNavigate: () => void }) {
  const profile = useAuthStore((s) => s.profile);
  const handleSignOut = useSignOut();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <BrandGlyph size={34} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[22px] font-bold tracking-[0.02em] text-white">
            Rastro
          </span>
          <span className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.1em] text-concreto-400">
            Controle de concreto
          </span>
        </div>
      </div>
      <div className="hazard mx-5 mb-4 h-1 rounded-full opacity-90" aria-hidden />

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => canAccessArea(role, item.area));
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-concreto-500">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        [
                          'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] font-medium transition-colors duration-150',
                          isActive
                            ? 'bg-white/10 text-white before:absolute before:-left-3 before:top-1.5 before:h-6 before:w-[3px] before:rounded-r before:bg-sinal-500'
                            : 'text-concreto-300 hover:bg-white/5 hover:text-white',
                        ].join(' ')
                      }
                    >
                      <span aria-hidden className="flex opacity-90">
                        {item.icon}
                      </span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {profile ? (
        <div className="m-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-concreto-800 font-display text-[15px] font-semibold text-sinal-500"
          >
            {initials(profile.nome)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{profile.nome}</p>
            <p className="truncate text-[12px] text-concreto-400">{ROLE_LABELS[profile.role]}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sair"
            title="Sair"
            className="rounded-lg p-2 text-concreto-400 hover:bg-white/10 hover:text-white"
          >
            <SignOut size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Authenticated layout (plan §6.5): graphite 240px sidebar grouped by job, a
 * fluid content area up to 1600px and a page header with title, context and
 * actions. On small screens the sidebar becomes an overlay. Clients get the
 * lighter portal shell instead.
 */
export function AppShell(props: AppShellProps) {
  const role = useAuthStore((s) => s.profile?.role);
  const [menuOpen, setMenuOpen] = useState(false);

  if (role === 'cliente') {
    return <PortalShell {...props} />;
  }

  return (
    <div className="min-h-screen bg-concreto-25 lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-grafite lg:block">
        {role ? <SidebarContent role={role} onNavigate={() => undefined} /> : null}
      </aside>

      {/* Mobile top bar + overlay sidebar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-concreto-100 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-1.5 text-grafite hover:bg-concreto-50"
        >
          <List size={22} />
        </button>
        <BrandGlyph size={28} />
        <span className="font-display text-lg font-bold">Rastro</span>
      </div>
      {menuOpen && role ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-grafite/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative h-full w-64 animate-fade-in bg-grafite">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-concreto-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent role={role} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
        <PageHeader {...props} />
        {props.children}
      </main>
    </div>
  );
}
