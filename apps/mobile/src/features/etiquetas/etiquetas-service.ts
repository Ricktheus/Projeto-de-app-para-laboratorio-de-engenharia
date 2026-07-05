import {
  buildCpLabel,
  messageForSupabaseError,
  type CpLabelModel,
  type CpStatus,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** One printable label row (a CP + its derived label model). */
export interface EtiquetaRow {
  cpId: string;
  codigoRastreio: string;
  status: CpStatus;
  label: CpLabelModel;
}

/** A concretagem grouped with the labels of its specimens (F-S005-1/F-S005-2). */
export interface ConcretagemEtiquetas {
  concretagemId: string;
  dataConcretagem: string;
  nfNumero: string;
  obraSigla: string;
  labels: EtiquetaRow[];
}

interface CpRow {
  id: string;
  codigo_rastreio: string;
  data_moldagem: string;
  idade_alvo_dias: number;
  status: CpStatus;
}

interface ConcretagemRow {
  id: string;
  data_concretagem: string;
  nf_numero: string;
  obras: { sigla: string } | { sigla: string }[] | null;
  corpos_prova: CpRow[] | null;
}

function siglaOf(obras: ConcretagemRow['obras']): string {
  if (!obras) {
    return '';
  }
  return Array.isArray(obras) ? (obras[0]?.sigla ?? '') : obras.sigla;
}

/**
 * Lists an obra's concretagens (most recent first) with the printable labels of
 * each specimen — the label history that drives both "Gerar Etiquetas" (print
 * all N) and per-CP "Reimprimir" (F-S005-1 / F-S005-2). Reprint reads the
 * existing `codigo_rastreio`; it never inserts, so the code is never duplicated.
 */
export async function listConcretagensParaEtiquetas(
  obraId: string,
): Promise<ConcretagemEtiquetas[]> {
  const { data, error } = await supabase
    .from('concretagens')
    .select(
      'id, data_concretagem, nf_numero, obras(sigla), corpos_prova(id, codigo_rastreio, data_moldagem, idade_alvo_dias, status)',
    )
    .eq('obra_id', obraId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as ConcretagemRow[] | null) ?? []).map((concretagem) => {
    const obraSigla = siglaOf(concretagem.obras);
    const labels = (concretagem.corpos_prova ?? [])
      .slice()
      .sort((a, b) => a.idade_alvo_dias - b.idade_alvo_dias)
      .map<EtiquetaRow>((cp) => ({
        cpId: cp.id,
        codigoRastreio: cp.codigo_rastreio,
        status: cp.status,
        label: buildCpLabel({
          codigoRastreio: cp.codigo_rastreio,
          obraSigla,
          dataMoldagem: cp.data_moldagem,
          idadeAlvoDias: cp.idade_alvo_dias,
        }),
      }));
    return {
      concretagemId: concretagem.id,
      dataConcretagem: concretagem.data_concretagem,
      nfNumero: concretagem.nf_numero,
      obraSigla,
      labels,
    };
  });
}
