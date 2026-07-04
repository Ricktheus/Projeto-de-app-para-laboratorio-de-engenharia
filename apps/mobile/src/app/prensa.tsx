import { AppScreen } from '../components/AppScreen';
import { EmptyState } from '../components/ui';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Press home (eng_lab). Rupture registration is implemented in S006. */
export default function PrensaRoute() {
  return (
    <ProtectedScreen area="prensa">
      <AppScreen title="Prensa">
        <EmptyState
          icon="⚙️"
          title="Nenhum corpo de prova para romper hoje."
          description="Os CPs com cura concluída aparecerão aqui."
        />
      </AppScreen>
    </ProtectedScreen>
  );
}
