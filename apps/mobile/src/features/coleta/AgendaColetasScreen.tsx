import { hoursElapsed, MESSAGES } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { BigButton, EmptyState, StatusPill } from '../../components/ui';

import { useAgendaColetas } from './useColeta';

/** Whole hours a specimen has waited in the field (for the "há Xh" label). */
function agedHours(moldedAt: string): number {
  return Math.max(0, Math.floor(hoursElapsed(moldedAt)));
}

/**
 * Collection agenda (F-S005-3): the specimens molded ≥ 24h ago and still
 * uncollected. A prominent "Bipar QR" action opens the scanner; when nothing is
 * due the Empty state shows the exact copy "Nenhuma coleta pendente para hoje."
 */
export function AgendaColetasScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useAgendaColetas();

  const scanButton = (
    <BigButton label="📷 Bipar QR para coletar" onPress={() => router.push('/coleta')} />
  );

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
    return (
      <View className="flex-1 gap-4">
        {scanButton}
        <EmptyState icon="✅" title={MESSAGES.feature.emptyAgendaColeta} />
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4">
      {scanButton}
      <ScrollView contentContainerClassName="gap-3 pb-6">
        {data.map((row) => {
          const hours = agedHours(row.moldedAt);
          const overdue = hours >= 24;
          return (
            <View key={row.cpId} className="gap-2 rounded-2xl border border-gray-200 bg-white p-4">
              <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
                {row.obraSigla} · {row.idadeAlvoDias}d
              </Text>
              <Text className="text-gray-500">{row.obraNome}</Text>
              <View className="flex-row items-center gap-2">
                <StatusPill label={`Moldado há ${hours}h`} tone={overdue ? 'warning' : 'info'} />
                <Text className="text-gray-400">{row.codigoRastreio}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
