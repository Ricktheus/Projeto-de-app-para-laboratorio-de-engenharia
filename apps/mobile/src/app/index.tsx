import { roleHome } from '@concreto/shared';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AREA_HREF } from '../routes/area-hrefs';
import { useAuthStore } from '../stores/auth-store';

/** Entry route: routes to the role home, or to /login when there's no session. */
export default function IndexRoute() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator accessibilityLabel="Carregando" />
      </View>
    );
  }
  if (status === 'unauthenticated' || !profile) {
    return <Redirect href="/login" />;
  }
  return <Redirect href={AREA_HREF[roleHome(profile.role, 'mobile')]} />;
}
