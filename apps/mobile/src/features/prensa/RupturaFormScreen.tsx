import {
  calcMpa,
  checkCargaRuptura,
  checkRange,
  cpMandatorio28dMessage,
  FRATURA_TIPO_LABELS,
  MESSAGES,
  type TipoFratura,
} from '@concreto/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { BigButton, EmptyState, LoadingButton, NumericInput, StatusPill, useToast } from '../../components/ui';
import { EvidenciaCapture } from '../evidencia/EvidenciaCapture';
import { FraturaPicker } from '../fratura/FraturaPicker';

import { MotivoPrompt } from './MotivoPrompt';
import { type PrensaCpRow } from './prensa-service';
import { useCpForRuptura, useDescartarCp, useExpurgarResultado, useRegistrarRuptura } from './usePrensa';

/** Parses a numeric field, tolerating a comma decimal separator; empty ⇒ null. */
function parseNumber(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Prominent, high-contrast live MPa readout (F-S006-2: "grande e de alto contraste"). */
function MpaDisplay({ mpa }: { mpa: number | null }) {
  return (
    <View className="items-center rounded-3xl bg-gray-900 p-6">
      <Text style={{ fontSize: 16 }} className="text-gray-300">
        Resistência calculada
      </Text>
      <Text style={{ fontSize: 48 }} className="font-bold text-white" accessibilityLabel="MPa calculado">
        {mpa !== null ? mpa.toFixed(2) : '—'}
      </Text>
      <Text style={{ fontSize: 18 }} className="text-gray-300">
        MPa
      </Text>
    </View>
  );
}

/** Result view: MPa + evidence photos + purge action. Post-rupture or for a
 *  specimen already `rompido` reached via QR search (F-S006-4/5). */
function RupturaResult({
  cpId,
  rupturaId,
  mpa,
}: {
  cpId: string;
  rupturaId: string;
  mpa: number | null;
}) {
  const router = useRouter();
  const { show } = useToast();
  const expurgar = useExpurgarResultado(cpId);
  const [purging, setPurging] = useState(false);

  function handleExpurgar(motivo: string) {
    expurgar.mutate(motivo, {
      onSuccess: () => {
        show(MESSAGES.feature.resultadoExpurgado, 'success');
        router.back();
      },
      onError: (error) => show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error'),
    });
  }

  return (
    <ScrollView contentContainerClassName="gap-4 pb-8">
      <StatusPill tone="success" label="CP rompido" />
      <MpaDisplay mpa={mpa} />
      <EvidenciaCapture rupturaId={rupturaId} />

      {purging ? (
        <MotivoPrompt
          title="Descartar Resultado (expurgar da média)"
          confirmLabel="Descartar Resultado"
          submitting={expurgar.isPending}
          onConfirm={handleExpurgar}
          onCancel={() => setPurging(false)}
        />
      ) : (
        <View className="gap-2">
          <BigButton label="Descartar Resultado" variant="danger" onPress={() => setPurging(true)} />
          <BigButton label="Concluir" variant="neutral" onPress={() => router.back()} />
        </View>
      )}
    </ScrollView>
  );
}

/** Rupture entry form for a `coletado` specimen (F-S006-2/3). */
function RupturaInputForm({ cp }: { cp: PrensaCpRow }) {
  const router = useRouter();
  const { show } = useToast();
  const registrar = useRegistrarRuptura(cp.cpId);
  const descartar = useDescartarCp(cp.cpId);

  const [peso, setPeso] = useState('');
  const [diametro, setDiametro] = useState('');
  const [altura, setAltura] = useState('');
  const [carga, setCarga] = useState('');
  const [tipoFratura, setTipoFratura] = useState<TipoFratura | null>(null);
  const [fraturaError, setFraturaError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [registered, setRegistered] = useState<{ rupturaId: string; mpa: number } | null>(null);

  const cargaKgf = parseNumber(carga);
  const diametroMm = parseNumber(diametro);
  const alturaMm = parseNumber(altura);
  const mpa = cargaKgf !== null && cargaKgf > 0 ? calcMpa({ cargaKgf, dNominalMm: cp.diametroNominalMm }) : null;
  const cargaWarning = cargaKgf !== null ? checkCargaRuptura(cargaKgf) : null;
  const diametroWarning = diametroMm !== null ? checkRange('diametroMedidoMm', diametroMm) : { ok: true as const };
  const alturaWarning = alturaMm !== null ? checkRange('alturaMedidaMm', alturaMm) : { ok: true as const };

  // Proactive US08-CA4 block: a mandatory-28d CP before its planned age.
  const mandatorioBlock = cp.mandatorio28d && cp.dataRupturaPlanejada > todayIso();
  const canSubmit = cargaKgf !== null && cargaKgf > 0 && !mandatorioBlock;

  if (registered) {
    return <RupturaResult cpId={cp.cpId} rupturaId={registered.rupturaId} mpa={registered.mpa} />;
  }

  function handleSalvarPress() {
    if (!tipoFratura) {
      setFraturaError(MESSAGES.feature.selecioneFratura);
      show(MESSAGES.feature.selecioneFratura, 'error');
      return;
    }
    setFraturaError(undefined);
    setConfirming(true);
  }

  function handleConfirmar() {
    if (!tipoFratura || cargaKgf === null) {
      return;
    }
    registrar.mutate(
      {
        pesoG: parseNumber(peso) ?? undefined,
        diametroMm: diametroMm ?? undefined,
        alturaMm: alturaMm ?? undefined,
        cargaRupturaKgf: cargaKgf,
        tipoFratura,
      },
      {
        onSuccess: (result) => {
          show(MESSAGES.feature.rupturaRegistrada, 'success');
          setRegistered({ rupturaId: result.rupturaId, mpa: result.mpaCalculado });
        },
        onError: (error) => {
          setConfirming(false); // keep the typed inputs
          show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error');
        },
      },
    );
  }

  function handleDescartar(motivo: string) {
    descartar.mutate(motivo, {
      onSuccess: () => {
        show(MESSAGES.feature.cpDescartado, 'success');
        router.back();
      },
      onError: (error) => show(error instanceof Error ? error.message : MESSAGES.http.serverError, 'error'),
    });
  }

  if (discarding) {
    return (
      <MotivoPrompt
        title="Descartar CP (danificado antes do ensaio)"
        confirmLabel="Descartar CP"
        submitting={descartar.isPending}
        onConfirm={handleDescartar}
        onCancel={() => setDiscarding(false)}
      />
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-4 pb-8">
      <View className="gap-1">
        <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
          {cp.obraSigla} · {cp.idadeAlvoDias}d · NF {cp.nfNumero}
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusPill tone="info" label={`Molde nominal ${cp.diametroNominalMm} mm`} />
          {cp.mandatorio28d ? <StatusPill tone="warning" label="Obrigatório" /> : null}
        </View>
      </View>

      {mandatorioBlock ? (
        <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
          <Text className="font-medium text-white">
            {cpMandatorio28dMessage({ idade: cp.idadeAlvoDias, data: cp.dataRupturaPlanejada })}
          </Text>
        </View>
      ) : null}

      <MpaDisplay mpa={mpa} />

      <NumericInput label="Carga de ruptura" suffix="kgf" value={carga} onChangeText={setCarga} />
      {cargaWarning ? (
        <Text className="font-medium text-warning" accessibilityRole="alert">
          {cargaWarning.message}
        </Text>
      ) : null}

      <NumericInput label="Peso" suffix="g" value={peso} onChangeText={setPeso} />
      <NumericInput label="Diâmetro medido" suffix="mm" value={diametro} onChangeText={setDiametro} />
      {!diametroWarning.ok && diametroWarning.message ? (
        <Text className="font-medium text-warning">{diametroWarning.message}</Text>
      ) : null}
      <NumericInput label="Altura medida" suffix="mm" value={altura} onChangeText={setAltura} />
      {!alturaWarning.ok && alturaWarning.message ? (
        <Text className="font-medium text-warning">{alturaWarning.message}</Text>
      ) : null}

      <FraturaPicker value={tipoFratura} onChange={setTipoFratura} error={fraturaError} />

      {confirming ? (
        <View className="gap-3 rounded-3xl border border-brand bg-blue-50 p-4">
          <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
            Confirmar ruptura?
          </Text>
          <Text className="text-gray-700">
            {mpa !== null ? `${mpa.toFixed(2)} MPa` : '—'} ·{' '}
            {tipoFratura ? FRATURA_TIPO_LABELS[tipoFratura] : ''}
          </Text>
          <LoadingButton
            label="Confirmar e salvar"
            loadingLabel="Salvando..."
            loading={registrar.isPending}
            onPress={handleConfirmar}
          />
          <BigButton
            label="Voltar"
            variant="neutral"
            disabled={registrar.isPending}
            onPress={() => setConfirming(false)}
          />
        </View>
      ) : (
        <View className="gap-2">
          <BigButton label="Salvar Ruptura" disabled={!canSubmit} onPress={handleSalvarPress} />
          <BigButton label="Descartar CP" variant="danger" onPress={() => setDiscarding(true)} />
        </View>
      )}
    </ScrollView>
  );
}

export interface RupturaFormScreenProps {
  cpId: string;
}

/**
 * Press screen for one specimen (F-S006-2/3/4/5). Routes by CP status:
 *  - `coletado`  ⇒ rupture entry form (live MPa, fracture, discard);
 *  - `rompido`   ⇒ result + evidence photos + purge;
 *  - terminal    ⇒ read-only status.
 */
export function RupturaFormScreen({ cpId }: RupturaFormScreenProps) {
  const { data: cp, isLoading, isError } = useCpForRuptura(cpId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator accessibilityLabel="Carregando" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
        <Text className="font-medium text-white">{MESSAGES.http.serverError}</Text>
      </View>
    );
  }
  if (!cp) {
    return <EmptyState icon="🔍" title={MESSAGES.domain.CP_NAO_ENCONTRADO} />;
  }
  if (cp.status === 'coletado') {
    return <RupturaInputForm cp={cp} />;
  }
  if (cp.status === 'rompido' && cp.rupturaId) {
    return <RupturaResult cpId={cp.cpId} rupturaId={cp.rupturaId} mpa={cp.mpaCalculado} />;
  }
  return (
    <EmptyState
      icon="🚫"
      title={`Este CP está ${cp.status}.`}
      description="Não há ação de ruptura disponível para este corpo de prova."
    />
  );
}
