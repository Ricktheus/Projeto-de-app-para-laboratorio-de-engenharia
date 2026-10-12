import { FileText } from 'phosphor-react-native';

import { AppScreen } from '../components/AppScreen';
import { InfoHub } from '../components/InfoHub';
import { ProtectedScreen } from '../routes/ProtectedScreen';
import { COLORS } from '../theme/tokens';

/**
 * Client portal home on mobile. The client-facing experience is web-first
 * (S009); instead of an always-empty list this screen tells the client where
 * the signed reports are.
 */
export default function PortalRoute() {
  return (
    <ProtectedScreen area="portal">
      <AppScreen title="Portal do Cliente">
        <InfoHub
          icon={<FileText size={26} color={COLORS.sinal} weight="bold" />}
          title="Seus laudos estão no portal web"
          text="Acesse o portal do laboratório pelo navegador com este mesmo e-mail e senha para baixar os laudos assinados."
          notes={[
            'Cada laudo tem um QR Code de validação pública de autenticidade.',
            'Laudos aparecem assim que forem assinados pela Responsável Técnica.',
          ]}
        />
      </AppScreen>
    </ProtectedScreen>
  );
}
