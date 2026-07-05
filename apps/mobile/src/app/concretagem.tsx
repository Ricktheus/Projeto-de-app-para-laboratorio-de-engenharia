import { AppScreen } from '../components/AppScreen';
import { ConcretagemScreen } from '../features/concretagem/ConcretagemScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Concretagem + OCR flow for socio_campo (F-S004-4/5), opened from an obra. */
export default function ConcretagemRoute() {
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Nova concretagem">
        <ConcretagemScreen />
      </AppScreen>
    </ProtectedScreen>
  );
}
