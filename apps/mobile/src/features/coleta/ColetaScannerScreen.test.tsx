import { act, render, screen } from '@testing-library/react-native';

import { ColetaScannerScreen } from './ColetaScannerScreen';
import { useColetarCp } from './useColeta';

type BarcodeHandler = (result: { data: string; type: string }) => void;
interface CameraProps {
  onBarcodeScanned?: BarcodeHandler;
}

const mockCameraState: {
  permission: [unknown, () => void];
  lastProps: CameraProps | null;
} = { permission: [{ granted: true }, jest.fn()], lastProps: null };

jest.mock('expo-camera', () => ({
  __esModule: true,
  CameraView: (props: CameraProps) => {
    mockCameraState.lastProps = props;
    return null;
  },
  useCameraPermissions: () => mockCameraState.permission,
}));
jest.mock('./useColeta', () => ({ useAgendaColetas: jest.fn(), useColetarCp: jest.fn() }));

const mockedUseColetar = useColetarCp as jest.MockedFunction<typeof useColetarCp>;
type ColetarResult = ReturnType<typeof useColetarCp>;

function coletarMock(mutateAsync: jest.Mock, isPending = false): void {
  mockedUseColetar.mockReturnValue({ mutateAsync, isPending } as unknown as ColetarResult);
}

function scan(data: string): void {
  act(() => {
    mockCameraState.lastProps?.onBarcodeScanned?.({ data, type: 'qr' });
  });
}

beforeEach(() => {
  mockCameraState.permission = [{ granted: true }, jest.fn()];
  mockCameraState.lastProps = null;
  coletarMock(jest.fn().mockResolvedValue(undefined));
});
afterEach(() => jest.clearAllMocks());

describe('ColetaScannerScreen (F-S005-4) — states & exact copy', () => {
  it('Loading: shows a spinner while the permission is unknown', () => {
    mockCameraState.permission = [null, jest.fn()];
    render(<ColetaScannerScreen />);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('Denied permission: offers to grant the camera', () => {
    mockCameraState.permission = [{ granted: false }, jest.fn()];
    render(<ColetaScannerScreen />);
    expect(screen.getByText('Permitir câmera')).toBeTruthy();
  });

  it('Granted: shows the reading instruction and wires the scanner', () => {
    render(<ColetaScannerScreen />);
    expect(screen.getByText('Aponte a câmera para o QR Code do corpo de prova.')).toBeTruthy();
    expect(mockCameraState.lastProps?.onBarcodeScanned).toBeDefined();
  });

  it('Valid QR: collects and confirms with the success copy (US06-CA1)', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    coletarMock(mutateAsync);
    render(<ColetaScannerScreen />);
    scan('CP-ABCDEF01');
    expect(mutateAsync).toHaveBeenCalledWith('CP-ABCDEF01');
    expect(await screen.findByText('CP coletado com sucesso.')).toBeTruthy();
  });

  it('Not-found QR: shows the exact "CP não encontrado." message (US06-CA2)', async () => {
    coletarMock(jest.fn().mockRejectedValue(new Error('CP não encontrado.')));
    render(<ColetaScannerScreen />);
    scan('CP-DESCONHECIDO');
    expect(await screen.findByText('CP não encontrado.')).toBeTruthy();
    // After a read the scanner pauses until the operator continues.
    expect(screen.getByText('Bipar próximo CP')).toBeTruthy();
  });

  it('Already-collected QR: shows the exact "CP já coletado." message', async () => {
    coletarMock(jest.fn().mockRejectedValue(new Error('CP já coletado.')));
    render(<ColetaScannerScreen />);
    scan('CP-JACOLETADO');
    expect(await screen.findByText('CP já coletado.')).toBeTruthy();
  });
});
