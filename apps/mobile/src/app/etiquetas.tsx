import { useLocalSearchParams } from 'expo-router';

import { AppScreen } from '../components/AppScreen';
import { EtiquetasScreen } from '../features/etiquetas/EtiquetasScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Bluetooth label printing / reprint for an obra's concretagens (F-S005-1/2). */
export default function EtiquetasRoute() {
  const params = useLocalSearchParams<{ obraId?: string; highlight?: string }>();
  const obraId = typeof params.obraId === 'string' ? params.obraId : '';
  const highlightId = typeof params.highlight === 'string' ? params.highlight : undefined;
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Etiquetas">
        <EtiquetasScreen obraId={obraId} highlightId={highlightId} />
      </AppScreen>
    </ProtectedScreen>
  );
}
