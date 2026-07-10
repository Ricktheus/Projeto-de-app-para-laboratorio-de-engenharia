export { isRupturaDue, selectRupturaAgenda, type RupturaCandidate } from './agenda.ts';
export { CARGA_KN_SUSPEITA_KGF, checkCargaRuptura, type CargaWarning } from './carga.ts';
export {
  REGISTRAR_RUPTURA_TOKENS,
  messageForRegistrarRupturaError,
  type RegistrarRupturaToken,
} from './ruptura-errors.ts';
export { DESCARTE_TOKENS, messageForDescarteError, type DescarteToken } from './descarte-errors.ts';
export {
  classifyIdadesResultados,
  isIdadeExpurgada,
  type IdadeResultado,
  type IdadeResultadoCp,
} from './idade-resultados.ts';
export {
  buildWatermarkLines,
  formatWatermarkTimestamp,
  formatWatermarkCoords,
  type WatermarkInput,
} from './watermark.ts';
