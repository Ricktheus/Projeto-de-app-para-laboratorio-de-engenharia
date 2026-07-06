export { isRupturaDue, selectRupturaAgenda, type RupturaCandidate } from './agenda';
export { CARGA_KN_SUSPEITA_KGF, checkCargaRuptura, type CargaWarning } from './carga';
export {
  REGISTRAR_RUPTURA_TOKENS,
  messageForRegistrarRupturaError,
  type RegistrarRupturaToken,
} from './ruptura-errors';
export { DESCARTE_TOKENS, messageForDescarteError, type DescarteToken } from './descarte-errors';
export {
  classifyIdadesResultados,
  isIdadeExpurgada,
  type IdadeResultado,
  type IdadeResultadoCp,
} from './idade-resultados';
export {
  buildWatermarkLines,
  formatWatermarkTimestamp,
  formatWatermarkCoords,
  type WatermarkInput,
} from './watermark';
