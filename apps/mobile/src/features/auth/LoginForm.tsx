import { BRAND, loginCredentialsSchema, type LoginCredentials } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';

import { LoadingButton } from '../../components/ui';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  isPending: boolean;
  errorMessage: string | null;
}

const INPUT_CLASS = 'rounded-2xl border border-gray-300 bg-white px-4';

/**
 * Presentational login form (F-S003-1). Validates with the shared Zod schema
 * and owns the Loading UI-state (button disabled + spinner, inputs locked). It
 * is router/query-agnostic — the screen injects `onSubmit`/`isPending` — which
 * keeps it unit-testable and honors SOLID's separation of concerns.
 */
export function LoginForm({ onSubmit, isPending, errorMessage }: LoginFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <View className="flex-1 justify-center gap-4 p-6">
      <View className="gap-1">
        <Text style={{ fontSize: 24 }} className="text-center font-bold text-gray-900">
          {BRAND.nome}
        </Text>
        <Text className="text-center text-gray-500">{BRAND.tagline}</Text>
        <Text className="text-center text-gray-500">Entre com suas credenciais.</Text>
      </View>

      {errorMessage ? (
        <View accessibilityRole="alert" className="rounded-2xl bg-red-100 px-4 py-3">
          <Text style={{ fontSize: 16 }} className="font-medium text-danger">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1">
            <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
              E-mail
            </Text>
            <TextInput
              accessibilityLabel="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!isPending}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={{ minHeight: 56, fontSize: 18 }}
              className={INPUT_CLASS}
            />
            {errors.email ? (
              <Text className="font-medium text-danger">{errors.email.message}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1">
            <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
              Senha
            </Text>
            <TextInput
              accessibilityLabel="Senha"
              autoCapitalize="none"
              secureTextEntry
              editable={!isPending}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={{ minHeight: 56, fontSize: 18 }}
              className={INPUT_CLASS}
            />
            {errors.password ? (
              <Text className="font-medium text-danger">{errors.password.message}</Text>
            ) : null}
          </View>
        )}
      />

      <LoadingButton
        label="Entrar"
        loadingLabel="Entrando..."
        loading={isPending}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  );
}
