import { useLocalSearchParams } from 'expo-router';

import { AppScreen } from '../../components/AppScreen';
import { RupturaFormScreen } from '../../features/prensa/RupturaFormScreen';
import { ProtectedScreen } from '../../routes/ProtectedScreen';

/** Press rupture screen for one specimen (F-S006-2/3/4/5), opened from the list. */
export default function RupturaRoute() {
  const { cpId } = useLocalSearchParams<{ cpId: string }>();
  return (
    <ProtectedScreen area="prensa">
      <AppScreen title="Ruptura">
        <RupturaFormScreen cpId={typeof cpId === 'string' ? cpId : ''} />
      </AppScreen>
    </ProtectedScreen>
  );
}
