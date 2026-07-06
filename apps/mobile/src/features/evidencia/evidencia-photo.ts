import * as ImagePicker from 'expo-image-picker';
import { type RefObject } from 'react';
import { type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Opens the camera to take an evidence photo. Returns the local uri, or null
 * when the permission is denied or the operator cancels. Native access is
 * isolated here so {@link EvidenciaCapture} stays testable (mock this module).
 */
export async function capturePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== ImagePicker.PermissionStatus.GRANTED) {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.7, exif: false });
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? asset.uri : null;
}

/**
 * Renders the watermarked view (photo + overlay) to a PNG and returns its local
 * uri, ready for upload (F-S006-5). The watermark is burned in on the client
 * via `react-native-view-shot`.
 */
export async function captureWatermarked(ref: RefObject<View>): Promise<string> {
  return captureRef(ref, { format: 'png', quality: 0.9 });
}
