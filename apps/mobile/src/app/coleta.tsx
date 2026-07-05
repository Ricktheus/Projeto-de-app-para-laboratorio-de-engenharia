import { AppScreen } from '../components/AppScreen';
import { ColetaScannerScreen } from '../features/coleta/ColetaScannerScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** QR scan-to-collect for socio_campo (F-S005-4). */
export default function ColetaRoute() {
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Coletar CP">
        <ColetaScannerScreen />
      </AppScreen>
    </ProtectedScreen>
  );
}
