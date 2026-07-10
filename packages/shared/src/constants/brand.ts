/**
 * Brand identity — the single source of truth for the laboratory's public name
 * and tagline, shared by every surface (login, client portal, public validation
 * page, e-mails). The razão social is still to be confirmed (PRD §10); swap
 * {@link BRAND.nome} here when it is, and every surface updates at once.
 */
export const BRAND = {
  /** Public display name of the laboratory. */
  nome: 'Laboratório de Concreto',
  /** Short descriptor shown under the name on external surfaces. */
  tagline: 'Controle Tecnológico de Concreto',
} as const;

export type Brand = typeof BRAND;
