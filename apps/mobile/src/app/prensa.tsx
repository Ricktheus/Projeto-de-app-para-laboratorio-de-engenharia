import { AppScreen } from '../components/AppScreen';
import { PrensaListScreen } from '../features/prensa/PrensaListScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Press home (eng_lab): the day's list of specimens due for rupture (F-S006-1). */
export default function PrensaRoute() {
  return (
    <ProtectedScreen area="prensa">
      <AppScreen title="Prensa">
        <PrensaListScreen />
      </AppScreen>
    </ProtectedScreen>
  );
}
