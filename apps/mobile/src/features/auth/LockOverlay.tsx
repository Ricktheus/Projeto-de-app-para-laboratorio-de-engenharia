import { BRAND } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { BigButton, LoadingButton } from '../../components/ui';
import { authenticateBiometric } from '../../services/biometrics';
import { useAuthStore } from '../../stores/auth-store';

import { signOut } from './auth-service';

const UNLOCK_REASON = 'Desbloqueie para acessar o aplicativo';

/**
 * Full-screen lock (QW-22) shown while an authenticated session is `locked`.
 * Prompts for biometrics on mount and offers a manual retry; on success it
 * unlocks, revealing the app underneath (the session was never dropped). "Sair"
 * is always available as an escape hatch (signs out and returns to login).
 */
export function LockOverlay() {
  const unlock = useAuthStore((s) => s.unlock);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);

  const tryUnlock = useCallback(async () => {
    setAuthenticating(true);
    const ok = await authenticateBiometric(UNLOCK_REASON);
    setAuthenticating(false);
    if (ok) {
      unlock();
    }
  }, [unlock]);

  // Prompt automatically when the lock appears.
  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  async function handleSignOut() {
    await signOut();
    setUnauthenticated();
    router.replace('/login');
  }

  return (
    <View className="absolute inset-0 items-center justify-center gap-6 bg-gray-100 p-8">
      <View className="items-center gap-2">
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={{ fontSize: 22 }} className="text-center font-bold text-gray-900">
          {BRAND.nome}
        </Text>
        <Text className="text-center text-gray-500">
          Aplicativo bloqueado. Desbloqueie com sua biometria para continuar.
        </Text>
      </View>
      <View className="w-full max-w-sm gap-3">
        <LoadingButton
          label="Desbloquear"
          loadingLabel="Verificando…"
          loading={authenticating}
          onPress={() => void tryUnlock()}
        />
        <BigButton label="Sair" variant="neutral" onPress={handleSignOut} />
      </View>
    </View>
  );
}
