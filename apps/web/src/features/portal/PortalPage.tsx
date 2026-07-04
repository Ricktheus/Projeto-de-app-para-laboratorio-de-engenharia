import { AppShell } from '../../components/AppShell';
import { EmptyState } from '../../components/ui';

/** Client portal home. Signed-laudo listing/download arrives in S009. */
export function PortalPage() {
  return (
    <AppShell title="Portal do Cliente">
      <EmptyState
        icon="📄"
        title="Nenhum laudo disponível."
        description="Seus laudos assinados aparecerão aqui para download."
      />
    </AppShell>
  );
}
