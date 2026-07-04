import { AppShell } from '../../components/AppShell';
import { EmptyState } from '../../components/ui';

/** Office panel home (escritório). Feature content arrives in later sprints. */
export function PainelPage() {
  return (
    <AppShell title="Painel do Escritório">
      <EmptyState
        icon="🏗️"
        title="Nenhuma concretagem cadastrada."
        description="As concretagens recebidas do campo aparecerão aqui."
      />
    </AppShell>
  );
}
