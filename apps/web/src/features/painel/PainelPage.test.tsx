import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';
import * as concretagensService from '../concretagens/concretagens-service';

import { PainelPage } from './PainelPage';

// Real error class (declared inside the hoisted factory) so the
// `instanceof ConcretagemConflictError` branch in the page works.
vi.mock('../concretagens/concretagens-service', () => {
  class ConcretagemConflictError extends Error {
    constructor() {
      super('Dados foram alterados por outro usuário. Recarregue a página.');
      this.name = 'ConcretagemConflictError';
    }
  }
  return {
    ConcretagemConflictError,
    listConcretagens: vi.fn(),
    updateConcretagem: vi.fn(),
    subscribeConcretagens: vi.fn(() => () => {}),
  };
});

const mockedList = vi.mocked(concretagensService.listConcretagens);
const mockedUpdate = vi.mocked(concretagensService.updateConcretagem);
const mockedSubscribe = vi.mocked(concretagensService.subscribeConcretagens);

const CONCRETAGEM: concretagensService.ConcretagemRow = {
  id: 'k1',
  data_concretagem: '2026-05-20',
  nf_numero: '123456',
  fck_projeto: 30,
  volume_m3: 8,
  concreteira: 'Tarcal',
  slump_projeto: 120,
  slump_tolerancia: 20,
  slump_medido: 110,
  quadra: 'Q1',
  lote: 'L2',
  traco: null,
  placa_caminhao: null,
  lacre_caminhao: null,
  aditivo: null,
  obra_id: 'o1',
  obra_nome: 'Obra A',
  obra_sigla: 'OBRA-A',
  cliente_nome: 'Cliente A',
  updated_at: '2026-05-20T10:00:00.000Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PainelPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PainelPage (F-S007-1/2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'u1' } } as unknown as Session,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
      failedAttempts: [],
    });
    mockedSubscribe.mockReturnValue(() => {});
  });

  it('shows the empty state with the exact SPEC copy (F-S007-1)', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Nenhuma concretagem cadastrada.')).toBeInTheDocument();
  });

  it('shows the exact error copy + retry when loading fails (F-S007-1)', async () => {
    mockedList.mockRejectedValue(new Error('Erro inesperado. Tente novamente em instantes.'));
    renderPage();
    expect(
      await screen.findByText('Não foi possível carregar as concretagens.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('subscribes to realtime and refetches on a change event (F-S007-1 / US12)', async () => {
    mockedList.mockResolvedValue([CONCRETAGEM]);
    renderPage();
    await screen.findByText(/123456/);
    expect(mockedSubscribe).toHaveBeenCalledTimes(1);
    expect(mockedList).toHaveBeenCalledTimes(1);

    // Simulate a pour saved on mobile: the realtime callback invalidates the query.
    const onChange = mockedSubscribe.mock.calls[0]![0];
    onChange();
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it('edits a concretagem and shows the success toast (F-S007-2 / US12b-CA1)', async () => {
    mockedList.mockResolvedValue([CONCRETAGEM]);
    mockedUpdate.mockResolvedValue('2026-05-20T11:00:00.000Z');
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const fck = screen.getByLabelText('FCK de projeto (MPa)');
    await userEvent.clear(fck);
    await userEvent.type(fck, '35');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Concretagem atualizada com sucesso.')).toBeInTheDocument();
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    // The optimistic-lock token read earlier is sent with the update.
    expect(mockedUpdate.mock.calls[0]![2]).toBe('2026-05-20T10:00:00.000Z');
    expect(mockedUpdate.mock.calls[0]![1]).toMatchObject({ fck_projeto: 35 });
  });

  it('surfaces the 409 conflict copy + "Recarregar" without overwriting (US12b-CA2)', async () => {
    mockedList.mockResolvedValue([CONCRETAGEM]);
    mockedUpdate.mockRejectedValue(new concretagensService.ConcretagemConflictError());
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      await screen.findByText('Dados foram alterados por outro usuário. Recarregue a página.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    // The edited input is preserved (never lost on error).
    expect(screen.getByLabelText('FCK de projeto (MPa)')).toHaveValue('30');
  });

  it('does not offer editing to a role outside eng_lab/eng_escritorio', async () => {
    mockedList.mockResolvedValue([CONCRETAGEM]);
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'u2' } } as unknown as Session,
      profile: { role: 'socio_campo', nome: 'Sócio', isAdmin: false },
      failedAttempts: [],
    });
    renderPage();
    await screen.findByText(/123456/);
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
