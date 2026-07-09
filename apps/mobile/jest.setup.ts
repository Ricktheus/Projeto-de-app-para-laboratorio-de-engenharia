// Provide dummy public env so any module that transitively reads it does not
// fail-fast during unit tests (the real values come from EXPO_PUBLIC_* at build).
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Haptics are fire-and-forget device feedback with no native binding under jest;
// stub the module so any screen that triggers it stays isolated from native.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Biometrics have no native binding under jest; default to "available + success"
// so tests can drive the lock flow, overriding per-test as needed.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));
