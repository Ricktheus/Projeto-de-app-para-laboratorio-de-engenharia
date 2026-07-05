import { obraSchema, type ObraInput } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LoadingButton, TextField } from '../../components/ui';
import { type ClienteOption } from '../clientes/clientes-service';

/** The obra form value shape (GPS is injected by the screen, not typed here). */
export type ObraFormValues = Pick<
  ObraInput,
  'clienteId' | 'nome' | 'sigla' | 'endereco' | 'contato'
>;

export interface ObraFormProps {
  clientes: ClienteOption[];
  submitting: boolean;
  errorMessage?: string | null;
  /** Label describing the GPS capture result (US20-CA2), shown to the user. */
  gpsLabel?: string;
  onSubmit: (values: ObraFormValues) => void;
}

/**
 * "Nova obra" form (US20). Presentational: validation via the shared Zod schema,
 * Loading state (submit disabled + spinner), and a client picker. GPS handling
 * lives in the screen; here we just surface its status.
 */
export function ObraForm({
  clientes,
  submitting,
  errorMessage,
  gpsLabel,
  onSubmit,
}: ObraFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ObraFormValues>({
    resolver: zodResolver(
      obraSchema.pick({ clienteId: true, nome: true, sigla: true, endereco: true, contato: true }),
    ),
    defaultValues: { clienteId: '', nome: '', sigla: '', endereco: '', contato: '' },
  });

  return (
    <ScrollView className="w-full" contentContainerClassName="gap-4 pb-8">
      {errorMessage ? (
        <View className="rounded-2xl bg-danger px-4 py-3" accessibilityRole="alert">
          <Text style={{ fontSize: 16 }} className="font-medium text-white">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
          Cliente
        </Text>
        <Controller
          control={control}
          name="clienteId"
          render={({ field: { value, onChange } }) => (
            <View className="gap-2">
              {clientes.map((cliente) => {
                const selected = value === cliente.id;
                return (
                  <Pressable
                    key={cliente.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChange(cliente.id)}
                    style={{ minHeight: 56 }}
                    className={`justify-center rounded-2xl border px-4 ${
                      selected ? 'border-brand bg-blue-50' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text style={{ fontSize: 18 }} className="text-gray-900">
                      {cliente.nome}
                    </Text>
                  </Pressable>
                );
              })}
              {errors.clienteId ? (
                <Text className="font-medium text-danger">Selecione um cliente.</Text>
              ) : null}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="nome"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Nome da obra"
            value={value ?? ''}
            onChangeText={onChange}
            editable={!submitting}
            error={errors.nome?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="sigla"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Sigla"
            value={value ?? ''}
            onChangeText={onChange}
            editable={!submitting}
            error={errors.sigla?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="endereco"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Endereço"
            value={value ?? ''}
            onChangeText={onChange}
            editable={!submitting}
          />
        )}
      />

      {gpsLabel ? <Text className="text-gray-500">{gpsLabel}</Text> : null}

      <LoadingButton
        label="Cadastrar obra"
        loadingLabel="Salvando..."
        loading={submitting}
        onPress={handleSubmit(onSubmit)}
      />
    </ScrollView>
  );
}
