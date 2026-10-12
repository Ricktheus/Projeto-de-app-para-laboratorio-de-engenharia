import { type UserRole } from '@concreto/shared';
import { useRouter } from 'expo-router';
import { SignOut } from 'phosphor-react-native';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BiometricLockToggle } from '../features/auth/BiometricLockToggle';
import { signOut } from '../features/auth/auth-service';
import { useAuthStore } from '../stores/auth-store';
import { COLORS, FONTS } from '../theme/tokens';

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  socio_campo: 'Sócio de Campo',
  eng_lab: 'Engenharia (Laboratório)',
  eng_escritorio: 'Engenharia (Escritório)',
  cliente: 'Cliente',
};

/** Hazard stripe — the "sinalização" signature under the header. */
function HazardStripe() {
  return (
    <View className="h-1.5 flex-row overflow-hidden bg-grafite">
      {Array.from({ length: 40 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 14,
            marginRight: 10,
            backgroundColor: COLORS.sinal,
            transform: [{ skewX: '-45deg' }],
          }}
        />
      ))}
    </View>
  );
}

export interface AppScreenProps {
  title: string;
  /** Short context line under the title. */
  subtitle?: string;
  /**
   * `sol` (default): light field theme, max contrast in sunlight.
   * `bancada`: dark "instrument" theme for the press (plan §6.3).
   */
  theme?: 'sol' | 'bancada';
  children: ReactNode;
}

/**
 * Authenticated screen layout (redesigned): graphite header with the title in
 * Barlow, the user's role, biometric lock and sign-out; hazard stripe; content
 * on the concrete background (or the dark bench background on the press).
 */
export function AppScreen({ title, subtitle, theme = 'sol', children }: AppScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    setUnauthenticated();
    router.replace('/login');
  }

  return (
    <SafeAreaView
      edges={['top']}
      className={`flex-1 ${theme === 'bancada' ? 'bg-concreto-950' : 'bg-grafite'}`}
    >
      <View className="flex-row items-center gap-3 bg-grafite px-4 pb-3 pt-2">
        <View className="flex-1">
          {profile ? (
            <Text
              style={{ fontSize: 13, letterSpacing: 0.8, fontFamily: FONTS.sansMedium }}
              className="uppercase text-concreto-400"
            >
              {ROLE_LABELS[profile.role]}
            </Text>
          ) : null}
          <Text style={{ fontSize: 28, fontFamily: FONTS.displayBold }} className="text-white">
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 15, fontFamily: FONTS.sans }} className="text-concreto-300">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <BiometricLockToggle />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair"
          onPress={handleSignOut}
          style={{ minHeight: 48, minWidth: 48 }}
          className="items-center justify-center rounded-xl border border-concreto-700 active:bg-grafite-700"
        >
          <SignOut size={22} color={COLORS.white} />
        </Pressable>
      </View>
      <HazardStripe />
      <View className={`flex-1 p-4 ${theme === 'bancada' ? 'bg-concreto-950' : 'bg-concreto-25'}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
