import { type ObraInput } from '@concreto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../stores/auth-store';
import { listClientes } from '../clientes/clientes-service';

import { createObra, listObras, type ObraRow } from './obras-service';

const OBRAS_KEY = ['obras'] as const;
const CLIENTES_KEY = ['clientes'] as const;

/** Loads active obras for the field screen (US20-CA1). */
export function useObras() {
  return useQuery<ObraRow[]>({ queryKey: OBRAS_KEY, queryFn: listObras });
}

/** Loads clients for the obra form select (US20). */
export function useClientes() {
  return useQuery({ queryKey: CLIENTES_KEY, queryFn: listClientes });
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
