import { formatIsoDateBr, MESSAGES } from '@concreto/shared';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { BigButton, EmptyState, StatusPill, type StatusTone } from '../../components/ui';

import type { ConcretagemEtiquetas, EtiquetaRow } from './etiquetas-service';
import type { LabelPrintStatus } from './print-job';
import { useEtiquetas } from './useEtiquetas';
import { usePrinterSession } from './usePrinterSession';

/** Visual mapping for the per-label checklist (F-S005-1 US03-CA3). */
const PRINT_STATUS: Record<LabelPrintStatus, { label: string; tone: StatusTone }> = {
  pendente: { label: '🔄 Pendente', tone: 'neutral' },
  imprimindo: { label: '🖨️ Imprimindo…', tone: 'info' },
  impressa: { label: '✅ Impressa', tone: 'success' },
  falhou: { label: '❌ Falhou', tone: 'danger' },
};

interface EtiquetasScreenProps {
  obraId: string;
  /** Concretagem just created — floated to the top and badged (QW-09). */
  highlightId?: string;
}

/**
 * Bluetooth label printing (F-S005-1) and single-label reprint (F-S005-2). Lists
 * the obra's concretagens; each offers "Gerar Etiquetas" (prints all N labels),
 * a per-CP "Reimprimir" and, after a partial failure, "Reimprimir falhas"
 * (QW-10). The checklist shows impressa/falhou/pendente per label; a BLE/
 * permission problem surfaces the exact message. When arriving straight from a
 * save, the new concretagem is floated to the top and badged (QW-09).
 */
export function EtiquetasScreen({ obraId, highlightId }: EtiquetasScreenProps) {
  const { data, isLoading, isError } = useEtiquetas(obraId);
  const printer = usePrinterSession();

  // QW-09: surface the just-created concretagem first so the partner prints it
  // immediately without hunting through the obra's history.
  const ordered = data
    ? [...data].sort((a, b) => {
        if (a.concretagemId === highlightId) return -1;
        if (b.concretagemId === highlightId) return 1;
        return 0;
      })
    : data;

  function renderLabelRow(row: EtiquetaRow) {
    const status = printer.statuses[row.cpId] ?? 'pendente';
    const view = PRINT_STATUS[status];
    return (
      <View
        key={row.cpId}
        className="flex-row items-center justify-between gap-3 border-t border-gray-100 py-3"
      >
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-gray-900">
            {row.label.idadeAlvoDias}d · {row.label.idLegivel}
          </Text>
          <StatusPill label={view.label} tone={view.tone} />
        </View>
        <View style={{ width: 132 }}>
          <BigButton
            variant="neutral"
            label="Reimprimir"
            disabled={printer.busy}
            onPress={() => printer.print([{ cpId: row.cpId, label: row.label }])}
          />
        </View>
      </View>
    );
  }

  function renderConcretagem(concretagem: ConcretagemEtiquetas) {
    const isNova = concretagem.concretagemId === highlightId;
    // QW-10: labels that failed on the last attempt — reprintable in one tap.
    const failedLabels = concretagem.labels.filter(
      (row) => printer.statuses[row.cpId] === 'falhou',
    );
    return (
      <View
        key={concretagem.concretagemId}
        className={`gap-2 rounded-2xl border bg-white p-4 ${
          isNova ? 'border-brand' : 'border-gray-200'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
            {concretagem.obraSigla} · NF {concretagem.nfNumero}
          </Text>
          {isNova ? <StatusPill label="✨ Recém-criada" tone="success" /> : null}
        </View>
        <Text className="text-gray-500">
          {formatIsoDateBr(concretagem.dataConcretagem)} · {concretagem.labels.length} etiqueta(s)
        </Text>
        <BigButton
          label={`Gerar Etiquetas (${concretagem.labels.length})`}
          disabled={printer.busy || concretagem.labels.length === 0}
          accessoryLeft={printer.busy ? <ActivityIndicator color="#fff" /> : undefined}
          onPress={() =>
            printer.print(concretagem.labels.map((row) => ({ cpId: row.cpId, label: row.label })))
          }
        />
        {failedLabels.length > 0 ? (
          <BigButton
            variant="danger"
            label={`Reimprimir falhas (${failedLabels.length})`}
            disabled={printer.busy}
            onPress={() =>
              printer.print(failedLabels.map((row) => ({ cpId: row.cpId, label: row.label })))
            }
          />
        ) : null}
        {concretagem.labels.map(renderLabelRow)}
      </View>
    );
  }

  // Multi-device selection (US03-CA4): pick the printer before sending.
  if (printer.phase === 'selecting') {
    return (
      <View className="flex-1 gap-4">
        <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
          {MESSAGES.feature.selecioneImpressora}
        </Text>
        {printer.devices.map((device) => (
          <BigButton
            key={device.id}
            label={device.name}
            onPress={() => printer.selectDevice(device.id)}
          />
        ))}
        <BigButton variant="neutral" label="Cancelar" onPress={printer.cancelSelection} />
      </View>
    );
  }

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

  if (!data || data.length === 0) {
    return <EmptyState icon="🏷️" title={MESSAGES.feature.emptyEtiquetas} />;
  }

  return (
    <View className="flex-1 gap-4">
      {printer.errorMessage ? (
        <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
          <Text className="font-medium text-white">{printer.errorMessage}</Text>
        </View>
      ) : null}
      <ScrollView contentContainerClassName="gap-4 pb-6">
        {(ordered ?? []).map(renderConcretagem)}
      </ScrollView>
    </View>
  );
}
