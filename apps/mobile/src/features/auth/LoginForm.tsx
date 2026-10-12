import { BRAND, loginCredentialsSchema, type LoginCredentials } from '@concreto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { BrandGlyph } from '../../components/BrandGlyph';
import { LoadingButton } from '../../components/ui';
import { COLORS, FONTS } from '../../theme/tokens';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  isPending: boolean;
  errorMessage: string | null;
}

const INPUT_CLASS = 'rounded-xl border-2 border-concreto-200 bg-white px-4';

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
    <ScrollView className="flex-1 bg-concreto-25" contentContainerClassName="flex-grow">
      <View className="gap-4 bg-grafite px-6 pb-8 pt-16">
        <BrandGlyph size={64} />
        <View className="gap-1">
          <Text
            style={{ fontSize: 13, letterSpacing: 1.4, fontFamily: FONTS.sansSemibold }}
            className="uppercase text-sinal-500"
          >
            Rastro · {BRAND.tagline}
          </Text>
          <Text
            style={{ fontSize: 34, lineHeight: 38, fontFamily: FONTS.displayBold }}
            className="text-white"
          >
            {BRAND.nome}
          </Text>
          <Text style={{ fontSize: 16, fontFamily: FONTS.sans }} className="text-concreto-300">
            Do caminhão ao laudo assinado.
          </Text>
        </View>
      </View>
      <View style={{ height: 6, backgroundColor: COLORS.sinal }} />
      <View className="flex-1 gap-4 p-6">
        <Text style={{ fontSize: 22, fontFamily: FONTS.displayBold }} className="text-grafite">
          Entre com suas credenciais.
        </Text>

        {errorMessage ? (
          <View
            accessibilityRole="alert"
            className="rounded-xl border border-danger bg-danger-soft px-4 py-3"
          >
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
              <Text
                style={{ fontSize: 16, fontFamily: FONTS.sansMedium }}
                className="text-concreto-600"
              >
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
                style={{
                  minHeight: 56,
                  fontSize: 18,
                  fontFamily: FONTS.sans,
                  color: COLORS.grafite,
                }}
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
              <Text
                style={{ fontSize: 16, fontFamily: FONTS.sansMedium }}
                className="text-concreto-600"
              >
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
                style={{
                  minHeight: 56,
                  fontSize: 18,
                  fontFamily: FONTS.sans,
                  color: COLORS.grafite,
                }}
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
    </ScrollView>
  );
}
