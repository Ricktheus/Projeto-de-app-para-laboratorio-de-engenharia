import { useEffect, useRef } from 'react';

import { isBiometricAvailable } from '../../services/biometrics';
import { getLockEnabled } from '../../services/lock-preference';
import { useAuthStore } from '../../stores/auth-store';

/**
 * Arms the biometric app lock on cold start (QW-22): the first time the session
 * resolves to `authenticated`, if the device opted in AND biometrics are
 * available, the app is locked until the operator re-authenticates. Runs once
 * per app launch (a ref guards re-locking on re-renders). A device that never
 * opted in, or without biometrics, is never locked — the app behaves as before.
 */
export function useAppLock(): void {
  const status = useAuthStore((s) => s.status);
  const lock = useAuthStore((s) => s.lock);
  const armedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || armedRef.current) {
      return;
    }
    armedRef.current = true;
    void (async () => {
      if ((await getLockEnabled()) && (await isBiometricAvailable())) {
        lock();
      }
    })();
  }, [status, lock]);
}
