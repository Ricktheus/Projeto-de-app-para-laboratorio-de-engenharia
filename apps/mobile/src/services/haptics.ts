import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptic feedback (QW-05) for the press flow: mãos sujas, olhos
 * na máquina. Every call is best-effort — failures on unsupported hardware are
 * swallowed so haptics never affect the operational outcome.
 */

/** Success buzz — a rupture was saved / a QR resolved. */
export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Error buzz — a save failed / an invalid read. */
export function hapticError(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

/** Light tap — a lightweight confirmation (e.g. a QR was captured). */
export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
