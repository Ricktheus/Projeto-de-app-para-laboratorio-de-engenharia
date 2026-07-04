/**
 * Shared HTTP helpers for the Edge Functions: permissive CORS for the app
 * origins and the standard `{ error, message }` envelope (SPEC §5). Keeping the
 * envelope here means every function returns the exact same error shape the
 * client's error mapper expects.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

/** Success JSON response. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/**
 * Standard error envelope (SPEC §5): `{ error: CODIGO_MAQUINA, message: PT }`.
 * `message` is always a ready-to-render Portuguese string.
 */
export function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: code, message }, status);
}

/** Handles the CORS preflight; returns a response only for OPTIONS. */
export function handlePreflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}
