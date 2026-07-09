import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persisted opt-in for the biometric app lock (QW-22). Stored locally on the
 * device (not the account) — the lock is a per-device convenience. Read/write
 * are defensive: a storage failure resolves to "disabled" rather than throwing.
 */
const LOCK_KEY = 'biometric_lock_enabled';

/** Whether the biometric lock is enabled on THIS device (default false). */
export async function getLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LOCK_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Enables/disables the biometric lock on this device. */
export async function setLockEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCK_KEY, enabled ? 'true' : 'false');
  } catch {
    // Best-effort: if persistence fails the preference simply won't survive a restart.
  }
}
