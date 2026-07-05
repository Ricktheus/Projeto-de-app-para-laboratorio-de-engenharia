import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { coletarPorCodigo, listAgendaColetas, type AgendaColetaRow } from './coleta-service';

const AGENDA_KEY = ['agenda-coletas'] as const;

/** Loads today's pending collections (F-S005-3). */
export function useAgendaColetas() {
  return useQuery<AgendaColetaRow[]>({ queryKey: AGENDA_KEY, queryFn: listAgendaColetas });
}

/** Collects a CP by its scanned QR code, then refreshes the agenda (F-S005-4). */
export function useColetarCp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: coletarPorCodigo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENDA_KEY });
    },
  });
}
