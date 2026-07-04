import { AppScreen } from '../components/AppScreen';
import { EmptyState } from '../components/ui';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Field home for socio_campo. Moldagem/coleta flows land in S004/S005. */
export default function CampoRoute() {
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Campo">
        <EmptyState
          icon="📋"
          title="Nenhuma obra cadastrada."
          description="Cadastre uma obra para iniciar as concretagens."
        />
      </AppScreen>
    </ProtectedScreen>
  );
}
