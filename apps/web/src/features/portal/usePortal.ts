import { useMutation, useQuery } from '@tanstack/react-query';

import { baixarLaudoAssinado, listPortalLaudos, type PortalLaudoRow } from './portal-service';

export const PORTAL_LAUDOS_KEY = ['portal', 'laudos'] as const;

/** Loads the client's signed reports (F-S009-1 / US18). */
export function usePortalLaudos() {
  return useQuery<PortalLaudoRow[]>({ queryKey: PORTAL_LAUDOS_KEY, queryFn: listPortalLaudos });
}

/** Downloads a signed report PDF via a short-lived signed URL (US18-CA1). */
export function useBaixarLaudoAssinado() {
  return useMutation({ mutationFn: (laudoId: string) => baixarLaudoAssinado(laudoId) });
}
