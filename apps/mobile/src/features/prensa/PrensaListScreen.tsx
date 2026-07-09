import { MESSAGES } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { QrScanner } from '../../components/QrScanner';
import { BigButton, EmptyState, StatusPill, TextField } from '../../components/ui';
import { hapticLight } from '../../services/haptics';

import { type PrensaCpRow } from './prensa-service';
import { useRupturaAgenda } from './usePrensa';

function matches(row: PrensaCpRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return (
    row.codigoRastreio.toLowerCase().includes(needle) ||
    row.obraSigla.toLowerCase().includes(needle) ||
    row.nfNumero.toLowerCase().includes(needle)
  );
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Whole days a specimen is past its planned rupture date (0 when due today). */
function overdueDays(dataRupturaPlanejada: string, today: string): number {
  const planned = Date.parse(`${dataRupturaPlanejada}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(planned) || Number.isNaN(now)) {
    return 0;
  }
  return Math.max(0, Math.round((now - planned) / 86_400_000));
}

/**
 * Press list of the day (F-S006-1): `coletado` specimens due for rupture across
 * ALL clients, oldest planned date first. A QR/code search box locates a
 * specimen immediately (US07-CA2); tapping one opens its rupture form. When
 * nothing is due the Empty state shows "Nenhum CP para romper hoje."
 */
export function PrensaListScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useRupturaAgenda();
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);

  const filtered = useMemo(() => (data ?? []).filter((row) => matches(row, query)), [data, query]);
  const today = useMemo(todayIso, []);

  // QW-03: a scanned QR fills the search, locating the specimen on the day's
  // list immediately (US07-CA2) — no typing the code with gloves on.
  if (scanning) {
    return (
      <QrScanner
        hint="Aponte para o QR do corpo de prova a romper."
        onScan={(codigo) => {
          hapticLight();
          setQuery(codigo.trim());
          setScanning(false);
        }}
        onCancel={() => setScanning(false)}
      />
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
    return <EmptyState icon="⚙️" title={MESSAGES.feature.emptyPrensa} />;
  }

  return (
    <View className="flex-1 gap-4">
      <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
        {data.length} {data.length === 1 ? 'CP para romper hoje' : 'CPs para romper hoje'}
      </Text>
      <BigButton label="📷 Bipar QR do CP" variant="neutral" onPress={() => setScanning(true)} />
      <TextField
        label={MESSAGES.feature.buscarCpQr}
        placeholder="Código do CP, obra ou NF"
        autoCapitalize="characters"
        value={query}
        onChangeText={setQuery}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title={MESSAGES.domain.CP_NAO_ENCONTRADO} />
      ) : (
        <ScrollView contentContainerClassName="gap-3 pb-6">
          {filtered.map((row) => (
            <Pressable
              key={row.cpId}
              accessibilityRole="button"
              accessibilityLabel={`Romper ${row.codigoRastreio}`}
              onPress={() => router.push(`/ruptura/${row.cpId}`)}
              style={{ minHeight: 56 }}
              className="gap-2 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50"
            >
              <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
                {row.obraSigla} · {row.idadeAlvoDias}d
              </Text>
              <Text className="text-gray-500">
                {row.obraNome} · NF {row.nfNumero}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <StatusPill tone="info" label={row.codigoRastreio} />
                {row.mandatorio28d ? <StatusPill tone="warning" label="Obrigatório" /> : null}
                {overdueDays(row.dataRupturaPlanejada, today) > 0 ? (
                  <StatusPill
                    tone="danger"
                    label={`Atrasado ${overdueDays(row.dataRupturaPlanejada, today)}d`}
                  />
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
