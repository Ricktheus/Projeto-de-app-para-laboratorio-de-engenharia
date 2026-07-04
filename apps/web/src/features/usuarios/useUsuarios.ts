import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { criarUsuario, listUsuarios, type UsuarioRow } from './usuarios-service';

const USUARIOS_KEY = ['usuarios'] as const;

/** Loads the internal-user list (F-S004-1). */
export function useUsuarios() {
  return useQuery<UsuarioRow[]>({ queryKey: USUARIOS_KEY, queryFn: listUsuarios });
}

/** Creates an internal user and refreshes the list on success. */
export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarUsuario,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USUARIOS_KEY });
    },
  });
}
