import { useQuery } from '@tanstack/react-query';

import { listConcretagensParaEtiquetas, type ConcretagemEtiquetas } from './etiquetas-service';

/** Loads an obra's concretagens + labels for the print/reprint screen (S005). */
export function useEtiquetas(obraId: string) {
  return useQuery<ConcretagemEtiquetas[]>({
    queryKey: ['etiquetas', obraId],
    queryFn: () => listConcretagensParaEtiquetas(obraId),
    enabled: obraId.length > 0,
  });
}
