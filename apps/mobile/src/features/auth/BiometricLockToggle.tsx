import { useEffect, useState } from 'react';
import { Pressable, Switch, Text } from 'react-native';

import { useToast } from '../../components/ui';
import { isBiometricAvailable } from '../../services/biometrics';
import { getLockEnabled, setLockEnabled } from '../../services/lock-preference';

/**
 * Opt-in control for the biometric app lock (QW-22), shown in the app header.
 * Reflects the persisted per-device preference and lets the operator enable it
 * only when biometrics are actually available — enabling without hardware/
 * enrollment would lock them out, so it is refused with a clear message.
 */
export function BiometricLockToggle() {
  const { show } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [pref, avail] = await Promise.all([getLockEnabled(), isBiometricAvailable()]);
      setEnabled(pref);
      setAvailable(avail);
      setReady(true);
    })();
  }, []);

  async function handleToggle(next: boolean) {
    if (next && !available) {
      show('Nenhuma biometria cadastrada neste aparelho.', 'error');
      return;
    }
    setEnabled(next);
    await setLockEnabled(next);
    show(
      next ? 'Bloqueio por biometria ativado.' : 'Bloqueio por biometria desativado.',
      'success',
    );
  }

  // Hide entirely on devices without biometrics (nothing actionable to show).
  if (!ready || !available) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Bloqueio por biometria"
      onPress={() => void handleToggle(!enabled)}
      className="flex-row items-center gap-2"
    >
      <Text style={{ fontSize: 16 }}>🔒</Text>
      <Switch value={enabled} onValueChange={(next) => void handleToggle(next)} />
    </Pressable>
  );
}
