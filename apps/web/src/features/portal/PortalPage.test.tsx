import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';

import { PortalPage } from './PortalPage';
import * as portalService from './portal-service';

vi.mock('./portal-service', () => ({
  listPortalLaudos: vi.fn(),
  baixarLaudoAssinado: vi.fn(),
}));

const mockedList = vi.mocked(portalService.listPortalLaudos);
const mockedBaixar = vi.mocked(portalService.baixarLaudoAssinado);

const LAUDO_A: portalService.PortalLaudoRow = {
  id: 'la',
  numero: 'N°011 OBRA-A',
  tipo_laudo: 'final_28d',
  versao: 1,
  data_emissao: '2026-06-18',
  obra_id: 'oA',
  obra_nome: 'Obra A',
  obra_sigla: 'OBRA-A',
};
const LAUDO_B: portalService.PortalLaudoRow = {
  id: 'lb',
  numero: 'N°012 OBRA-B',
  tipo_laudo: 'parcial_7d',
  versao: 2,
  data_emissao: '2026-06-20',
  obra_id: 'oB',
  obra_nome: 'Obra B',
  obra_sigla: 'OBRA-B',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PortalPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PortalPage (F-S009-1 / US18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'cli' } } as unknown as Session,
      profile: { role: 'cliente', nome: 'Cliente A', isAdmin: false },
      failedAttempts: [],
    });
  });

  it('shows the empty state with the exact SPEC copy', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText('Você ainda não possui laudos disponíveis.'),
    ).toBeInTheDocument();
  });

  it('lists the signed reports and downloads one via a signed URL (US18-CA1)', async () => {
    mockedList.mockResolvedValue([LAUDO_A]);
    mockedBaixar.mockResolvedValue('https://signed.example/la.pdf');
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    renderPage();

    expect(await screen.findByText('N°011 OBRA-A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Baixar laudo (PDF)' }));

    await waitFor(() => expect(mockedBaixar).toHaveBeenCalledWith('la'));
    expect(openSpy).toHaveBeenCalledWith('https://signed.example/la.pdf', '_blank', 'noopener');
  });

  it('filters the list by obra (US18-CA2)', async () => {
    mockedList.mockResolvedValue([LAUDO_A, LAUDO_B]);
    renderPage();

    expect(await screen.findByText('N°011 OBRA-A')).toBeInTheDocument();
    expect(screen.getByText('N°012 OBRA-B')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Obra'), 'oB');

    expect(screen.queryByText('N°011 OBRA-A')).not.toBeInTheDocument();
    expect(screen.getByText('N°012 OBRA-B')).toBeInTheDocument();
  });
});
