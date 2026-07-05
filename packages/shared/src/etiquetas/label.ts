import { toDate, type DateInput } from '../lib/date';

/**
 * The printable contents of a single specimen label (F-S005-1). The physical
 * ESC/POS byte layout lives in the mobile printer service; this is the
 * platform-agnostic model so the fields (and the readable-ID rule) are derived
 * once and stay identical between the print job and any on-screen preview (DRY).
 */
export interface CpLabelModel {
  /** QR payload — the specimen tracking code (`corpos_prova.codigo_rastreio`). */
  codigoRastreio: string;
  /** Obra short code (sigla). */
  obraSigla: string;
  /** Molding date, formatted dd/mm/yyyy for the printed label. */
  dataMoldagem: string;
  /** Target rupture age, in days. */
  idadeAlvoDias: number;
  /** Short human-readable ID a person can match to the QR without scanning. */
  idLegivel: string;
}

/** Source row for a label: a `corpos_prova` joined with its obra sigla. */
export interface CpLabelInput {
  codigoRastreio: string;
  obraSigla: string;
  dataMoldagem: DateInput;
  idadeAlvoDias: number;
}

/** Formats an ISO/Date value as dd/mm/yyyy (pt-BR); '' when unparseable. */
export function formatLabelDate(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Derives the short human-readable ID from the tracking code: the last 6
 * alphanumeric characters, uppercased. Lets a person match a physical specimen
 * to its QR without scanning.
 *
 * [PREMISSA] The SPEC prescribes an "ID legível" on the label but no fixed
 * format; a stable 6-char suffix of the (unique) tracking code is used.
 */
export function readableIdFromCodigo(codigoRastreio: string): string {
  return codigoRastreio
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase();
}

/** Builds the printable label model for a specimen (F-S005-1). */
export function buildCpLabel(input: CpLabelInput): CpLabelModel {
  return {
    codigoRastreio: input.codigoRastreio,
    obraSigla: input.obraSigla,
    dataMoldagem: formatLabelDate(input.dataMoldagem),
    idadeAlvoDias: input.idadeAlvoDias,
    idLegivel: readableIdFromCodigo(input.codigoRastreio),
  };
}
