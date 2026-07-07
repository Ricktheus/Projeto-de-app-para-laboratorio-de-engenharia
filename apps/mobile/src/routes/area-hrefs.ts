import { type NavArea } from '@concreto/shared';

/**
 * expo-router path for each semantic {@link NavArea}. Role → area lives in
 * `packages/shared`; this only binds areas to concrete mobile routes. `usuarios`,
 * `laudos` and `exportacao` have no mobile screen (user management, reports and
 * the Excel export are web-only), so they map to the panel — never used as a
 * mobile home (no role homes there on mobile).
 */
export const AREA_HREF: Readonly<Record<NavArea, string>> = {
  campo: '/campo',
  prensa: '/prensa',
  painel: '/painel',
  portal: '/portal',
  usuarios: '/painel',
  laudos: '/painel',
  exportacao: '/painel',
  // No mobile dashboard (office-only S010 screen) — falls back to the panel.
  dashboard: '/painel',
};
