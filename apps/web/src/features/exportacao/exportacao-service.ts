import { type ExportarExcelRequest } from '@concreto/shared';

import { invokeFunction } from '../../services/functions';

/**
 * Requests the consolidated per-concreteira Excel export (F-S009-3 / US23) via
 * the `exportar-excel` Edge Function. On success supabase-js returns the `.xlsx`
 * as a Blob; on 422 the thrown `EdgeFunctionError.message` is already the exact
 * SPEC copy ("Nenhum dado encontrado para os filtros selecionados.").
 */
export async function exportarExcel(filtros: ExportarExcelRequest): Promise<Blob> {
  return invokeFunction<Blob>('exportar-excel', filtros as unknown as Record<string, unknown>);
}

/** Triggers a browser download of the returned workbook. */
export function baixarArquivo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
