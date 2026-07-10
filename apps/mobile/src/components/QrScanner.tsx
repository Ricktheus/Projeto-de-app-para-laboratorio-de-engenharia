import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BigButton, EmptyState } from './ui';

export interface QrScannerProps {
  /** Called once with the decoded QR payload on the first read. */
  onScan: (codigo: string) => void;
  /** Dismisses the scanner without a read. */
  onCancel: () => void;
  /** Prompt shown over the reticle. */
  hint?: string;
}

/**
 * Reusable QR reader (`expo-camera`) with the permission gate handled inline.
 * Fires {@link QrScannerProps.onScan} exactly once per mount (guarded by a ref)
 * so the caller controls what happens next — locating a specimen on the press
 * list (F-S006-1 / US07-CA2), etc. Presentational only: no data access here.
 */
export function QrScanner({ onScan, onCancel, hint }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lockRef = useRef(false);

  function handleScanned(result: BarcodeScanningResult) {
    if (lockRef.current) {
      return;
    }
    lockRef.current = true; // read once — the caller decides what happens next
    onScan(result.data);
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator accessibilityLabel="Carregando" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <EmptyState
        icon="📷"
        title="Precisamos da câmera para ler o QR do corpo de prova."
        action={
          <View className="gap-2">
            <BigButton label="Permitir câmera" onPress={() => void requestPermission()} />
            <BigButton label="Cancelar" variant="neutral" onPress={onCancel} />
          </View>
        }
      />
    );
  }

  return (
    <View className="flex-1 gap-4">
      <View style={{ height: 360 }} className="overflow-hidden rounded-3xl bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScanned}
        >
          <View className="flex-1 items-center justify-center">
            <View
              style={{ width: 220, height: 220 }}
              className="rounded-2xl border-4 border-white/80"
            />
          </View>
        </CameraView>
      </View>
      <Text className="text-center text-gray-500">
        {hint ?? 'Aponte a câmera para o QR Code do corpo de prova.'}
      </Text>
      <BigButton label="Cancelar" variant="neutral" onPress={onCancel} />
    </View>
  );
}
