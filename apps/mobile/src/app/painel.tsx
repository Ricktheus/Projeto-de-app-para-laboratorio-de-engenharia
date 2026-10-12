import { useRouter } from 'expo-router';
import { ChartLineUp, Desktop } from 'phosphor-react-native';

import { AppScreen } from '../components/AppScreen';
import { InfoHub } from '../components/InfoHub';
import { BigButton } from '../components/ui';
import { ProtectedScreen } from '../routes/ProtectedScreen';
import { useAuthStore } from '../stores/auth-store';
import { COLORS } from '../theme/tokens';

/**
 * Panel home for the engineers on mobile. The office cockpit ("Hoje",
 * concretagens, laudos, assinatura) is web-first; here the engineer reaches the
 * press bench and is told where the rest lives.
 */
export default function PainelRoute() {
  const router = useRouter();
  const role = useAuthStore((s) => s.profile?.role);
  return (
    <ProtectedScreen area="painel">
      <AppScreen title="Painel">
        <InfoHub
          icon={<Desktop size={26} color={COLORS.sinal} weight="bold" />}
          title="O escritório fica no computador"
          text="Concretagens em tempo real, laudos pré-prontos, assinatura e o comparativo de concreteiras estão no painel web do Rastro."
          notes={[
            'Abra o painel web para conferir e assinar os laudos.',
            'As concretagens feitas no campo aparecem lá automaticamente.',
          ]}
        >
          {role === 'eng_lab' ? (
            <BigButton
              label="Abrir a Bancada (prensa)"
              variant="accent"
              icon={(c) => <ChartLineUp size={22} color={c} weight="bold" />}
              onPress={() => router.push('/prensa')}
            />
          ) : null}
        </InfoHub>
      </AppScreen>
    </ProtectedScreen>
  );
}
