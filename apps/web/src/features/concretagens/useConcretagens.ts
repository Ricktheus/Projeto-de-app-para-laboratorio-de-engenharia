import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  listConcretagens,
  subscribeConcretagens,
  updateConcretagem,
  type ConcretagemPatch,
  type ConcretagemRow,
} from './concretagens-service';

export const CONCRETAGENS_KEY = ['concretagens'] as const;

/** Loads the office panel's concretagens list (F-S007-1). */
export function useConcretagens() {
  return useQuery<ConcretagemRow[]>({ queryKey: CONCRETAGENS_KEY, queryFn: listConcretagens });
}

/**
 * Keeps the panel live (F-S007-1 / US12): subscribes to realtime changes on
 * `concretagens` and invalidates the query so a pour saved on mobile appears
 * without a reload. The subscription is torn down on unmount.
 */
export function useConcretagensRealtime() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeConcretagens(() => {
        void queryClient.invalidateQueries({ queryKey: CONCRETAGENS_KEY });
      }),
    [queryClient],
  );
}

/** Edits a concretagem with optimistic locking (F-S007-2). */
export function useAtualizarConcretagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
      expectedUpdatedAt,
    }: {
      id: string;
      patch: ConcretagemPatch;
      expectedUpdatedAt: string;
    }) => updateConcretagem(id, patch, expectedUpdatedAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONCRETAGENS_KEY });
    },
  });
}
