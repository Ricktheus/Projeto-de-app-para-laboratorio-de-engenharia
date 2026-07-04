import { type ObraInput } from '@concreto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../stores/auth-store';

import {
  createObra,
  excluirObra,
  inativarObra,
  listObras,
  updateObra,
  type ObraRow,
} from './obras-service';

const OBRAS_KEY = ['obras'] as const;

/** Loads the obra list with client names (F-S004-2/3). */
export function useObras() {
  return useQuery<ObraRow[]>({ queryKey: OBRAS_KEY, queryFn: listObras });
}

/** Creates an obra, stamping `criado_por` with the current user (US20). */
export function useCriarObra() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: (input: ObraInput) => {
      if (!userId) {
        throw new Error('Sessão inválida.');
      }
      return createObra(input, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBRAS_KEY });
    },
  });
}

type UpdatePatch = Pick<ObraInput, 'nome' | 'sigla' | 'endereco' | 'contato'>;

/** Edits an obra (US21). */
export function useAtualizarObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePatch }) => updateObra(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBRAS_KEY });
    },
  });
}

/** Inactivates an obra (soft-delete, US21). */
export function useInativarObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inativarObra,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBRAS_KEY });
    },
  });
}

/** Attempts to delete an obra, blocking when it has concretagens (US21-CA1). */
export function useExcluirObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: excluirObra,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBRAS_KEY });
    },
  });
}
