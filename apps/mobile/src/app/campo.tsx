import { AppScreen } from '../components/AppScreen';
import { ObrasScreen } from '../features/obras/ObrasScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Field home for socio_campo: obra list + "Nova obra"/"Nova concretagem" (S004). */
export default function CampoRoute() {
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Campo">
        <ObrasScreen />
      </AppScreen>
    </ProtectedScreen>
  );
}
