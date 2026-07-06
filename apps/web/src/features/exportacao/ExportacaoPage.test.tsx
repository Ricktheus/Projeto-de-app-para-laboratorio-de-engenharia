import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';

import { ExportacaoPage } from './ExportacaoPage';
import * as exportacaoService from './exportacao-service';

vi.mock('./exportacao-service', () => ({
  exportarExcel: vi.fn(),
  baixarArquivo: vi.fn(),
}));

// Avoid the real obras-service (Supabase) — the dropdown is not under test here.
vi.mock('../obras/useObras', () => ({
  useObras: () => ({ data: [{ id: 'oA', nome: 'Obra A', sigla: 'OBRA-A' }] }),
}));

const mockedExportar = vi.mocked(exportacaoService.exportarExcel);
const mockedBaixar = vi.mocked(exportacaoService.baixarArquivo);

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExportacaoPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ExportacaoPage (F-S009-3 / US23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'eng' } } as unknown as Session,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
      failedAttempts: [],
    });
  });

  it('keeps the export disabled until the período is complete', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });

  it('exports and downloads the workbook for the selected filters', async () => {
    const blob = new Blob(['x'], { type: 'application/octet-stream' });
    mockedExportar.mockResolvedValue(blob);
    renderPage();

    fireEvent.change(screen.getByLabelText('Período — de'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Período — até'), { target: { value: '2026-05-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() =>
      expect(mockedExportar).toHaveBeenCalledWith({
        periodo: { de: '2026-05-01', ate: '2026-05-31' },
        concreteira: null,
        fckAlvo: null,
        obraId: null,
      }),
    );
    expect(mockedBaixar).toHaveBeenCalledWith(blob, 'comparativo-concreteiras.xlsx');
    expect(await screen.findByText('Planilha gerada com sucesso.')).toBeInTheDocument();
  });

  it('surfaces the exact SEM_DADOS copy when the filters return nothing', async () => {
    mockedExportar.mockRejectedValue(
      new Error('Nenhum dado encontrado para os filtros selecionados.'),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('Período — de'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Período — até'), { target: { value: '2026-05-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    expect(
      await screen.findByText('Nenhum dado encontrado para os filtros selecionados.'),
    ).toBeInTheDocument();
    expect(mockedBaixar).not.toHaveBeenCalled();
  });
});
