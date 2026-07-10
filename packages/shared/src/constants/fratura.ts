import type { TipoFratura } from '../enums.ts';

/** UI option: an enum value paired with its Portuguese label. */
export interface FraturaTipoOption {
  readonly value: TipoFratura;
  readonly label: string;
}

/**
 * The 6 fracture-type labels of the laboratory's own didactic nomenclature
 * (mappable to NBR 5739), in the exact order and wording required by PRD §2.4 /
 * US09-CA1. Rendered as the fracture picker on the press screen.
 */
export const FRATURA_TIPOS: readonly FraturaTipoOption[] = [
  { value: 'ruptura_cabeca', label: 'Ruptura de Cabeça' },
  { value: 'ruptura_face', label: 'Ruptura de Face' },
  { value: 'ruptura_parcial', label: 'Ruptura Parcial' },
  { value: 'ruptura_total', label: 'Ruptura Total' },
  { value: 'ruptura_cisalhamento', label: 'Ruptura de Cisalhamento' },
  { value: 'ruptura_trinca', label: 'Ruptura de Trinca' },
];

/** Fast lookup of the Portuguese label for a given fracture-type enum value. */
export const FRATURA_TIPO_LABELS: Readonly<Record<TipoFratura, string>> = Object.freeze(
  FRATURA_TIPOS.reduce<Record<TipoFratura, string>>(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {} as Record<TipoFratura, string>,
  ),
);
