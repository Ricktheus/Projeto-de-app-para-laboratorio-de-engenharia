import { buildWatermarkLines, MESSAGES } from '@concreto/shared';
import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { BigButton, LoadingButton, StatusPill, useToast } from '../../components/ui';

import { captureWatermarkContext } from './evidencia-location';
import { capturePhoto, captureWatermarked } from './evidencia-photo';
import { uploadEvidencia, type EvidenciaTipo } from './evidencia-service';

const TIPOS: readonly { value: EvidenciaTipo; label: string }[] = [
  { value: 'antes', label: 'Antes' },
  { value: 'depois', label: 'Depois' },
];

export interface EvidenciaCaptureProps {
  rupturaId: string;
}

/**
 * Internal evidence capture (F-S006-5, US11). Takes an "antes/depois" photo,
 * burns in the watermark (date/time/city/GPS) via `react-native-view-shot`, and
 * uploads it straight to the private `evidencias` bucket. GPS-denied captures
 * still watermark (without coordinates, US11-CA3); an upload failure shows the
 * exact retry copy and keeps the local photo so the operator can try again.
 */
export function EvidenciaCapture({ rupturaId }: EvidenciaCaptureProps) {
  const { show } = useToast();
  const shotRef = useRef<View>(null);
  const [tipo, setTipo] = useState<EvidenciaTipo>('antes');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [watermarkLines, setWatermarkLines] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<EvidenciaTipo[]>([]);

  async function handleTirarFoto() {
    setCapturing(true);
    setError(null);
    try {
      const uri = await capturePhoto();
      if (!uri) {
        return; // permission denied or cancelled — no-op
      }
      const context = await captureWatermarkContext();
      setWatermarkLines(buildWatermarkLines({ capturedAt: new Date(), ...context }));
      setPhotoUri(uri);
    } finally {
      setCapturing(false);
    }
  }

  async function handleEnviar() {
    if (!photoUri) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const watermarkedUri = await captureWatermarked(shotRef);
      await uploadEvidencia({ rupturaId, tipo, uri: watermarkedUri });
      show(MESSAGES.feature.evidenciaEnviada, 'success');
      setUploaded((prev) => (prev.includes(tipo) ? prev : [...prev, tipo]));
      setPhotoUri(null); // ready for the next photo
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : MESSAGES.feature.evidenciaFalhaUpload;
      setError(message); // keep photoUri so the operator can retry
      show(message, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View className="gap-3 rounded-3xl border border-gray-200 bg-white p-4">
      <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
        Fotos de evidência (interno)
      </Text>
      <Text className="text-gray-500">
        Anexo técnico interno — não aparece no laudo do cliente.
      </Text>

      <View className="flex-row gap-2">
        {TIPOS.map((option) => {
          const selected = tipo === option.value;
          return (
            <BigButton
              key={option.value}
              label={option.label}
              variant={selected ? 'primary' : 'neutral'}
              disabled={uploading || photoUri !== null}
              onPress={() => setTipo(option.value)}
            />
          );
        })}
      </View>

      {photoUri ? (
        <View className="gap-3">
          <View ref={shotRef} collapsable={false} className="overflow-hidden rounded-2xl bg-black">
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 240 }} />
            <View className="absolute bottom-0 left-0 right-0 gap-0.5 bg-black/60 px-3 py-2">
              {watermarkLines.map((line) => (
                <Text key={line} style={{ fontSize: 13 }} className="font-medium text-white">
                  {line}
                </Text>
              ))}
            </View>
          </View>

          {error ? (
            <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
              <Text className="font-medium text-white">{error}</Text>
            </View>
          ) : null}

          <LoadingButton
            label={`Enviar foto (${tipo})`}
            loadingLabel="Enviando..."
            loading={uploading}
            onPress={handleEnviar}
          />
          <BigButton
            label="Refazer"
            variant="neutral"
            disabled={uploading}
            onPress={() => {
              setPhotoUri(null);
              setError(null);
            }}
          />
        </View>
      ) : (
        <LoadingButton
          label={`📷 Tirar foto (${tipo})`}
          loadingLabel="Abrindo câmera..."
          loading={capturing}
          onPress={handleTirarFoto}
        />
      )}

      {uploaded.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {uploaded.map((value) => (
            <StatusPill key={value} tone="success" label={`✓ ${value} enviada`} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
