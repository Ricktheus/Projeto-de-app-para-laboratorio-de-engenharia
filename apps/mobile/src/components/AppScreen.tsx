import { type UserRole } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '../features/auth/auth-service';
import { useAuthStore } from '../stores/auth-store';

import { StatusPill } from './ui';

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  socio_campo: 'Sócio de Campo',
  eng_lab: 'Engenharia (Laboratório)',
  eng_escritorio: 'Engenharia (Escritório)',
  cliente: 'Cliente',
};

export interface AppScreenProps {
  title: string;
  children: ReactNode;
}

/** Authenticated screen layout: header with the current role and a sign-out. */
export function AppScreen({ title, children }: AppScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    setUnauthenticated();
    router.replace('/login');
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <Text style={{ fontSize: 20 }} className="font-bold text-gray-900">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={{ minHeight: 44 }}
          className="justify-center rounded-xl border border-gray-300 px-4"
        >
          <Text style={{ fontSize: 16 }} className="font-medium text-gray-700">
            Sair
          </Text>
        </Pressable>
      </View>
      {profile ? (
        <View className="px-4 pt-3">
          <StatusPill label={ROLE_LABELS[profile.role]} tone="info" />
        </View>
      ) : null}
      <View className="flex-1 justify-center p-4">{children}</View>
    </SafeAreaView>
  );
}
