import * as ImagePicker from 'expo-image-picker';

/** A captured NF photo: a preview URI plus its base64 for the OCR call. */
export interface NfPhoto {
  uri: string;
  base64: string;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  base64: true,
  quality: 0.6,
  allowsEditing: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
};

function toNfPhoto(result: ImagePicker.ImagePickerResult): NfPhoto | null {
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  if (!asset?.base64) {
    return null;
  }
  return { uri: asset.uri, base64: asset.base64 };
}

/**
 * Opens the camera to photograph the NF (US01). Returns null when the user
 * cancels or denies the camera permission — the flow then falls back to
 * "Preenchimento Manual". Native access is isolated here so screens stay
 * testable (mock this module in tests).
 */
export async function captureNfPhoto(): Promise<NfPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  return toNfPhoto(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
}

/** Picks an existing NF photo from the library (alternative capture path). */
export async function pickNfFromLibrary(): Promise<NfPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  return toNfPhoto(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
}
