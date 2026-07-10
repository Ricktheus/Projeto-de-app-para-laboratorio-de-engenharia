import { roundMpa } from '../engineering/rounding.ts';
import type { CpStatus, LaudoTipo } from '../enums.ts';
import { isCpTerminal } from '../state-machines/cp.ts';

/**
 * Laudo consolidation (F-S007-3 / US13). Turns the raw specimens + rupture
 * readings of a report into the per-age view the office panel renders (KGF/MPa
 * table + FCM per age + resistance curve) and the S008 PDF later reuses. Pure
 * domain: no UI, no I/O — the aggregation rule lives ONCE here (DRY / SOLID) and
 * mirrors PRD §7.2 ("FCM = média aritmética dos MPa dos CPs válidos, excluindo
 * descartado/expurgado").
 */

/** A specimen reduced to what the report consolidation needs. */
export interface LaudoCpResultado {
  /** QR tracking code (the "CP" column of the report table). */
  codigoRastreio: string;
  /** Target rupture age in days — groups specimens into report rows. */
  idadeAlvoDias: number;
  /** Current specimen status. */
  status: CpStatus;
  /** Load in kgf (integer) — present only when the specimen was ruptured. */
  cargaRupturaKgf?: number | null;
  /** Resistance in MPa — present only when the specimen was ruptured. */
  mpaCalculado?: number | null;
}

/** One age's consolidated block of the report. */
export interface LaudoIdadeConsolidada {
  idadeAlvoDias: number;
  /** Every specimen of this age (ascending by tracking code). */
  cps: LaudoCpResultado[];
  /** The MPa readings that count toward the average (ruptured specimens only). */
  resultadosValidos: number[];
  /**
   * FCM — arithmetic mean of the valid MPa readings, rounded to 2 dp
   * (PRD §7.2). `null` when the age has no valid result yet.
   */
  fcm: number | null;
  /**
   * True when EVERY specimen of the age is `descartado`/`expurgado` — the age
   * carries no valid result and its row is NOT emitted (F-S006-4 / US10-CA3).
   */
  expurgada: boolean;
  /**
   * True when at least one specimen of the age is still non-terminal
   * (`moldado`/`coletado`) — i.e. its rupture is pending.
   */
  pendente: boolean;
}

/** The fully consolidated report data. */
export interface LaudoConsolidado {
  /** Per-age blocks, ascending by target age. */
  idades: LaudoIdadeConsolidada[];
  /**
   * Resistance curve points (age → FCM) for the ages that already have a valid
   * result, ascending. Consumed by the recharts curve (F-S007-3) and the PDF
   * chart (S008); the fck reference line is drawn by the caller.
   */
  curva: LaudoCurvaPonto[];
  /** True when any specimen of any age is still pending (non-terminal). */
  algumPendente: boolean;
  /** True when at least one age already has a valid FCM. */
  temResultado: boolean;
}

/** A single point of the resistance curve. */
export interface LaudoCurvaPonto {
  idadeAlvoDias: number;
  fcm: number;
}

/** MPa readings that count toward the FCM (ruptured specimens with a value). */
function validMpas(cps: readonly LaudoCpResultado[]): number[] {
  return cps
    .filter((cp) => cp.status === 'rompido' && typeof cp.mpaCalculado === 'number')
    .map((cp) => cp.mpaCalculado as number);
}

/**
 * Computes the FCM (mean resistance) for a set of specimens: the arithmetic
 * mean of the valid (ruptured) MPa readings, rounded to 2 dp. Returns `null`
 * when there is no valid reading (PRD §7.2).
 */
export function computeFcm(cps: readonly LaudoCpResultado[]): number | null {
  const values = validMpas(cps);
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return roundMpa(sum / values.length);
}

function compareByCodigo(a: LaudoCpResultado, b: LaudoCpResultado): number {
  return a.codigoRastreio.localeCompare(b.codigoRastreio, 'pt-BR', { numeric: true });
}

/**
 * Consolidates the report's specimens into per-age blocks (F-S007-3): each age
 * gets its specimen rows, its valid MPa readings, its FCM and the `expurgada` /
 * `pendente` flags. Ages (and the resistance curve) come out ascending.
 */
export function consolidarLaudo(cps: readonly LaudoCpResultado[]): LaudoConsolidado {
  const byIdade = new Map<number, LaudoCpResultado[]>();
  for (const cp of cps) {
    const group = byIdade.get(cp.idadeAlvoDias);
    if (group) {
      group.push(cp);
    } else {
      byIdade.set(cp.idadeAlvoDias, [cp]);
    }
  }

  const idades: LaudoIdadeConsolidada[] = [...byIdade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([idadeAlvoDias, group]) => {
      const cpsSorted = [...group].sort(compareByCodigo);
      const resultadosValidos = validMpas(cpsSorted);
      return {
        idadeAlvoDias,
        cps: cpsSorted,
        resultadosValidos,
        fcm: computeFcm(cpsSorted),
        expurgada:
          cpsSorted.length > 0 &&
          cpsSorted.every((cp) => cp.status === 'descartado' || cp.status === 'expurgado'),
        pendente: cpsSorted.some((cp) => !isCpTerminal(cp.status)),
      };
    });

  const curva: LaudoCurvaPonto[] = idades
    .filter((idade): idade is LaudoIdadeConsolidada & { fcm: number } => idade.fcm !== null)
    .map((idade) => ({ idadeAlvoDias: idade.idadeAlvoDias, fcm: idade.fcm }));

  return {
    idades,
    curva,
    algumPendente: idades.some((idade) => idade.pendente),
    temResultado: curva.length > 0,
  };
}

/**
 * Whether a report of the given type covers a specimen of `idadeAlvoDias`
 * (F-S007-3 / US13-CA2). A partial 7d/14d report covers only its own age; the
 * final report consolidates every age (7/14/28…). This is the client mirror of
 * the coverage rule the `marcar_pronto_assinatura` RPC enforces server-side.
 */
export function laudoCobreIdade(tipo: LaudoTipo, idadeAlvoDias: number): boolean {
  switch (tipo) {
    case 'parcial_7d':
      return idadeAlvoDias === 7;
    case 'parcial_14d':
      return idadeAlvoDias === 14;
    case 'final_28d':
      return true;
  }
}
