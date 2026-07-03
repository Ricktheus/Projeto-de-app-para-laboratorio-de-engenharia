import { AppShell } from '../../components/AppShell';
import { BigButton, EmptyState } from '../../components/ui';

/**
 * User management home (admins only: eng_lab / eng_escritorio). CRUD lands in
 * S004; here it exists so the route guard can deny socio_campo (F-S003-2 DoD).
 */
export function UsuariosPage() {
  return (
    <AppShell title="Gestão de Usuários">
      <EmptyState
        icon="👥"
        title="Nenhum usuário cadastrado além dos administradores."
        description="Cadastre clientes e a equipe interna para liberar o acesso."
        action={<BigButton>Novo usuário</BigButton>}
      />
    </AppShell>
  );
}
