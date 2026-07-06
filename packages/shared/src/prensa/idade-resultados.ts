import type { CpStatus } from '../enums';

/** A specimen reduced to what the per-age result classification needs. */
export interface IdadeResultadoCp {
  /** Target rupture age in days (groups the specimens). */
  idadeAlvoDias: number;
  /** Current specimen status. */
  status: CpStatus;
}

/** Per-age result classification for the laudo (F-S006-4, US10-CA3). */
export interface IdadeResultado {
  idadeAlvoDias: number;
  /** How many specimens target this age. */
  total: number;
  /** Specimens with a usable result (`rompido`). */
  validos: number;
  /** Specimens discarded (`descartado`) or purged (`expurgado`). */
  descartadosOuExpurgados: number;
  /**
   * True when EVERY specimen of this age is `descartado`/`expurgado` — the age
   * carries no valid result, so it is flagged "expurgada" and the laudo for
   * that age is NOT emitted (US10-CA3). Consumed by the laudo-emission flow in
   * S007/S008; defined here because the rule belongs to the discard/purge
   * feature (F-S006-4).
   */
  expurgada: boolean;
}

/** Statuses that carry no usable result for the laudo. */
const NON_VALID_STATUSES: readonly CpStatus[] = ['descartado', 'expurgado'];

function isNonValid(status: CpStatus): boolean {
  return NON_VALID_STATUSES.includes(status);
}

/**
 * Groups specimens by target age and classifies each age's result set
 * (F-S006-4). An age is `expurgada` when all its specimens are
 * discarded/purged. Ages are returned sorted ascending by target age.
 */
export function classifyIdadesResultados(cps: readonly IdadeResultadoCp[]): IdadeResultado[] {
  const byIdade = new Map<number, IdadeResultadoCp[]>();
  for (const cp of cps) {
    const group = byIdade.get(cp.idadeAlvoDias);
    if (group) {
      group.push(cp);
    } else {
      byIdade.set(cp.idadeAlvoDias, [cp]);
    }
  }

  return [...byIdade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([idadeAlvoDias, group]) => {
      const descartadosOuExpurgados = group.filter((cp) => isNonValid(cp.status)).length;
      const validos = group.filter((cp) => cp.status === 'rompido').length;
      return {
        idadeAlvoDias,
        total: group.length,
        validos,
        descartadosOuExpurgados,
        expurgada: group.length > 0 && descartadosOuExpurgados === group.length,
      };
    });
}

/**
 * True when the given target age has NO valid result — every specimen of that
 * age is discarded/purged — so the laudo for that age must NOT be emitted
 * (F-S006-4, US10-CA3). An age with no specimens returns `false`.
 */
export function isIdadeExpurgada(
  cps: readonly IdadeResultadoCp[],
  idadeAlvoDias: number,
): boolean {
  const group = cps.filter((cp) => cp.idadeAlvoDias === idadeAlvoDias);
  return group.length > 0 && group.every((cp) => isNonValid(cp.status));
}
