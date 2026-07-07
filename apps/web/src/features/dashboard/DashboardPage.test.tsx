import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../stores/auth-store';

import { DashboardPage } from './DashboardPage';
import * as service from './dashboard-service';

vi.mock('./dashboard-service', () => ({
  loadCpCounters: vi.fn(),
  loadLaudosPendentes: vi.fn(),
  loadConcretagensSemColeta: vi.fn(),
  loadProximosRompimentos: vi.fn(),
}));

const mockedCp = vi.mocked(service.loadCpCounters);
const mockedLaudos = vi.mocked(service.loadLaudosPendentes);
const mockedSemColeta = vi.mocked(service.loadConcretagensSemColeta);
const mockedRompimentos = vi.mocked(service.loadProximosRompimentos);

/** Default happy-path resolutions; individual tests override what they exercise. */
function resolveAll() {
  mockedCp.mockResolvedValue({
    moldados: { hoje: 4, semana: 12 },
    coletados: { hoje: 3, semana: 9 },
    rompidos: { hoje: 2, semana: 7 },
  });
  mockedLaudos.mockResolvedValue([
    { id: 'l1', numero: 'N-001', obraSigla: 'OBRA-A', obraNome: 'Obra A' },
  ]);
  mockedSemColeta.mockResolvedValue([
    { concretagemId: 'c1', nfNumero: '123456', obraSigla: 'OBRA-A' },
  ]);
  mockedRompimentos.mockResolvedValue([
    {
      codigoRastreio: 'QR-CP1',
      dataRupturaPlanejada: '2026-06-20',
      obraSigla: 'OBRA-A',
      status: 'coletado',
    },
  ]);
}

function resolveEmpty() {
  mockedCp.mockResolvedValue({
    moldados: { hoje: 0, semana: 0 },
    coletados: { hoje: 0, semana: 0 },
    rompidos: { hoje: 0, semana: 0 },
  });
  mockedLaudos.mockResolvedValue([]);
  mockedSemColeta.mockResolvedValue([]);
  mockedRompimentos.mockResolvedValue([]);
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage (F-S010-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'u1' } } as unknown as Session,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
      failedAttempts: [],
    });
  });

  it('renders the four operational cards with their data (happy path)', async () => {
    resolveAll();
    renderPage();

    // Card titles.
    expect(await screen.findByText('Corpos de prova')).toBeInTheDocument();
    expect(screen.getByText('Laudos pendentes de assinatura')).toBeInTheDocument();
    expect(screen.getByText('Concretagens sem coleta (>24h)')).toBeInTheDocument();
    expect(screen.getByText('Próximos rompimentos')).toBeInTheDocument();

    // CP counters (today values + a week value).
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument()); // moldados hoje
    expect(screen.getAllByText(/Semana:/).length).toBe(3);

    // Laudos pendentes list + link.
    expect(screen.getByText('N-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver laudos/ })).toHaveAttribute('href', '/laudos');

    // Concretagem overdue + upcoming rupture.
    expect(screen.getByText('NF 123456')).toBeInTheDocument();
    expect(screen.getByText('QR-CP1')).toBeInTheDocument();
    expect(screen.getByText(/20\/06\/2026/)).toBeInTheDocument();
  });

  it('shows each card its own Empty state with the exact SPEC copy', async () => {
    resolveEmpty();
    renderPage();

    expect(
      await screen.findByText('Nenhum corpo de prova registrado nesta semana.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhum laudo aguardando assinatura.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma concretagem com coleta atrasada.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum rompimento programado.')).toBeInTheDocument();
  });

  it('shows a loading state per card before data arrives', () => {
    mockedCp.mockReturnValue(new Promise(() => {}));
    mockedLaudos.mockReturnValue(new Promise(() => {}));
    mockedSemColeta.mockReturnValue(new Promise(() => {}));
    mockedRompimentos.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole('status', { name: 'Carregando' })).toHaveLength(4);
  });

  it('shows the error copy + retry when a card query fails, and retries', async () => {
    resolveAll();
    mockedLaudos.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(
      await screen.findByText('Não foi possível carregar este indicador.'),
    ).toBeInTheDocument();

    // Retry re-invokes the failing loader (now resolving) and clears the error.
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByText('N-001')).toBeInTheDocument());
    expect(mockedLaudos).toHaveBeenCalledTimes(2);
  });
});
