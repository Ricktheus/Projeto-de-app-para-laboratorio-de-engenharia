import {
  criarConcretagemComCpsSchema,
  messageForSupabaseError,
  type CriarConcretagemComCps,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** The RPC result: the created concretagem id and its generated CPs. */
export interface CriarConcretagemResult {
  concretagem_id: string;
  corpos_prova: Array<{
    id: string;
    codigo_rastreio: string;
    idade_alvo_dias: number;
    data_ruptura_planejada: string;
    mandatorio_28d: boolean;
  }>;
}

/**
 * Saves the concretagem and its N corpos de prova atomically via the
 * `criar_concretagem_com_cps` RPC (F-S004-5). The RPC applies the domain rules
 * server-side (mandatorio_28d on the 2 highest ages, planned rupture dates).
 */
export async function criarConcretagemComCps(
  args: CriarConcretagemComCps,
): Promise<CriarConcretagemResult> {
  // Validate the boundary before the network call (fails fast, DRY schema).
  const payload = criarConcretagemComCpsSchema.parse(args);
  const { data, error } = await supabase.rpc('criar_concretagem_com_cps', {
    concretagem: payload.concretagem,
    cps: payload.cps,
  });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return data as unknown as CriarConcretagemResult;
}
