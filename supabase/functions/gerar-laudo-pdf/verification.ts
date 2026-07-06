/**
 * Anti-fraud verification code (SPEC §7.1): `sha256(laudo_id + secret)`, hex.
 * Deterministic per laudo (the QR resolves the same code across regenerations)
 * and unforgeable without the server-only `LAUDO_VERIFICATION_SECRET`. Computed
 * with Web Crypto (available in the Deno runtime).
 */
export async function computeCodigoVerificacao(laudoId: string, secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${laudoId}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Public validation URL embedded in the footer QR (SPEC §5.3 / §5.5). */
export function validationUrl(siteUrl: string, codigo: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/validar/${codigo}`;
}
