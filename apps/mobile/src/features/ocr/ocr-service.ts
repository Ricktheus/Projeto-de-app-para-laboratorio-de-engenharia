import { type OcrNotaFiscalResponse } from '@concreto/shared';

import { invokeFunction } from '../../services/functions';

/**
 * Calls the `ocr-nota-fiscal` Edge Function (SPEC §5.1 / US01). Throws an
 * `EdgeFunctionError` whose `code` is `OCR_LIMITE` (429), `OCR_TIMEOUT` (504) or
 * `OCR_FALHA` (502) and whose `message` is the exact PT copy — the screen maps
 * all failures to the manual-entry fallback (US01-CA4/CA5).
 */
export async function readNotaFiscal(args: {
  imageBase64: string;
  concretagemRef: string;
}): Promise<OcrNotaFiscalResponse> {
  return invokeFunction<OcrNotaFiscalResponse>('ocr-nota-fiscal', {
    imageBase64: args.imageBase64,
    concretagemRef: args.concretagemRef,
  });
}
