import { render, screen } from '@testing-library/react-native';

import { AgendaColetasScreen } from './AgendaColetasScreen';
import type { AgendaColetaRow } from './coleta-service';
import { useAgendaColetas } from './useColeta';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('./useColeta', () => ({ useAgendaColetas: jest.fn(), useColetarCp: jest.fn() }));

const mockedUseAgenda = useAgendaColetas as jest.MockedFunction<typeof useAgendaColetas>;
type AgendaResult = ReturnType<typeof useAgendaColetas>;

function agendaState(partial: Partial<AgendaResult>): void {
  mockedUseAgenda.mockReturnValue(partial as unknown as AgendaResult);
}

const dueRow: AgendaColetaRow = {
  cpId: 'cp-1',
  codigoRastreio: 'CP-ABCDEF01',
  obraSigla: 'OBRA-A',
  obraNome: 'Obra Alpha',
  dataMoldagem: '2026-05-20',
  idadeAlvoDias: 28,
  moldedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
  status: 'moldado',
};

afterEach(() => jest.clearAllMocks());

describe('AgendaColetasScreen (F-S005-3) — UI states', () => {
  it('Loading: shows a spinner', () => {
    agendaState({ isLoading: true });
    render(<AgendaColetasScreen />);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('Empty: shows the exact "Nenhuma coleta pendente para hoje." copy + scan CTA', () => {
    agendaState({ isLoading: false, isError: false, data: [] });
    render(<AgendaColetasScreen />);
    expect(screen.getByText('Nenhuma coleta pendente para hoje.')).toBeTruthy();
    expect(screen.getByText('📷 Bipar QR para coletar')).toBeTruthy();
  });

  it('Error: shows the generic server-error copy', () => {
    agendaState({ isLoading: false, isError: true });
    render(<AgendaColetasScreen />);
    expect(screen.getByText('Erro inesperado. Tente novamente em instantes.')).toBeTruthy();
  });

  it('Data: lists the due collection with obra + age', () => {
    agendaState({ isLoading: false, isError: false, data: [dueRow] });
    render(<AgendaColetasScreen />);
    expect(screen.getByText('OBRA-A · 28d')).toBeTruthy();
    expect(screen.getByText(/Moldado há 30h/)).toBeTruthy();
  });
});
