import {
  buildOcrFormState,
  MESSAGES,
  type CriarConcretagemComCps,
  type OcrFormState,
} from '@concreto/shared';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { BigButton, EmptyState, useToast } from '../../components/ui';
import { captureNfPhoto, type NfPhoto } from '../ocr/nf-capture';
import { readNotaFiscal } from '../ocr/ocr-service';

import { ConcretagemForm, emptyConcretagemFields } from './ConcretagemForm';
import { criarConcretagemComCps } from './concretagem-service';

type Step = 'capture' | 'preview' | 'form';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * Concretagem creation flow (US01/US02): Foto → IA → formulário → revisão →
 * Salvar. "Preenchimento Manual" is always available as a fallback (US01-CA4),
 * and a "Refazer" button lets the partner retake a bad photo before sending
 * (US01-CA6). The user always reviews the form before saving.
 */
export function ConcretagemScreen() {
  const router = useRouter();
  const { show } = useToast();
  const params = useLocalSearchParams<{ obraId?: string }>();
  const obraId = typeof params.obraId === 'string' ? params.obraId : undefined;

  // Draft key scoping the OCR rate limit (max 3 attempts) for this concretagem.
  const concretagemRef = useMemo(
    () => `rascunho-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const dataConcretagem = useMemo(todayIso, []);

  const [step, setStep] = useState<Step>('capture');
  const [photo, setPhoto] = useState<NfPhoto | null>(null);
  const [initialFields, setInitialFields] = useState<OcrFormState>(emptyConcretagemFields);
  const [ocrLoading, setOcrLoading] = useState(false);

  const save = useMutation({
    mutationFn: criarConcretagemComCps,
    onSuccess: () => {
      show(MESSAGES.feature.concretagemSalva, 'success');
      router.back();
    },
    onError: (error) => {
      show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
    },
  });

  if (!obraId) {
    return (
      <EmptyState icon="⚠️" title="Obra não informada." description="Volte e selecione uma obra." />
    );
  }

  async function handleCapture() {
    const captured = await captureNfPhoto();
    if (!captured) {
      return; // Cancelled / permission denied — stay on capture; manual stays available.
    }
    setPhoto(captured);
    setStep('preview');
  }

  async function handleReadNf() {
    if (!photo) {
      return;
    }
    setOcrLoading(true);
    try {
      const response = await readNotaFiscal({ imageBase64: photo.base64, concretagemRef });
      setInitialFields(buildOcrFormState(response));
      setStep('form');
    } catch (error) {
      // US01-CA4/CA5: log, show the exact PT message, fall back to manual entry.
      console.error('[concretagem] OCR falhou:', error);
      show(error instanceof Error ? error.message : MESSAGES.domain.OCR_FALHA, 'error');
      setInitialFields(emptyConcretagemFields());
      setStep('form');
    } finally {
      setOcrLoading(false);
    }
  }

  function startManual() {
    setInitialFields(emptyConcretagemFields());
    setStep('form');
  }

  function handleSave(payload: CriarConcretagemComCps) {
    save.mutate(payload);
  }

  if (ocrLoading) {
    return (
      <View className="flex-1 items-center justify-center gap-4" accessibilityRole="progressbar">
        <ActivityIndicator size="large" accessibilityLabel="Carregando" />
        <Text style={{ fontSize: 18 }} className="font-medium text-gray-700">
          {MESSAGES.feature.ocrLendo}
        </Text>
      </View>
    );
  }

  if (step === 'form') {
    return (
      <ConcretagemForm
        obraId={obraId}
        initialFields={initialFields}
        dataConcretagem={dataConcretagem}
        saving={save.isPending}
        onSave={handleSave}
      />
    );
  }

  if (step === 'preview' && photo) {
    return (
      <View className="flex-1 gap-4">
        <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
          Confira a foto da nota fiscal
        </Text>
        <Image
          source={{ uri: photo.uri }}
          resizeMode="contain"
          accessibilityLabel="Prévia da nota fiscal"
          style={{ width: '100%', height: 280, borderRadius: 16, backgroundColor: '#e5e7eb' }}
        />
        <BigButton label="Ler nota fiscal" onPress={handleReadNf} />
        <BigButton variant="neutral" label={MESSAGES.feature.ocrRefazer} onPress={handleCapture} />
        <BigButton
          variant="neutral"
          label={MESSAGES.feature.ocrPreenchimentoManual}
          onPress={startManual}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4">
      <EmptyState
        icon="📸"
        title="Fotografe a nota fiscal"
        description="A IA lê os dados e preenche o formulário. Você sempre revisa antes de salvar."
      />
      <BigButton label="Fotografar NF" onPress={handleCapture} />
      <BigButton
        variant="neutral"
        label={MESSAGES.feature.ocrPreenchimentoManual}
        onPress={startManual}
      />
    </View>
  );
}
