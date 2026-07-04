import { AppShell } from '../../components/AppShell';
import { EmptyState } from '../../components/ui';

/** Field home for socio_campo on web. Full field flow lives on mobile (S004+). */
export function CampoPage() {
  return (
    <AppShell title="Campo">
      <EmptyState
        icon="📋"
        title="Nenhuma obra cadastrada."
        description="Cadastre uma obra para iniciar as concretagens."
      />
    </AppShell>
  );
}
