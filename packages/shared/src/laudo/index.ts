export {
  computeFcm,
  consolidarLaudo,
  laudoCobreIdade,
  type LaudoConsolidado,
  type LaudoCpResultado,
  type LaudoCurvaPonto,
  type LaudoIdadeConsolidada,
} from './consolidacao';
export { LAUDO_RPC_TOKENS, messageForLaudoRpcError, type LaudoRpcToken } from './laudo-errors';
export {
  CONSIDERACOES_FINAIS_PADRAO,
  RESSALVA_COLETA_ATRASADA,
  RESSALVA_SLUMP_FORA_TOLERANCIA,
  algumSlumpForaTolerancia,
  buildConsideracoesFinais,
  isSlumpForaTolerancia,
  type ConsideracoesFinaisInput,
  type RessalvaSlumpInput,
} from './ressalvas';
export {
  buildResistenciaChart,
  computeChartGeometry,
  type ChartGeometry,
  type ChartPoint,
  type ChartTick,
  type ResistenciaChart,
  type ResistenciaChartOptions,
} from './chart-svg';
export {
  buildLaudoReport,
  formatMedidaCp,
  formatSlump,
  type LaudoReport,
  type LaudoReportBloco,
  type LaudoReportConcretagemInput,
  type LaudoReportHeader,
  type LaudoReportInput,
} from './pdf-report';
