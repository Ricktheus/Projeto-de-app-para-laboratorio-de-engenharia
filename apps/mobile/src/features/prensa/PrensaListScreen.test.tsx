import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PrensaListScreen } from './PrensaListScreen';
import { type PrensaCpRow } from './prensa-service';
import { useRupturaAgenda } from './usePrensa';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('./usePrensa', () => ({ useRupturaAgenda: jest.fn() }));

type BarcodeHandler = (result: { data: string; type: string }) => void;
const mockCamera: { permission: [unknown, () => void]; onScan: BarcodeHandler | null } = {
  permission: [{ granted: true }, jest.fn()],
  onScan: null,
};
jest.mock('expo-camera', () => ({
  __esModule: true,
  CameraView: (props: { onBarcodeScanned?: BarcodeHandler }) => {
    mockCamera.onScan = props.onBarcodeScanned ?? null;
    return null;
  },
  useCameraPermissions: () => mockCamera.permission,
}));

const mockedAgenda = useRupturaAgenda as jest.MockedFunction<typeof useRupturaAgenda>;
type AgendaResult = ReturnType<typeof useRupturaAgenda>;

function agenda(partial: Partial<AgendaResult>): void {
  mockedAgenda.mockReturnValue({
    isLoading: false,
    isError: false,
    data: [],
    ...partial,
  } as AgendaResult);
}

const row = (over: Partial<PrensaCpRow> = {}): PrensaCpRow => ({
  cpId: 'cp-1',
  codigoRastreio: 'CP-ABCDEF01',
  obraSigla: 'OBRA-1',
  obraNome: 'Residencial X',
  nfNumero: 'NF-100',
  idadeAlvoDias: 28,
  dataRupturaPlanejada: '2026-07-01',
  diametroNominalMm: 100,
  fckProjeto: 30,
  mandatorio28d: false,
  status: 'coletado',
  rupturaId: null,
  mpaCalculado: null,
  ...over,
});

beforeEach(() => {
  mockCamera.permission = [{ granted: true }, jest.fn()];
  mockCamera.onScan = null;
});
afterEach(() => jest.clearAllMocks());

describe('PrensaListScreen (F-S006-1) — states & QR search', () => {
  it('Loading: shows a spinner', () => {
    agenda({ isLoading: true });
    render(<PrensaListScreen />);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('Error: shows the generic server-error copy', () => {
    agenda({ isError: true });
    render(<PrensaListScreen />);
    expect(screen.getByText('Erro inesperado. Tente novamente em instantes.')).toBeTruthy();
  });

  it('Empty: shows the exact "Nenhum CP para romper hoje." copy', () => {
    agenda({ data: [] });
    render(<PrensaListScreen />);
    expect(screen.getByText('Nenhum CP para romper hoje.')).toBeTruthy();
  });

  it('lists due specimens and opens the rupture form on tap', () => {
    agenda({ data: [row()] });
    render(<PrensaListScreen />);
    fireEvent.press(screen.getByLabelText('Romper CP-ABCDEF01'));
    expect(mockPush).toHaveBeenCalledWith('/ruptura/cp-1');
  });

  it('QR search filters the list; a non-match shows "CP não encontrado." (US07-CA2)', () => {
    agenda({
      data: [
        row({ cpId: 'cp-1', codigoRastreio: 'CP-AAA' }),
        row({ cpId: 'cp-2', codigoRastreio: 'CP-BBB', obraSigla: 'OBRA-2' }),
      ],
    });
    render(<PrensaListScreen />);
    fireEvent.changeText(screen.getByLabelText('Buscar por QR'), 'CP-BBB');
    expect(screen.getByLabelText('Romper CP-BBB')).toBeTruthy();
    expect(screen.queryByLabelText('Romper CP-AAA')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Buscar por QR'), 'INEXISTENTE');
    expect(screen.getByText('CP não encontrado.')).toBeTruthy();
  });

  it('scanning a QR fills the search and locates the specimen (QW-03 / US07-CA2)', () => {
    agenda({
      data: [
        row({ cpId: 'cp-1', codigoRastreio: 'CP-AAA' }),
        row({ cpId: 'cp-2', codigoRastreio: 'CP-BBB', obraSigla: 'OBRA-2' }),
      ],
    });
    render(<PrensaListScreen />);

    fireEvent.press(screen.getByRole('button', { name: '📷 Bipar QR do CP' }));
    // The camera is mounted; simulate a read of CP-BBB's QR.
    act(() => mockCamera.onScan?.({ data: 'CP-BBB', type: 'qr' }));

    expect(screen.getByLabelText('Romper CP-BBB')).toBeTruthy();
    expect(screen.queryByLabelText('Romper CP-AAA')).toBeNull();
  });
});
