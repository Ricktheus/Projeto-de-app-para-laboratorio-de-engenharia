import {
  applyManualEdit,
  expandMoldingConfig,
  MESSAGES,
  missingRequiredFields,
  slumpCmToMm,
  type CriarConcretagemComCps,
  type MoldingConfigItem,
  type OcrField,
  type OcrFormState,
} from '@concreto/shared';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { LoadingButton, NumericInput, TextField } from '../../components/ui';

import { MoldagemConfig } from './MoldagemConfig';

/** A blank form state for the manual-entry path (nothing highlighted). */
export function emptyConcretagemFields(): OcrFormState {
  return {
    nf_numero: { value: null, highlight: false },
    fck_projeto: { value: null, highlight: false },
    volume_m3: { value: null, highlight: false },
    concreteira: { value: null, highlight: false },
    data_concretagem: { value: null, highlight: false },
  };
}

export interface ConcretagemFormProps {
  obraId: string;
  /** Prefilled OCR state, or {@link emptyConcretagemFields} for manual entry. */
  initialFields: OcrFormState;
  /** Default molding date (ISO); usually today. */
  dataConcretagem: string;
  saving: boolean;
  errorMessage?: string | null;
  onSave: (payload: CriarConcretagemComCps) => void;
}

const asString = (value: string | number | null): string => (value == null ? '' : String(value));

/**
 * Concretagem review form (US01 / US02). Shows the OCR-extracted values with a
 * yellow highlight on low-confidence/empty fields (US01-CA2); any manual edit
 * makes the manual value prevail and clears the highlight (US02-CA1). Saving is
 * blocked while a required field is empty (US01-CA3). Slump is entered in cm and
 * stored in mm. The user ALWAYS reviews before saving.
 */
export function ConcretagemForm({
  obraId,
  initialFields,
  dataConcretagem,
  saving,
  errorMessage,
  onSave,
}: ConcretagemFormProps) {
  const [fields, setFields] = useState<OcrFormState>(initialFields);
  const [molding, setMolding] = useState<MoldingConfigItem[]>([
    { idadeAlvoDias: 7, quantidade: 2 },
    { idadeAlvoDias: 28, quantidade: 2 },
  ]);
  const [slumpCm, setSlumpCm] = useState('');
  const [slumpProjetoCm, setSlumpProjetoCm] = useState('');
  const [slumpToleranciaCm, setSlumpToleranciaCm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function editField(field: OcrField, text: string) {
    setFields((prev) => applyManualEdit(prev, field, text));
  }

  function handleSave() {
    setLocalError(null);
    const missing = missingRequiredFields(fields);
    if (missing.length > 0) {
      // Re-highlight the empty required fields and block (US01-CA3).
      setFields((prev) => {
        const next = { ...prev };
        for (const field of missing) {
          next[field] = { value: prev[field].value, highlight: true };
        }
        return next;
      });
      setLocalError(MESSAGES.feature.camposObrigatorios);
      return;
    }

    let cps;
    try {
      cps = expandMoldingConfig(molding).map((idade) => ({ idade_alvo_dias: idade }));
    } catch {
      setLocalError('Configure ao menos um corpo de prova válido.');
      return;
    }
    if (cps.length === 0) {
      setLocalError('Configure ao menos um corpo de prova válido.');
      return;
    }

    const slump = slumpCm.trim() === '' ? null : slumpCmToMm(Number(slumpCm));
    const slumpProjeto = slumpProjetoCm.trim() === '' ? null : slumpCmToMm(Number(slumpProjetoCm));
    const slumpTolerancia =
      slumpToleranciaCm.trim() === '' ? null : slumpCmToMm(Number(slumpToleranciaCm));

    onSave({
      concretagem: {
        obra_id: obraId,
        data_concretagem: dataConcretagem,
        nf_numero: asString(fields.nf_numero.value),
        fck_projeto: Number(fields.fck_projeto.value),
        volume_m3: Number(fields.volume_m3.value),
        concreteira: asString(fields.concreteira.value) || null,
        slump_medido: slump,
        slump_projeto: slumpProjeto,
        slump_tolerancia: slumpTolerancia,
      },
      cps,
    });
  }

  const bannerError = errorMessage ?? localError;

  return (
    <ScrollView className="w-full" contentContainerClassName="gap-4 pb-10">
      {bannerError ? (
        <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
          <Text style={{ fontSize: 16 }} className="font-medium text-white">
            {bannerError}
          </Text>
        </View>
      ) : null}

      <TextField
        label="Número da NF"
        value={asString(fields.nf_numero.value)}
        highlight={fields.nf_numero.highlight}
        onChangeText={(t) => editField('nf_numero', t)}
        editable={!saving}
      />
      <NumericInput
        label="FCK de projeto"
        suffix="MPa"
        value={asString(fields.fck_projeto.value)}
        highlight={fields.fck_projeto.highlight}
        onChangeText={(t) => editField('fck_projeto', t)}
        editable={!saving}
      />
      <NumericInput
        label="Volume"
        suffix="m³"
        value={asString(fields.volume_m3.value)}
        highlight={fields.volume_m3.highlight}
        onChangeText={(t) => editField('volume_m3', t)}
        editable={!saving}
      />
      <TextField
        label="Concreteira"
        value={asString(fields.concreteira.value)}
        highlight={fields.concreteira.highlight}
        onChangeText={(t) => editField('concreteira', t)}
        editable={!saving}
      />
      <TextField
        label="Data da concretagem (AAAA-MM-DD)"
        value={asString(fields.data_concretagem.value) || dataConcretagem}
        highlight={fields.data_concretagem.highlight}
        onChangeText={(t) => editField('data_concretagem', t)}
        editable={!saving}
      />

      <NumericInput
        label="Slump medido"
        suffix="cm"
        value={slumpCm}
        onChangeText={setSlumpCm}
        editable={!saving}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <NumericInput
            label="Slump projeto"
            suffix="cm"
            value={slumpProjetoCm}
            onChangeText={setSlumpProjetoCm}
            editable={!saving}
          />
        </View>
        <View className="flex-1">
          <NumericInput
            label="Tolerância"
            suffix="cm"
            value={slumpToleranciaCm}
            onChangeText={setSlumpToleranciaCm}
            editable={!saving}
          />
        </View>
      </View>

      <MoldagemConfig items={molding} onChange={setMolding} />

      <LoadingButton
        label="Salvar concretagem"
        loadingLabel="Salvando..."
        loading={saving}
        onPress={handleSave}
      />
    </ScrollView>
  );
}
