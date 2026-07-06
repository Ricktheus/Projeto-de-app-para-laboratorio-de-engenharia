import { MESSAGES } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, StatusPill, TextField } from '../../components/ui';

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

  const filtered = useMemo(() => (data ?? []).filter((row) => matches(row, query)), [data, query]);

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
              <View className="flex-row items-center gap-2">
                <StatusPill tone="info" label={row.codigoRastreio} />
                {row.mandatorio28d ? <StatusPill tone="warning" label="Obrigatório" /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
