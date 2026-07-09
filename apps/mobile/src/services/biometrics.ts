import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Defensive biometric-auth wrapper (QW-22). Every call is best-effort and never
 * throws: on a device without hardware/enrollment, or if the native module is
 * unavailable, the helpers report "unavailable"/"failed" so the caller degrades
 * gracefully (the app simply stays unlocked / the toggle is disabled).
 */

/** True only when the device has biometric hardware AND an enrolled credential. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/**
 * Prompts for biometric authentication. Returns `true` only on a confirmed
 * success; any failure/cancel/exception returns `false`.
 */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
    });
    return result.success === true;
  } catch {
    return false;
  }
}
