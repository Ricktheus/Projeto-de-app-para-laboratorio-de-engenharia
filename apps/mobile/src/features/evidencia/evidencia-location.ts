import { type WatermarkInput } from '@concreto/shared';
import * as Location from 'expo-location';

/** The GPS/city part of a watermark (the timestamp is added at capture time). */
export type WatermarkContext = Pick<WatermarkInput, 'cidade' | 'latitude' | 'longitude'>;

const NO_LOCATION: WatermarkContext = { cidade: null, latitude: null, longitude: null };

/**
 * Reads the current city + GPS for the evidence watermark (F-S006-5). If the
 * user DENIES location (US11-CA3), or the fix/reverse-geocode fails, it returns
 * empty coordinates — the watermark is still applied without them and the
 * capture is never blocked. Native access is isolated here so the component
 * stays testable (mock this module).
 */
export async function captureWatermarkContext(): Promise<WatermarkContext> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return NO_LOCATION;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    let cidade: string | null = null;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      cidade = places[0]?.city ?? places[0]?.subregion ?? null;
    } catch {
      cidade = null;
    }
    return { cidade, latitude, longitude };
  } catch {
    return NO_LOCATION;
  }
}
