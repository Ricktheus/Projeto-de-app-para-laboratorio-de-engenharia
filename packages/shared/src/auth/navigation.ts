/**
 * Role-based navigation rules (F-S003-2).
 *
 * The single, framework-agnostic source of truth for "which area of the product
 * a role lands on" and "which areas a role is allowed to open". Both the mobile
 * app (expo-router) and the web app (react-router) map these semantic `NavArea`
 * keys to their own concrete routes, so the RBAC navigation rule lives in ONE
 * place (DRY) and can never drift between platforms.
 *
 * This mirrors the RBAC matrix of PRD §3.2 at the navigation level; the
 * authoritative data-access enforcement still happens server-side via RLS
 * (see supabase/migrations/0005_rls.sql).
 */
import { type UserRole } from '../enums';

/** Platform the navigation is resolved for. */
export type Platform = 'mobile' | 'web';

/**
 * A semantic area of the product. Apps translate each key into a concrete
 * route (e.g. `campo` → `/campo` on web, `/(campo)` on mobile). `laudos` is the
 * office report workspace (web-only, S007).
 */
export type NavArea = 'campo' | 'prensa' | 'painel' | 'portal' | 'usuarios' | 'laudos';

/**
 * Areas each role is allowed to open. Anything not listed is denied by default
 * (mirrors the "negação por padrão" principle of the RLS layer).
 *
 * Note (SPEC F-S003-2 DoD): `socio_campo` gets `campo` only — it must NOT reach
 * user management (`usuarios`) nor the press screen (`prensa`).
 */
export const ROLE_ALLOWED_AREAS: Readonly<Record<UserRole, readonly NavArea[]>> = {
  socio_campo: ['campo'],
  eng_lab: ['prensa', 'painel', 'laudos', 'usuarios'],
  eng_escritorio: ['painel', 'laudos', 'usuarios'],
  cliente: ['portal'],
};

/**
 * Home area a role lands on right after login.
 *
 * `eng_lab` is platform-sensitive per SPEC F-S003-1 ("eng_lab → prensa/painel"):
 * on mobile the RT lands on the press screen, on web on the office panel. Every
 * returned area is, by construction, contained in {@link ROLE_ALLOWED_AREAS}.
 */
export function roleHome(role: UserRole, platform: Platform): NavArea {
  switch (role) {
    case 'socio_campo':
      return 'campo';
    case 'eng_lab':
      return platform === 'mobile' ? 'prensa' : 'painel';
    case 'eng_escritorio':
      return 'painel';
    case 'cliente':
      return 'portal';
  }
}

/** Whether `role` may open `area`. Denies by default for unlisted areas. */
export function canAccessArea(role: UserRole, area: NavArea): boolean {
  return ROLE_ALLOWED_AREAS[role].includes(area);
}
