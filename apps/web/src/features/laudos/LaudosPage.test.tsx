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
  listLaudos: vi.fn(),
  getLaudoDetalhe: vi.fn(),
  marcarProntoAssinatura: vi.fn(),
  emitirLaudoParcial: vi.fn(),
  agruparLaudo: vi.fn(),
  gerarLaudoPdf: vi.fn(),
  baixarLaudoPdf: vi.fn(),
  uploadLaudoAssinado: vi.fn(),
  corrigirLaudo: vi.fn(),
}));

// Avoid rendering recharts (SVG) under jsdom — the curve itself is unit-tested
// via the shared `consolidarLaudo`.
vi.mock('./ResistenciaChart', () => ({
  ResistenciaChart: () => <div data-testid="resistencia-chart" />,
}));

const mockedList = vi.mocked(laudosService.listLaudos);
const mockedDetalhe = vi.mocked(laudosService.getLaudoDetalhe);
const mockedMarcarPronto = vi.mocked(laudosService.marcarProntoAssinatura);
const mockedEmitir = vi.mocked(laudosService.emitirLaudoParcial);
const mockedAgrupar = vi.mocked(laudosService.agruparLaudo);
const mockedGerarPdf = vi.mocked(laudosService.gerarLaudoPdf);
const mockedBaixar = vi.mocked(laudosService.baixarLaudoPdf);
const mockedUpload = vi.mocked(laudosService.uploadLaudoAssinado);
const mockedCorrigir = vi.mocked(laudosService.corrigirLaudo);

const RASCUNHO_1: laudosService.LaudoListRow = {
  id: 'l1',
  tipo_laudo: 'final_28d',
  numero: 'RASCUNHO OBRA-A NF NF-1',
  status: 'rascunho',
  versao: 1,
  obra_id: 'o1',
  obra_nome: 'Obra A',
  obra_sigla: 'OBRA-A',
  cliente_nome: 'Cliente A',
  nfs: ['NF-1'],
  concretagem_ids: ['c1'],
  pdf_original_url: null,
  pdf_assinado_url: null,
  updated_at: '2026-05-20T10:00:00.000Z',
};
const RASCUNHO_2: laudosService.LaudoListRow = {
  ...RASCUNHO_1,
  id: 'l2',
  numero: 'RASCUNHO OBRA-A NF NF-2',
  nfs: ['NF-2'],
  concretagem_ids: ['c2'],
};
const PRONTO: laudosService.LaudoListRow = {
  ...RASCUNHO_1,
  id: 'lp',
  numero: 'N°010 OBRA-A',
  status: 'pronto_assinatura',
  pdf_original_url: 'laudos/lp/original.pdf',
};
const ASSINADO: laudosService.LaudoListRow = {
  ...RASCUNHO_1,
  id: 'la',
  numero: 'N°011 OBRA-A',
  status: 'assinado',
  pdf_original_url: 'laudos/la/original.pdf',
  pdf_assinado_url: 'laudos/la/assinado.pdf',
};

function detalheFrom(row: laudosService.LaudoListRow): laudosService.LaudoDetalhe {
  return {
    id: row.id,
    tipo_laudo: row.tipo_laudo,
    numero: row.numero,
    status: row.status,
    versao: row.versao,
    obra_nome: row.obra_nome,
    obra_sigla: row.obra_sigla,
    cliente_nome: row.cliente_nome,
    fckProjeto: 30,
    pdf_original_url: row.pdf_original_url,
    pdf_assinado_url: row.pdf_assinado_url,
    concretagens: [{ id: 'c1', nf_numero: 'NF-1', quadra: 'Q1', lote: 'L1', fck_projeto: 30 }],
    consolidado: {
      idades: [
        {
          idadeAlvoDias: 7,
          cps: [
            {
              codigoRastreio: 'CP-7',
              idadeAlvoDias: 7,
              status: 'rompido',
              mpaCalculado: 27.44,
              cargaRupturaKgf: 21977,
            },
          ],
          resultadosValidos: [27.44],
          fcm: 27.44,
          expurgada: false,
          pendente: false,
        },
      ],
      curva: [{ idadeAlvoDias: 7, fcm: 27.44 }],
      algumPendente: false,
      temResultado: true,
    },
    updated_at: row.updated_at,
  };
}

// Draft detail keeps a pending 28d age (drives the CPS_PENDENTES sad path).
const DETALHE_RASCUNHO: laudosService.LaudoDetalhe = {
  ...detalheFrom(RASCUNHO_1),
  consolidado: {
    idades: [
      ...detalheFrom(RASCUNHO_1).consolidado.idades,
      {
        idadeAlvoDias: 28,
        cps: [
          {
            codigoRastreio: 'CP-28',
            idadeAlvoDias: 28,
            status: 'coletado',
            mpaCalculado: null,
            cargaRupturaKgf: null,
          },
        ],
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

describe('LaudosPage (F-S007-3 + S008)', () => {
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

  it('lists reports and opens a pre-filled detail with per-age FCM + chart (US13-CA1/CA2)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1]);
    mockedDetalhe.mockResolvedValue(DETALHE_RASCUNHO);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));

    expect(await screen.findByText('FCM 27.44 MPa')).toBeInTheDocument();
    expect(screen.getByText('CP-7')).toBeInTheDocument();
    expect(screen.getByText('CPs pendentes')).toBeInTheDocument(); // 28d still pending
    expect(screen.getByTestId('resistencia-chart')).toBeInTheDocument();
  });

  it('shows the exact CPS_PENDENTES message when marking a pending draft ready (sad path)', async () => {
    mockedList.mockResolvedValue([RASCUNHO_1]);
    mockedDetalhe.mockResolvedValue(DETALHE_RASCUNHO);
    mockedMarcarPronto.mockRejectedValue(
      new Error(
        'Existem CPs pendentes nesta(s) idade(s). Conclua os rompimentos antes de avançar.',
      ),
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
    mockedDetalhe.mockResolvedValue(DETALHE_RASCUNHO);
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
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Selecionar RASCUNHO OBRA-A NF NF-1' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Selecionar RASCUNHO OBRA-A NF NF-2' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Agrupar selecionados/ }));

    await waitFor(() => expect(mockedAgrupar).toHaveBeenCalledWith(['c1', 'c2']));
    expect(await screen.findByText('Laudo consolidado gerado.')).toBeInTheDocument();
  });

  // ---------------------------- S008 ----------------------------

  it('generates the locked PDF for a pronto report and shows the success copy (F-S008-1)', async () => {
    mockedList.mockResolvedValue([{ ...PRONTO, pdf_original_url: null }]);
    mockedDetalhe.mockResolvedValue(detalheFrom({ ...PRONTO, pdf_original_url: null }));
    mockedGerarPdf.mockResolvedValue({
      pdf_original_url: 'laudos/lp/original.pdf',
      codigo_verificacao: 'abc',
    });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar PDF' }));

    await waitFor(() => expect(mockedGerarPdf).toHaveBeenCalledWith('lp'));
    expect(await screen.findByText('PDF gerado com sucesso.')).toBeInTheDocument();
  });

  it('shows the exact LAUDO_NAO_PRONTO message when generation is rejected (F-S008-1 sad path)', async () => {
    mockedList.mockResolvedValue([{ ...PRONTO, pdf_original_url: null }]);
    mockedDetalhe.mockResolvedValue(detalheFrom({ ...PRONTO, pdf_original_url: null }));
    mockedGerarPdf.mockRejectedValue(
      new Error('O laudo precisa estar pronto para assinatura antes de gerar o PDF.'),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar PDF' }));

    expect(
      await screen.findByText('O laudo precisa estar pronto para assinatura antes de gerar o PDF.'),
    ).toBeInTheDocument();
  });

  it('downloads the unsigned PDF via a signed URL (F-S008-2 CA1)', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    mockedList.mockResolvedValue([PRONTO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(PRONTO));
    mockedBaixar.mockResolvedValue('https://signed.example/original.pdf');
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Baixar Laudo (PDF)' }));

    await waitFor(() => expect(mockedBaixar).toHaveBeenCalledWith('laudos/lp/original.pdf'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://signed.example/original.pdf',
      '_blank',
      'noopener',
    );
    openSpy.mockRestore();
  });

  it('uploads the signed PDF and shows the publication copy (F-S008-2 CA2)', async () => {
    mockedList.mockResolvedValue([PRONTO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(PRONTO));
    mockedUpload.mockResolvedValue({
      status: 'assinado',
      pdf_assinado_url: 'laudos/lp/assinado.pdf',
    });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    const file = new File(['%PDF-1.7 signed'], 'assinado.pdf', { type: 'application/pdf' });
    await userEvent.upload(await screen.findByLabelText('PDF assinado'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar PDF assinado' }));

    await waitFor(() =>
      expect(mockedUpload).toHaveBeenCalledWith(
        'lp',
        expect.objectContaining({ name: 'assinado.pdf' }),
        null,
      ),
    );
    expect(await screen.findByText('Laudo assinado e publicado ao cliente.')).toBeInTheDocument();
  });

  it('keeps the send button disabled until a PDF is chosen (no double/empty submit)', async () => {
    mockedList.mockResolvedValue([PRONTO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(PRONTO));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    expect(await screen.findByRole('button', { name: 'Enviar PDF assinado' })).toBeDisabled();
  });

  it('shows the exact ARQUIVO_INVALIDO message when the upload is rejected (F-S008-2 sad path)', async () => {
    mockedList.mockResolvedValue([PRONTO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(PRONTO));
    mockedUpload.mockRejectedValue(new Error('Envie um arquivo PDF válido.'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    // A .pdf-typed file passes the client `accept` filter but the server rejects
    // it by magic bytes (415 ARQUIVO_INVALIDO) — the UI must surface that copy.
    const file = new File(['GIF89a not really a pdf'], 'fake.pdf', { type: 'application/pdf' });
    await userEvent.upload(await screen.findByLabelText('PDF assinado'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar PDF assinado' }));

    expect(await screen.findByText('Envie um arquivo PDF válido.')).toBeInTheDocument();
  });

  it('corrects a signed report and shows the correction copy (F-S008-3 / US22)', async () => {
    mockedList.mockResolvedValue([ASSINADO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(ASSINADO));
    mockedCorrigir.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Corrigir laudo' }));

    await waitFor(() => expect(mockedCorrigir).toHaveBeenCalledWith('la'));
    expect(
      await screen.findByText('Correção criada. Nova versão gerada em rascunho.'),
    ).toBeInTheDocument();
  });

  it('shows the exact LAUDO_NAO_ASSINADO message when correction is rejected (F-S008-3 sad path)', async () => {
    mockedList.mockResolvedValue([ASSINADO]);
    mockedDetalhe.mockResolvedValue(detalheFrom(ASSINADO));
    mockedCorrigir.mockRejectedValue(new Error('Só é possível corrigir laudos já assinados.'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver laudo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Corrigir laudo' }));

    expect(
      await screen.findByText('Só é possível corrigir laudos já assinados.'),
    ).toBeInTheDocument();
  });
});
