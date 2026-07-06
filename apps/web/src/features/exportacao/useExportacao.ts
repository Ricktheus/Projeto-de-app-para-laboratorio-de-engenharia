import { type ExportarExcelRequest } from '@concreto/shared';
import { useMutation } from '@tanstack/react-query';

import { exportarExcel } from './exportacao-service';

/** Generates the consolidated Excel export for the selected filters (US23). */
export function useExportarExcel() {
  return useMutation({ mutationFn: (filtros: ExportarExcelRequest) => exportarExcel(filtros) });
}
