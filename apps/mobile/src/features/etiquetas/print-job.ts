import type { CpLabelModel } from '@concreto/shared';

import { buildLabelBytes } from '../../services/printer/escpos';
import { PrinterError, type PrinterTransport } from '../../services/printer/types';

/** Per-label checklist status (F-S005-1 US03-CA3: pendente/impressa/falhou). */
export type LabelPrintStatus = 'pendente' | 'imprimindo' | 'impressa' | 'falhou';

/** One label to print, tied to its CP. */
export interface LabelPrintItem {
  cpId: string;
  label: CpLabelModel;
}

/** Per-label timeout: an unresponsive printer marks the label failed (US03-CA2). */
export const PRINT_TIMEOUT_MS = 5000;

/** Rejects with PrinterError('TIMEOUT') if `promise` does not settle in `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PrinterError('TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Sends one label's ESC/POS buffer, bounded by the 5s timeout. */
export async function printOneLabel(
  transport: PrinterTransport,
  label: CpLabelModel,
  timeoutMs: number = PRINT_TIMEOUT_MS,
): Promise<void> {
  await withTimeout(transport.write(buildLabelBytes(label)), timeoutMs);
}

/** Progress event emitted as each label transitions. */
export interface BatchProgress {
  cpId: string;
  index: number;
  status: LabelPrintStatus;
}

export interface PrintBatchArgs {
  transport: PrinterTransport;
  items: readonly LabelPrintItem[];
  timeoutMs?: number;
  onProgress?: (progress: BatchProgress) => void;
}

/**
 * Prints N labels sequentially (F-S005-1). A single label's failure marks it
 * `falhou` and the batch CONTINUES — it never aborts, so the operator can
 * reprint just the failed ones afterward (US03). Returns per-item final
 * statuses, aligned by index with `items`.
 */
export async function printLabelBatch({
  transport,
  items,
  timeoutMs = PRINT_TIMEOUT_MS,
  onProgress,
}: PrintBatchArgs): Promise<LabelPrintStatus[]> {
  const statuses: LabelPrintStatus[] = items.map(() => 'pendente');
  for (const [index, item] of items.entries()) {
    statuses[index] = 'imprimindo';
    onProgress?.({ cpId: item.cpId, index, status: 'imprimindo' });
    let result: LabelPrintStatus;
    try {
      await printOneLabel(transport, item.label, timeoutMs);
      result = 'impressa';
    } catch {
      result = 'falhou';
    }
    statuses[index] = result;
    onProgress?.({ cpId: item.cpId, index, status: result });
  }
  return statuses;
}
