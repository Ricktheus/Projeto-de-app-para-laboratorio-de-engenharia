/**
 * POST /functions/v1/exportar-excel (SPEC §5.6 / F-S009-3 / US23).
 *
 * Engineers-only export of a consolidated per-concreteira comparison of MPa/FCM
 * for the selected period (filters: período, concreteira, fck alvo, obra).
 * Returns a styled `.xlsx` binary. The aggregation is `buildComparativoConcreteira`
 * (packages/shared, DRY); this function only authorizes, queries and styles.
 *
 * Sad path:
 *   422 SEM_DADOS — "Nenhum dado encontrado para os filtros selecionados."
 */
import {
  buildComparativoConcreteira,
  exportarExcelRequestSchema,
  MESSAGES,
} from '@concreto/shared';

import { corsHeaders, errorResponse, handlePreflight } from '../_shared/http.ts';
import { isEngineer, resolveCaller, serviceClient } from '../_shared/supabase.ts';
import { loadComparativoRows } from './data.ts';
import { buildComparativoWorkbook } from './workbook.ts';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  // ----- Auth (JWT required).
  const caller = await resolveCaller(req.headers.get('Authorization'));
  if (!caller) {
    return errorResponse(401, 'NAO_AUTENTICADO', MESSAGES.http.unauthorized);
  }

  const service = serviceClient();

  // ----- Authorization: engineers only (US23).
  if (!(await isEngineer(service, caller.id))) {
    return errorResponse(403, 'SEM_PERMISSAO', MESSAGES.http.forbidden);
  }

  // ----- Validate the filter payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const parsed = exportarExcelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const filtros = parsed.data;

  try {
    const rows = await loadComparativoRows(service, filtros);
    const comparativo = buildComparativoConcreteira(rows);

    // No data for the filters ⇒ 422 SEM_DADOS (F-S009-3 sad path).
    if (comparativo.vazio) {
      return errorResponse(422, 'SEM_DADOS', MESSAGES.domain.SEM_DADOS);
    }

    const xlsx = await buildComparativoWorkbook(comparativo, filtros);
    return new Response(xlsx, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': 'attachment; filename="comparativo-concreteiras.xlsx"',
      },
    });
  } catch (error) {
    console.error('[exportar-excel] falha ao gerar planilha:', error);
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
});
