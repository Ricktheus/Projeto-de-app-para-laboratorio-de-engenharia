import { buildCpLabel } from '@concreto/shared';
import { render, screen } from '@testing-library/react-native';

import { EtiquetasScreen } from './EtiquetasScreen';
import type { ConcretagemEtiquetas } from './etiquetas-service';
import { useEtiquetas } from './useEtiquetas';
import { usePrinterSession, type PrinterSession } from './usePrinterSession';

jest.mock('./useEtiquetas', () => ({ useEtiquetas: jest.fn() }));
jest.mock('./usePrinterSession', () => ({ usePrinterSession: jest.fn() }));

const mockedUseEtiquetas = useEtiquetas as jest.MockedFunction<typeof useEtiquetas>;
const mockedUsePrinter = usePrinterSession as jest.MockedFunction<typeof usePrinterSession>;
type EtiquetasResult = ReturnType<typeof useEtiquetas>;

function etiquetasState(partial: Partial<EtiquetasResult>): void {
  mockedUseEtiquetas.mockReturnValue(partial as unknown as EtiquetasResult);
}

function printerSession(partial: Partial<PrinterSession> = {}): void {
  mockedUsePrinter.mockReturnValue({
    phase: 'idle',
    statuses: {},
    devices: [],
    errorMessage: null,
    busy: false,
    print: jest.fn(),
    selectDevice: jest.fn(),
    cancelSelection: jest.fn(),
    ...partial,
  });
}

const concretagem: ConcretagemEtiquetas = {
  concretagemId: 'ct-1',
  dataConcretagem: '2026-05-20',
  nfNumero: 'NF-1',
  obraSigla: 'OBRA-A',
  labels: [
    {
      cpId: 'cp-1',
      codigoRastreio: 'CP-AAA111',
      status: 'moldado',
      label: buildCpLabel({
        codigoRastreio: 'CP-AAA111',
        obraSigla: 'OBRA-A',
        dataMoldagem: '2026-05-20',
        idadeAlvoDias: 7,
      }),
    },
    {
      cpId: 'cp-2',
      codigoRastreio: 'CP-BBB222',
      status: 'moldado',
      label: buildCpLabel({
        codigoRastreio: 'CP-BBB222',
        obraSigla: 'OBRA-A',
        dataMoldagem: '2026-05-20',
        idadeAlvoDias: 28,
      }),
    },
  ],
};

beforeEach(() => printerSession());
afterEach(() => jest.clearAllMocks());

describe('EtiquetasScreen (F-S005-1/F-S005-2) — UI states', () => {
  it('Loading: shows a spinner', () => {
    etiquetasState({ isLoading: true });
    render(<EtiquetasScreen obraId="obra-1" />);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('Empty: shows the exact empty copy', () => {
    etiquetasState({ isLoading: false, isError: false, data: [] });
    render(<EtiquetasScreen obraId="obra-1" />);
    expect(screen.getByText('Nenhuma concretagem para etiquetar nesta obra.')).toBeTruthy();
  });

  it('Data: shows "Gerar Etiquetas (N)" and the per-CP reprint rows', () => {
    etiquetasState({ isLoading: false, isError: false, data: [concretagem] });
    render(<EtiquetasScreen obraId="obra-1" />);
    expect(screen.getByText('Gerar Etiquetas (2)')).toBeTruthy();
    // One "Reimprimir" per label (F-S005-2).
    expect(screen.getAllByText('Reimprimir')).toHaveLength(2);
    expect(screen.getByText('OBRA-A · NF NF-1')).toBeTruthy();
  });

  it('BLE error: surfaces the exact "Ative o Bluetooth…" message', () => {
    etiquetasState({ isLoading: false, isError: false, data: [concretagem] });
    printerSession({
      phase: 'error',
      errorMessage: 'Ative o Bluetooth e conceda as permissões para imprimir.',
    });
    render(<EtiquetasScreen obraId="obra-1" />);
    expect(
      screen.getByText('Ative o Bluetooth e conceda as permissões para imprimir.'),
    ).toBeTruthy();
  });

  it('Device selection: lists the paired printers to choose (US03-CA4)', () => {
    etiquetasState({ isLoading: false, isError: false, data: [concretagem] });
    printerSession({
      phase: 'selecting',
      devices: [
        { id: 'd1', name: 'Impressora 1' },
        { id: 'd2', name: 'Impressora 2' },
      ],
    });
    render(<EtiquetasScreen obraId="obra-1" />);
    expect(screen.getByText('Selecione a impressora Bluetooth.')).toBeTruthy();
    expect(screen.getByText('Impressora 1')).toBeTruthy();
    expect(screen.getByText('Impressora 2')).toBeTruthy();
  });
});
