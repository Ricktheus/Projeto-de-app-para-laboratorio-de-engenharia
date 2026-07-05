import {
  MESSAGES,
  messageForColetarCpError,
  selectCollectionAgenda,
  type CpStatus,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** A specimen due for collection, as shown on the agenda (F-S005-3). */
export interface AgendaColetaRow {
  cpId: string;
  codigoRastreio: string;
  obraSigla: string;
  obraNome: string;
  dataMoldagem: string;
  idadeAlvoDias: number;
  /** Molding instant (corpos_prova.created_at) — basis of the 24h rule. */
  moldedAt: string;
  status: CpStatus;
}

interface ObraEmbed {
  sigla: string;
  nome: string;
}
interface ConcretagemEmbed {
  obras: ObraEmbed | ObraEmbed[] | null;
}
interface CpAgendaRow {
  id: string;
  codigo_rastreio: string;
  data_moldagem: string;
  idade_alvo_dias: number;
  status: CpStatus;
  created_at: string;
  concretagens: ConcretagemEmbed | ConcretagemEmbed[] | null;
}

function obraOf(concretagens: CpAgendaRow['concretagens']): ObraEmbed | null {
  const concretagem = Array.isArray(concretagens) ? concretagens[0] : concretagens;
  if (!concretagem) {
    return null;
  }
  const obra = Array.isArray(concretagem.obras) ? concretagem.obras[0] : concretagem.obras;
  return obra ?? null;
}

/**
 * Lists specimens due for collection today (F-S005-3, US05-CA1): still
 * `moldado` and molded ≥ 24h ago. The DB returns all `moldado` specimens the
 * partner may see (RLS), and the shared `selectCollectionAgenda` applies the
 * 24h rule — the single definition of "due" (DRY). Younger or already-collected
 * specimens never appear; when nothing is due the list is empty (Empty state).
 */
export async function listAgendaColetas(): Promise<AgendaColetaRow[]> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select(
      'id, codigo_rastreio, data_moldagem, idade_alvo_dias, status, created_at, concretagens(obras(sigla, nome))',
    )
    .eq('status', 'moldado');
  if (error) {
    throw new Error(messageForColetarCpError(error));
  }
  const rows: AgendaColetaRow[] = ((data as CpAgendaRow[] | null) ?? []).map((cp) => {
    const obra = obraOf(cp.concretagens);
    return {
      cpId: cp.id,
      codigoRastreio: cp.codigo_rastreio,
      obraSigla: obra?.sigla ?? '',
      obraNome: obra?.nome ?? '',
      dataMoldagem: cp.data_moldagem,
      idadeAlvoDias: cp.idade_alvo_dias,
      moldedAt: cp.created_at,
      status: cp.status,
    };
  });
  return selectCollectionAgenda(rows);
}

/**
 * Collects a specimen scanned by QR (F-S005-4). The QR payload is the
 * `codigo_rastreio`; it is resolved to the CP id first (a QR without a matching
 * CP ⇒ "CP não encontrado."), then the guarded `coletar_cp` RPC performs the
 * moldado→coletado transition and stamps coletado_por/em. Business errors are
 * mapped to the exact F-S005-4 copy.
 */
export async function coletarPorCodigo(codigoRastreio: string): Promise<void> {
  const { data: cp, error: lookupError } = await supabase
    .from('corpos_prova')
    .select('id')
    .eq('codigo_rastreio', codigoRastreio)
    .maybeSingle();
  if (lookupError) {
    throw new Error(messageForColetarCpError(lookupError));
  }
  if (!cp) {
    throw new Error(MESSAGES.domain.CP_NAO_ENCONTRADO);
  }
  const { error } = await supabase.rpc('coletar_cp', { cp_id: (cp as { id: string }).id });
  if (error) {
    throw new Error(messageForColetarCpError(error));
  }
}
