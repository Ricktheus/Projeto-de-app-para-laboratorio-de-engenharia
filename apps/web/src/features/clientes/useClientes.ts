import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { criarCliente, listClientes, type ClienteRow } from './clientes-service';

const CLIENTES_KEY = ['clientes'] as const;

/** Loads the client list (F-S004-1). */
export function useClientes() {
  return useQuery<ClienteRow[]>({ queryKey: CLIENTES_KEY, queryFn: listClientes });
}

/** Creates a client and refreshes the list on success. */
export function useCriarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarCliente,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTES_KEY });
    },
  });
}
