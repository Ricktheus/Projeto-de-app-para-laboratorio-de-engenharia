import { AppShell } from '../../components/AppShell';
import { EmptyState } from '../../components/ui';

/** Press home (eng_lab). Rupture registration is implemented in S006. */
export function PrensaPage() {
  return (
    <AppShell title="Prensa">
      <EmptyState
        icon="⚙️"
        title="Nenhum corpo de prova para romper hoje."
        description="Os CPs com cura concluída aparecerão aqui."
      />
    </AppShell>
  );
}
