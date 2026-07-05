import { MESSAGES } from '@concreto/shared';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BigButton, EmptyState, useToast } from '../../components/ui';

import { useColetarCp } from './useColeta';

interface ScanFeedback {
  kind: 'success' | 'error';
  message: string;
}

/**
 * QR scan-to-collect (F-S005-4, US06). The camera reads the CP's QR
 * (`codigo_rastreio`); a scan calls the guarded `coletar_cp` flow. A valid
 * `moldado` CP becomes `coletado`; the sad paths surface the exact copy
 * ("CP não encontrado." / "CP já coletado." / "Este CP não pode ser
 * coletado…"). A brief loading state covers the transition and the reading
 * frame + colored result give visual feedback. Scanning pauses after each read
 * until the operator taps "Bipar próximo CP" (prevents double submission).
 */
export function ColetaScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const coletar = useColetarCp();
  const { show } = useToast();
  const lockRef = useRef(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  async function handleScanned(result: BarcodeScanningResult) {
    if (lockRef.current || coletar.isPending) {
      return;
    }
    lockRef.current = true; // pause until the operator scans the next CP
    setFeedback(null);
    try {
      await coletar.mutateAsync(result.data);
      setFeedback({ kind: 'success', message: MESSAGES.feature.coletaConfirmada });
      show(MESSAGES.feature.coletaConfirmada, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : MESSAGES.http.serverError;
      setFeedback({ kind: 'error', message });
      show(message, 'error');
    }
  }

  function scanNext() {
    lockRef.current = false;
    setFeedback(null);
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
        action={<BigButton label="Permitir câmera" onPress={() => void requestPermission()} />}
      />
    );
  }

  const showResult = feedback !== null || coletar.isPending;

  return (
    <View className="flex-1 gap-4">
      <View style={{ height: 360 }} className="overflow-hidden rounded-3xl bg-black">
        {showResult ? (
          <View className="flex-1 items-center justify-center gap-3 p-4">
            {coletar.isPending ? (
              <>
                <ActivityIndicator color="#ffffff" size="large" />
                <Text className="font-medium text-white">Registrando coleta…</Text>
              </>
            ) : (
              <Text
                style={{ fontSize: 20 }}
                accessibilityRole="alert"
                className={`text-center font-bold ${
                  feedback?.kind === 'success' ? 'text-green-300' : 'text-red-300'
                }`}
              >
                {feedback?.message}
              </Text>
            )}
          </View>
        ) : (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(result) => void handleScanned(result)}
          >
            <View className="flex-1 items-center justify-center">
              <View
                style={{ width: 220, height: 220 }}
                className="rounded-2xl border-4 border-white/80"
              />
            </View>
          </CameraView>
        )}
      </View>

      {!coletar.isPending && feedback ? (
        <BigButton label="Bipar próximo CP" onPress={scanNext} />
      ) : (
        <Text className="text-center text-gray-500">
          Aponte a câmera para o QR Code do corpo de prova.
        </Text>
      )}
    </View>
  );
}
