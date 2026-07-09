import { MESSAGES } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BigButton, EmptyState, TextField, useToast } from '../../components/ui';
import { useAgendaColetas } from '../coleta/useColeta';

import { ObraForm, type ObraFormValues } from './ObraForm';
import { captureDeviceLocation, type DeviceCoords } from './device-location';
import { useClientes, useCriarObra, useObras } from './useObras';

/**
 * Field home (socio_campo): the obra list and the "Nova obra" flow (US20). GPS
 * is captured on demand; a denied permission never blocks creation (US20-CA2).
 * Each obra offers "Nova concretagem", which opens the OCR flow (F-S004-4).
 */
export function ObrasScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { data: obras, isLoading, isError } = useObras();
  const { data: clientes } = useClientes();
  const { data: agenda } = useAgendaColetas();
  const criar = useCriarObra();

  const [creating, setCreating] = useState(false);
  const [gps, setGps] = useState<DeviceCoords | null>(null);
  const [gpsLabel, setGpsLabel] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const coletasPendentes = agenda?.length ?? 0;
  const filteredObras = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!obras || needle === '') {
      return obras ?? [];
    }
    return obras.filter(
      (obra) =>
        obra.nome.toLowerCase().includes(needle) ||
        obra.sigla.toLowerCase().includes(needle) ||
        (obra.cliente_nome ?? '').toLowerCase().includes(needle),
    );
  }, [obras, search]);

  async function openCreate() {
    setFormError(null);
    setCreating(true);
    setGpsLabel('Obtendo localização…');
    const coords = await captureDeviceLocation();
    setGps(coords);
    setGpsLabel(
      coords
        ? `GPS capturado (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}).`
        : 'Sem GPS (permissão negada). A obra será criada sem coordenadas.',
    );
  }

  async function handleSubmit(values: ObraFormValues) {
    setFormError(null);
    try {
      await criar.mutateAsync({
        ...values,
        gpsLatitude: gps?.latitude ?? null,
        gpsLongitude: gps?.longitude ?? null,
      });
      show(MESSAGES.feature.obraCriada, 'success');
      setCreating(false);
      setGps(null);
      setGpsLabel('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : MESSAGES.http.serverError);
    }
  }

  if (creating) {
    return (
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-1">
        <Text style={{ fontSize: 20 }} className="font-bold text-gray-900">
          Nova obra
        </Text>
        <ObraForm
          clientes={clientes ?? []}
          submitting={criar.isPending}
          errorMessage={formError}
          gpsLabel={gpsLabel}
          onSubmit={handleSubmit}
        />
        <BigButton variant="neutral" label="Cancelar" onPress={() => setCreating(false)} />
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 gap-4">
      <BigButton
        label={
          coletasPendentes > 0
            ? `📅 Agenda de Coletas (${coletasPendentes})`
            : '📅 Agenda de Coletas'
        }
        variant="neutral"
        onPress={() => router.push('/agenda')}
      />
      <BigButton label="+ Nova obra" onPress={openCreate} />

      {isLoading ? (
        <ActivityIndicator accessibilityLabel="Carregando" />
      ) : isError ? (
        <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
          <Text className="font-medium text-white">{MESSAGES.http.serverError}</Text>
        </View>
      ) : !obras || obras.length === 0 ? (
        <EmptyState icon="📋" title={MESSAGES.feature.emptyObras} />
      ) : (
        <>
          {obras.length > 4 ? (
            <TextField
              label="Buscar obra"
              placeholder="Nome, sigla ou cliente"
              value={search}
              onChangeText={setSearch}
            />
          ) : null}
          {filteredObras.length === 0 ? (
            <EmptyState icon="🔍" title="Nenhuma obra encontrada." />
          ) : (
            <ScrollView contentContainerClassName="gap-3">
              {filteredObras.map((obra) => (
                <View
                  key={obra.id}
                  className="gap-2 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
                    {obra.nome} · {obra.sigla}
                  </Text>
                  <Text className="text-gray-500">{obra.cliente_nome ?? 'Cliente'}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/concretagem',
                        params: { obraId: obra.id, sigla: obra.sigla },
                      })
                    }
                    style={{ minHeight: 56 }}
                    className="items-center justify-center rounded-2xl bg-brand"
                  >
                    <Text style={{ fontSize: 18 }} className="font-semibold text-white">
                      Nova concretagem
                    </Text>
                  </Pressable>
                  <BigButton
                    variant="neutral"
                    label="🏷️ Etiquetas"
                    onPress={() =>
                      router.push({ pathname: '/etiquetas', params: { obraId: obra.id } })
                    }
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}
