import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidacaoPublicaPage } from './ValidacaoPublicaPage';
import * as validacaoService from './validacao-service';

vi.mock('./validacao-service', () => ({ validarLaudoPublico: vi.fn() }));

const mockedValidar = vi.mocked(validacaoService.validarLaudoPublico);

function renderAt(codigo: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/validar/${codigo}`]}>
        <Routes>
          <Route path="/validar/:codigo" element={<ValidacaoPublicaPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ValidacaoPublicaPage (F-S009-2 / US19)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the authentic report with client/obra + MPa per age (US19-CA1)', async () => {
    mockedValidar.mockResolvedValue({
      status: 'encontrado',
      laudo: {
        autentico: true,
        numero: 'N°003AGEHAB',
        versao: 2,
        cliente: 'AGEHAB',
        obra: 'Residencial X',
        data_emissao: '2026-06-18',
        resultados: [
          { idade_dias: 7, fcm_mpa: 27.44, fck_projeto: 30 },
          { idade_dias: 28, fcm_mpa: 32.1, fck_projeto: 30 },
        ],
      },
    });

    renderAt('abc123');

    expect(await screen.findByText('Laudo autêntico.')).toBeInTheDocument();
    expect(screen.getByText('N°003AGEHAB')).toBeInTheDocument();
    expect(screen.getByText('AGEHAB')).toBeInTheDocument();
    expect(screen.getByText('Residencial X')).toBeInTheDocument();
    expect(screen.getByText('27.44')).toBeInTheDocument();
    expect(screen.getByText('32.1')).toBeInTheDocument();
    // QW-20: conclusion verdict from the 28d result (32.1 ≥ fck 30).
    expect(screen.getByText('Conforme o fck')).toBeInTheDocument();
  });

  it('concludes "abaixo do fck" when the highest age is under the specified fck (QW-20)', async () => {
    mockedValidar.mockResolvedValue({
      status: 'encontrado',
      laudo: {
        autentico: true,
        numero: 'N°004AGEHAB',
        versao: 1,
        cliente: 'AGEHAB',
        obra: 'Residencial Y',
        data_emissao: '2026-06-20',
        resultados: [{ idade_dias: 28, fcm_mpa: 24, fck_projeto: 30 }],
      },
    });
    renderAt('def456');
    expect(await screen.findByText('Abaixo do fck — avaliar reforço')).toBeInTheDocument();
  });

  it('shows the not-found / not-authentic copy for an unknown code (US19-CA3)', async () => {
    mockedValidar.mockResolvedValue({ status: 'nao_encontrado' });
    renderAt('inexistente');
    expect(await screen.findByText('Laudo não encontrado / não autêntico.')).toBeInTheDocument();
  });

  it('shows the rate-limit copy on 429', async () => {
    mockedValidar.mockResolvedValue({ status: 'rate_limit' });
    renderAt('abc123');
    expect(
      await screen.findByText('Limite de tentativas atingido. Tente novamente mais tarde.'),
    ).toBeInTheDocument();
  });

  it('flags a version under correction as em atualização (autentico=false)', async () => {
    mockedValidar.mockResolvedValue({
      status: 'encontrado',
      laudo: {
        autentico: false,
        numero: 'N°003AGEHAB',
        versao: 3,
        cliente: 'AGEHAB',
        obra: 'Residencial X',
        data_emissao: null,
        resultados: [],
      },
    });
    renderAt('abc123');
    expect(
      await screen.findByText('Este laudo está em processo de atualização.'),
    ).toBeInTheDocument();
  });
});
