import { useLocalSearchParams } from 'expo-router';

import { AppScreen } from '../components/AppScreen';
import { EtiquetasScreen } from '../features/etiquetas/EtiquetasScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Bluetooth label printing / reprint for an obra's concretagens (F-S005-1/2). */
export default function EtiquetasRoute() {
  const params = useLocalSearchParams<{ obraId?: string }>();
  const obraId = typeof params.obraId === 'string' ? params.obraId : '';
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Etiquetas">
        <EtiquetasScreen obraId={obraId} />
      </AppScreen>
    </ProtectedScreen>
  );
}
