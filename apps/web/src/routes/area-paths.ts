import { type NavArea } from '@concreto/shared';

/**
 * Web route for each semantic {@link NavArea}. The mapping from role → area
 * lives in `packages/shared` (roleHome / canAccessArea); this file only binds
 * those areas to concrete react-router paths.
 */
export const AREA_PATH: Readonly<Record<NavArea, string>> = {
  campo: '/campo',
  prensa: '/prensa',
  painel: '/painel',
  portal: '/portal',
  usuarios: '/usuarios',
  laudos: '/laudos',
  exportacao: '/exportacao',
};
