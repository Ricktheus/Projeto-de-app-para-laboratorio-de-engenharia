import { AppScreen } from '../components/AppScreen';
import { EmptyState } from '../components/ui';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Panel home for eng_escritorio (and eng_lab) on mobile. */
export default function PainelRoute() {
  return (
    <ProtectedScreen area="painel">
      <AppScreen title="Painel">
        <EmptyState
          icon="🏗️"
          title="Nenhuma concretagem cadastrada."
          description="As concretagens recebidas do campo aparecerão aqui."
        />
      </AppScreen>
    </ProtectedScreen>
  );
}
