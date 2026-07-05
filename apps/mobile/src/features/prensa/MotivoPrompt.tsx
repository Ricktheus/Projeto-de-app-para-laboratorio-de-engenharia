import { MESSAGES } from '@concreto/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BigButton, LoadingButton, TextField } from '../../components/ui';

export interface MotivoPromptProps {
  title: string;
  /** Label for the confirm button (e.g. "Descartar CP", "Descartar Resultado"). */
  confirmLabel: string;
  submitting: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

/**
 * Captures the mandatory reason for a discard/purge (F-S006-4). An empty reason
 * is blocked client-side with the exact copy "Informe o motivo do
 * descarte/expurgo." (the RPC also enforces it server-side). Keeps the operator
 * input on error (never clears the field).
 */
export function MotivoPrompt({
  title,
  confirmLabel,
  submitting,
  onConfirm,
  onCancel,
}: MotivoPromptProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  function handleConfirm() {
    if (motivo.trim().length === 0) {
      setError(MESSAGES.feature.motivoDescarteObrigatorio);
      return;
    }
    setError(undefined);
    onConfirm(motivo.trim());
  }

  return (
    <View className="gap-4 rounded-3xl border border-gray-200 bg-white p-4">
      <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
        {title}
      </Text>
      <TextField
        label="Motivo"
        value={motivo}
        onChangeText={(text) => {
          setMotivo(text);
          if (error) {
            setError(undefined);
          }
        }}
        editable={!submitting}
        multiline
        error={error}
      />
      <View className="gap-2">
        <LoadingButton
          label={confirmLabel}
          loadingLabel="Salvando..."
          loading={submitting}
          variant="danger"
          onPress={handleConfirm}
        />
        <BigButton label="Cancelar" variant="neutral" disabled={submitting} onPress={onCancel} />
      </View>
    </View>
  );
}
