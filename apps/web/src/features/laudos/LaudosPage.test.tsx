import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';

import { LaudosPage } from './LaudosPage';
import * as laudosService from './laudos-service';

vi.mock('./laudos-service', () => ({
  listLaudoRascunhos: vi.fn(),
  getLaudoDetalhe: vi.fn(),
  marcarProntoAssinatura: vi.fn(),
  emitirLaudoParcial: vi.fn(),
  agruparLaudo: vi.fn(),
}));

// Avoid rendering recharts (SVG) under jsdom — the curve itself is unit-tested
// via the shared `consolidarLaudo`.
vi.mock('./ResistenciaChart', () => ({
  ResistenciaChart: () => <div data-testid="resistencia-chart" />,
}));

const mockedList = vi.mocked(laudosService.listLaudoRascunhos);
const mockedDetalhe = vi.mocked(laudosService.getLaudoDetalhe);
const mockedMarcarPronto = vi.mocked(laudosService.marcarProntoAssinatura);
const mockedEmitir = vi.mocked(laudosService.emitirLaudoParcial);
const mockedAgrupar = vi.mocked(laudosService.agruparLaudo);

const RASCUNHO_1: laudosService.LaudoRascunhoRow = {
  id: 'l1',
  tipo_laudo: 'final_28d',
  numero: 'RASCUNHO OBRA-A NF NF-1',
  obra_id: 'o1',
  obra_nome: 'Obra A',
  obra_sigla: 'OBRA-A',
  cliente_nome: 'Cliente A',
  nfs: ['NF-1'],
  concretagem_ids: ['c1'],
  updated_at: '2026-05-20T10:00:00.000Z',
};
const RASCUNHO_2: laudosService.LaudoRascunhoRow = {
  ...RASCUNHO_1,
  id: 'l2',
  numero: 'RASCUNHO OBRA-A NF NF-2',
  nfs: ['NF-2'],
  concretagem_ids: ['c2'],
};

const DETALHE: laudosService.LaudoDetalhe = {
  id: 'l1',
  tipo_laudo: 'final_28d',
  numero: 'RASCUNHO OBRA-A NF NF-1',
  status: 'rascunho',
  obra_nome: 'Obra A',
  obra_sigla: 'OBRA-A',
  cliente_nome: 'Cliente A',
  fckProjeto: 30,
  concretagens: [{ id: 'c1', nf_numero: 'NF-1', quadra: 'Q1', lote: 'L1', fck_projeto: 30 }],
  consolidado: {
    idades: [
      {
        idadeAlvoDias: 7,
        cps: [
          { codigoRastreio: 'CP-7', idadeAlvoDias: 7, status: 'rompido', mpaCalculado: 27.44, cargaRupturaKgf: 21977 },
        ],
        resultadosValidos: [27.44],
        fcm: 27.44,
        expurgada: false,
        pendente: false,
      },
      {
        idadeAlvoDias: 28,
        cps: [{ codigoRastreio: 'CP-28', idadeAlvoDias: 28, status: 'coletado', mpaCalculado: null, cargaRupturaKgf: null }],
        resultadosValidos: [],
        fcm: null,
        expurgada: false,
        pendente: true,
      },
    ],
    curva: [{ idadeAlvoDias: 7, fcm: 27.44 }],
    algumPendente: true,
    temResultado: true,
  },
  updated_at: '2026-05-20T10:00:00.000Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LaudosPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LaudosPage (F-S007-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'u1' } } as unknown as Session,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
      failedAttempts: [],
    });
  });

  it('shows the empty state with the exact SPEC copy', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(
        'Nenhum laudo pré-pronto. Eles aparecem após o primeiro rompimento válido.',
      ),
    ).toBeInTheDocument();
  });

  it('lists drafts and opens a pre-filled detail with per-age FCM + chart (US13-CA1/CA2)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1]);
    mockedDetalhe.mockResolvedValue(DETALHE);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));

    expect(await screen.findByText('FCM 27.44 MPa')).toBeInTheDocument();
    expect(screen.getByText('CP-7')).toBeInTheDocument();
    expect(screen.getByText('CPs pendentes')).toBeInTheDocument(); // 28d still pending
    expect(screen.getByTestId('resistencia-chart')).toBeInTheDocument();
  });

  it('shows the exact CPS_PENDENTES message when marking a pending draft ready (sad path)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1]);
    mockedDetalhe.mockResolvedValue(DETALHE);
    mockedMarcarPronto.mockRejectedValue(
      new Error('Existem CPs pendentes nesta(s) idade(s). Conclua os rompimentos antes de avançar.'),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Marcar pronto para assinatura' }),
    );

    expect(
      await screen.findByText(
        'Existem CPs pendentes nesta(s) idade(s). Conclua os rompimentos antes de avançar.',
      ),
    ).toBeInTheDocument();
  });

  it('emits a 7d partial report on demand (US13-CA2)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1]);
    mockedDetalhe.mockResolvedValue(DETALHE);
    mockedEmitir.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Emitir parcial 7d' }));

    await waitFor(() => expect(mockedEmitir).toHaveBeenCalledWith('c1', 7));
    expect(await screen.findByText('Laudo parcial gerado.')).toBeInTheDocument();
  });

  it('groups two NFs of the same obra into one consolidated report (US13-CA3)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1, RASCUNHO_2]);
    mockedAgrupar.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Agrupar laudos' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar RASCUNHO OBRA-A NF NF-1' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar RASCUNHO OBRA-A NF NF-2' }));
    await userEvent.click(screen.getByRole('button', { name: /Agrupar selecionados/ }));

    await waitFor(() => expect(mockedAgrupar).toHaveBeenCalledWith(['c1', 'c2']));
    expect(await screen.findByText('Laudo consolidado gerado.')).toBeInTheDocument();
  });
});
