import { AppScreen } from '../components/AppScreen';
import { AgendaColetasScreen } from '../features/coleta/AgendaColetasScreen';
import { ProtectedScreen } from '../routes/ProtectedScreen';

/** Daily collection agenda for socio_campo (F-S005-3). */
export default function AgendaRoute() {
  return (
    <ProtectedScreen area="campo">
      <AppScreen title="Agenda de Coletas">
        <AgendaColetasScreen />
      </AppScreen>
    </ProtectedScreen>
  );
}
