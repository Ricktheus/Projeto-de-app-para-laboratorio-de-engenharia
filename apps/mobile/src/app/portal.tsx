import { AppScreen } from '../components/AppScreen';
import { EmptyState } from '../components/ui';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/**
 * Client portal home. The client-facing experience is web-first (S009); on
 * mobile the client still authenticates and is routed here.
 */
export default function PortalRoute() {
  return (
    <ProtectedScreen area="portal">
      <AppScreen title="Portal do Cliente">
        <EmptyState
          icon="📄"
          title="Nenhum laudo disponível."
          description="Seus laudos assinados aparecerão aqui para download."
        />
      </AppScreen>
    </ProtectedScreen>
  );
}
