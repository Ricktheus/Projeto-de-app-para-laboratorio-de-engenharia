import { fireEvent, render, screen } from '@testing-library/react-native';

import { RupturaFormScreen } from './RupturaFormScreen';
import { type PrensaCpRow } from './prensa-service';
import {
  useCpForRuptura,
  useDescartarCp,
  useExpurgarResultado,
  useRegistrarRuptura,
} from './usePrensa';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('../evidencia/EvidenciaCapture', () => ({ EvidenciaCapture: () => null }));
jest.mock('./usePrensa', () => ({
  useCpForRuptura: jest.fn(),
  useRegistrarRuptura: jest.fn(),
  useDescartarCp: jest.fn(),
  useExpurgarResultado: jest.fn(),
}));

const mockedCp = useCpForRuptura as jest.MockedFunction<typeof useCpForRuptura>;
const mockedRegistrar = useRegistrarRuptura as jest.MockedFunction<typeof useRegistrarRuptura>;
const mockedDescartar = useDescartarCp as jest.MockedFunction<typeof useDescartarCp>;
const mockedExpurgar = useExpurgarResultado as jest.MockedFunction<typeof useExpurgarResultado>;

const cp = (over: Partial<PrensaCpRow> = {}): PrensaCpRow => ({
  cpId: 'cp-1',
  codigoRastreio: 'CP-1',
  obraSigla: 'OBRA-1',
  obraNome: 'Obra X',
  nfNumero: 'NF-1',
  idadeAlvoDias: 28,
  dataRupturaPlanejada: '2020-01-01',
  diametroNominalMm: 100,
  mandatorio28d: false,
  status: 'coletado',
  rupturaId: null,
  mpaCalculado: null,
  ...over,
});

function setCp(partial: Partial<ReturnType<typeof useCpForRuptura>>): void {
  mockedCp.mockReturnValue({
    data: cp(),
    isLoading: false,
    isError: false,
    ...partial,
  } as ReturnType<typeof useCpForRuptura>);
}

const registrarMutate = jest.fn();

beforeEach(() => {
  registrarMutate.mockReset();
  mockedRegistrar.mockReturnValue({ mutate: registrarMutate, isPending: false } as unknown as ReturnType<typeof useRegistrarRuptura>);
  mockedDescartar.mockReturnValue({ mutate: jest.fn(), isPending: false } as unknown as ReturnType<typeof useDescartarCp>);
  mockedExpurgar.mockReturnValue({ mutate: jest.fn(), isPending: false } as unknown as ReturnType<typeof useExpurgarResultado>);
});
afterEach(() => jest.clearAllMocks());

describe('RupturaFormScreen (F-S006-2/3)', () => {
  it('Loading: shows a spinner', () => {
    mockedCp.mockReturnValue({ isLoading: true, isError: false, data: undefined } as ReturnType<typeof useCpForRuptura>);
    render(<RupturaFormScreen cpId="cp-1" />);
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
  });

  it('Not found: shows "CP não encontrado."', () => {
    mockedCp.mockReturnValue({ isLoading: false, isError: false, data: null } as ReturnType<typeof useCpForRuptura>);
    render(<RupturaFormScreen cpId="cp-1" />);
    expect(screen.getByText('CP não encontrado.')).toBeTruthy();
  });

  it('computes MPa in real time from the NOMINAL diameter (23562 → 29.42)', () => {
    setCp({});
    render(<RupturaFormScreen cpId="cp-1" />);
    expect(screen.getByLabelText('MPa calculado').props.children).toBe('—');
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '23562');
    expect(screen.getByLabelText('MPa calculado').props.children).toBe('29.42');
  });

  it('keeps "Salvar Ruptura" disabled until the load is valid', () => {
    setCp({});
    render(<RupturaFormScreen cpId="cp-1" />);
    expect(screen.getByRole('button', { name: 'Salvar Ruptura' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '23562');
    expect(screen.getByRole('button', { name: 'Salvar Ruptura' }).props.accessibilityState.disabled).toBe(false);
  });

  it('blocks saving without a fracture type (US09 sad path)', () => {
    setCp({});
    render(<RupturaFormScreen cpId="cp-1" />);
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '23562');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar Ruptura' }));
    expect(screen.getByText('Selecione o tipo de fratura.')).toBeTruthy();
    expect(registrarMutate).not.toHaveBeenCalled();
  });

  it('warns on a suspiciously low load (kN vs kgf, US08-CA2)', () => {
    setCp({});
    render(<RupturaFormScreen cpId="cp-1" />);
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '231');
    expect(screen.getByText('Valor muito baixo. Você digitou em kN em vez de kgf?')).toBeTruthy();
  });

  it('blocks a mandatory-28d specimen before its planned age (US08-CA4)', () => {
    setCp({ data: cp({ mandatorio28d: true, dataRupturaPlanejada: '2999-12-31' }) });
    render(<RupturaFormScreen cpId="cp-1" />);
    expect(
      screen.getByText(
        'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista (2999-12-31).',
      ),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '23562');
    expect(screen.getByRole('button', { name: 'Salvar Ruptura' }).props.accessibilityState.disabled).toBe(true);
  });

  it('confirms then registers the rupture and shows the result (US08-CA1/CA3)', () => {
    registrarMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ rupturaId: 'r-1', mpaCalculado: 29.42, areaMm2: 7853.98, cpStatus: 'rompido', laudoRascunhoId: 'l-1' }),
    );
    setCp({});
    render(<RupturaFormScreen cpId="cp-1" />);
    fireEvent.changeText(screen.getByLabelText('Carga de ruptura'), '23562');
    fireEvent.press(screen.getByLabelText('Ruptura de Cisalhamento'));
    fireEvent.press(screen.getByRole('button', { name: 'Salvar Ruptura' }));
    // confirmation step before writing (F-S006-2)
    expect(screen.getByText('Confirmar ruptura?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirmar e salvar' }));
    expect(registrarMutate).toHaveBeenCalledWith(
      expect.objectContaining({ cargaRupturaKgf: 23562, tipoFratura: 'ruptura_cisalhamento' }),
      expect.anything(),
    );
    expect(screen.getByText('CP rompido')).toBeTruthy();
  });
});
