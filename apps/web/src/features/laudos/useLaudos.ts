import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  agruparLaudo,
  emitirLaudoParcial,
  getLaudoDetalhe,
  listLaudoRascunhos,
  marcarProntoAssinatura,
  type LaudoDetalhe,
  type LaudoRascunhoRow,
} from './laudos-service';

export const LAUDOS_KEY = ['laudos', 'rascunhos'] as const;
const laudoDetalheKey = (id: string) => ['laudos', 'detalhe', id] as const;

/** Loads the pre-filled report drafts (F-S007-3 / US13-CA1). */
export function useLaudoRascunhos() {
  return useQuery<LaudoRascunhoRow[]>({ queryKey: LAUDOS_KEY, queryFn: listLaudoRascunhos });
}

/** Loads a single report draft with its consolidated per-age results. */
export function useLaudoDetalhe(laudoId: string | null) {
  return useQuery<LaudoDetalhe>({
    queryKey: laudoDetalheKey(laudoId ?? ''),
    queryFn: () => getLaudoDetalhe(laudoId as string),
    enabled: laudoId !== null,
  });
}

/** Invalidates both the draft list and every loaded detail after a report change. */
function useInvalidateLaudos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: LAUDOS_KEY });
    void queryClient.invalidateQueries({ queryKey: ['laudos', 'detalhe'] });
  };
}

/** Marks a draft `pronto_assinatura` (F-S007-3 sad path guarded server-side). */
export function useMarcarPronto() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (laudoId: string) => marcarProntoAssinatura(laudoId),
    onSuccess: invalidate,
  });
}

/** Emits a 7d|14d partial report on demand (US13-CA2). */
export function useEmitirParcial() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: ({ concretagemId, idadeDias }: { concretagemId: string; idadeDias: number }) =>
      emitirLaudoParcial(concretagemId, idadeDias),
    onSuccess: invalidate,
  });
}

/** Groups several NFs of the same obra into one consolidated report (US13-CA3). */
export function useAgruparLaudo() {
  const invalidate = useInvalidateLaudos();
  return useMutation({
    mutationFn: (concretagemIds: string[]) => agruparLaudo(concretagemIds),
    onSuccess: invalidate,
  });
}
