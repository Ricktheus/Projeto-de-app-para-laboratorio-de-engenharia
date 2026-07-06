import { type RupturaInput } from '@concreto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  descartarCp,
  expurgarResultado,
  getCpForRuptura,
  listRupturaAgenda,
  registrarRuptura,
  type PrensaCpRow,
} from './prensa-service';

const AGENDA_KEY = ['ruptura-agenda'] as const;
const cpKey = (cpId: string) => ['ruptura-cp', cpId] as const;

/** Loads the specimens due for rupture today (F-S006-1). */
export function useRupturaAgenda() {
  return useQuery<PrensaCpRow[]>({ queryKey: AGENDA_KEY, queryFn: listRupturaAgenda });
}

/** Loads a single specimen for the rupture form (F-S006-2). */
export function useCpForRuptura(cpId: string) {
  return useQuery<PrensaCpRow | null>({
    queryKey: cpKey(cpId),
    queryFn: () => getCpForRuptura(cpId),
    enabled: cpId.length > 0,
  });
}

/** Invalidates the agenda + the specific CP after any terminal transition. */
function useInvalidatePrensa() {
  const queryClient = useQueryClient();
  return (cpId: string) => {
    void queryClient.invalidateQueries({ queryKey: AGENDA_KEY });
    void queryClient.invalidateQueries({ queryKey: cpKey(cpId) });
  };
}

/** Registers a rupture, then refreshes the agenda + CP (F-S006-2/3). */
export function useRegistrarRuptura(cpId: string) {
  const invalidate = useInvalidatePrensa();
  return useMutation({
    mutationFn: (input: RupturaInput) => registrarRuptura(cpId, input),
    onSuccess: () => invalidate(cpId),
  });
}

/** Discards a specimen (F-S006-4), then refreshes. */
export function useDescartarCp(cpId: string) {
  const invalidate = useInvalidatePrensa();
  return useMutation({
    mutationFn: (motivo: string) => descartarCp(cpId, motivo),
    onSuccess: () => invalidate(cpId),
  });
}

/** Purges an anomalous result (F-S006-4), then refreshes. */
export function useExpurgarResultado(cpId: string) {
  const invalidate = useInvalidatePrensa();
  return useMutation({
    mutationFn: (motivo: string) => expurgarResultado(cpId, motivo),
    onSuccess: () => invalidate(cpId),
  });
}
