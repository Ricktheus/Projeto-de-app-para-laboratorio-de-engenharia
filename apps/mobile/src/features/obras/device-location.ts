import * as Location from 'expo-location';

/** Device coordinates, or null when unavailable/denied. */
export interface DeviceCoords {
  latitude: number;
  longitude: number;
}

/**
 * Reads the current GPS position for auto-filling an obra (US20-CA2). Returns
 * null when the user DENIES the permission or the fix fails — creating an obra
 * must never be blocked by GPS. Native access is isolated here so screens stay
 * testable (mock this module in tests).
 */
export async function captureDeviceLocation(): Promise<DeviceCoords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return null;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
