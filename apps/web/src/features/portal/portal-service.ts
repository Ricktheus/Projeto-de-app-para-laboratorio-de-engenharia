import { messageForSupabaseError, type LaudoTipo } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/**
 * A signed report as listed on the client portal (F-S009-1 / US18). RLS
 * (`laudos_cliente_select`) already scopes the query to `assinado` reports of
 * the caller's `cliente_id`; `rascunho`/`pronto_assinatura`/`substituido` never
 * reach the client. The obra embed relies on `obras_cliente_select` (0017).
 */
export interface PortalLaudoRow {
  id: string;
  numero: string;
  tipo_laudo: LaudoTipo;
  versao: number;
  data_emissao: string | null;
  obra_id: string;
  obra_nome: string | null;
  obra_sigla: string | null;
  /** Public verification code — links to the anonymous validation page. */
  codigo_verificacao: string | null;
}

interface ObraJoin {
  nome: string;
  sigla: string;
}
interface PortalLaudoJoinRow {
  id: string;
  numero: string;
  tipo_laudo: LaudoTipo;
  versao: number;
  data_emissao: string | null;
  obra_id: string;
  codigo_verificacao: string | null;
  obras: ObraJoin | ObraJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const LAUDOS_BUCKET = 'laudos';
const SELECT =
  'id, numero, tipo_laudo, versao, data_emissao, obra_id, codigo_verificacao, obras(nome, sigla)';

/**
 * Lists the client's downloadable (signed) reports, newest first. The explicit
 * `status = 'assinado'` filter mirrors the RLS scope for clarity — the policy is
 * still the authoritative guard.
 */
export async function listPortalLaudos(): Promise<PortalLaudoRow[]> {
  const { data, error } = await supabase
    .from('laudos')
    .select(SELECT)
    .eq('status', 'assinado')
    .order('data_emissao', { ascending: false });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as unknown as PortalLaudoJoinRow[] | null) ?? []).map((row) => {
    const obra = firstOrSelf(row.obras);
    return {
      id: row.id,
      numero: row.numero,
      tipo_laudo: row.tipo_laudo,
      versao: row.versao,
      data_emissao: row.data_emissao,
      obra_id: row.obra_id,
      obra_nome: obra?.nome ?? null,
      obra_sigla: obra?.sigla ?? null,
      codigo_verificacao: row.codigo_verificacao,
    };
  });
}

/**
 * Mints a short-lived signed URL for the client to download the SIGNED report
 * PDF (`<laudo_id>/assinado.pdf`). The storage policy `laudos_cliente_select`
 * (0017) authorizes only the client's own `assinado` files.
 */
export async function baixarLaudoAssinado(laudoId: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(LAUDOS_BUCKET)
    .createSignedUrl(`${laudoId}/assinado.pdf`, 60);
  if (error || !data) {
    throw new Error(messageForSupabaseError(error ?? { status: 404 }));
  }
  return data.signedUrl;
}
