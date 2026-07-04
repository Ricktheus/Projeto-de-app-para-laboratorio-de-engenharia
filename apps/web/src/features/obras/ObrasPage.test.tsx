import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';
import { listClientes } from '../clientes/clientes-service';

import { ObrasPage } from './ObrasPage';
import * as obrasService from './obras-service';

// Real error class (declared inside the hoisted factory) so
// `instanceof ObraComConcretagensError` works in the page under test.
vi.mock('./obras-service', () => {
  class ObraComConcretagensError extends Error {
    constructor() {
      super('Esta obra possui concretagens e não pode ser excluída. Você pode inativá-la.');
      this.name = 'ObraComConcretagensError';
    }
  }
  return {
    ObraComConcretagensError,
    listObras: vi.fn(),
    createObra: vi.fn(),
    updateObra: vi.fn(),
    inativarObra: vi.fn(),
    excluirObra: vi.fn(),
    countConcretagens: vi.fn(),
  };
});

vi.mock('../clientes/clientes-service', () => ({
  listClientes: vi.fn(),
  criarCliente: vi.fn(),
}));

const mockedListObras = vi.mocked(obrasService.listObras);
const mockedCreateObra = vi.mocked(obrasService.createObra);
const mockedExcluir = vi.mocked(obrasService.excluirObra);
const mockedInativar = vi.mocked(obrasService.inativarObra);
const mockedListClientes = vi.mocked(listClientes);

const CLIENTE_ID = 'c1111111-1111-1111-1111-111111111111';

const OBRA = {
  id: 'o1',
  nome: 'Obra A',
  sigla: 'OBRA-A',
  endereco: null,
  contato: null,
  cliente_id: CLIENTE_ID,
  ativo: true,
  cliente_nome: 'Cliente A',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ObrasPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ObrasPage (F-S004-2/3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({
      status: 'authenticated',
      session: { access_token: 'a', user: { id: 'u1' } } as unknown as Session,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
      failedAttempts: [],
    });
    mockedListClientes.mockResolvedValue([
      { id: CLIENTE_ID, nome: 'Cliente A', cnpj: null, email: null, ativo: true },
    ]);
  });

  it('shows the empty state with its exact CTA copy', async () => {
    mockedListObras.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText('Nenhuma obra cadastrada. Toque em + para criar.'),
    ).toBeInTheDocument();
  });

  it('blocks deletion of an obra with concretagens and offers "Inativar" (US21-CA1)', async () => {
    mockedListObras.mockResolvedValue([OBRA]);
    mockedExcluir.mockRejectedValue(new obrasService.ObraComConcretagensError());
    mockedInativar.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText(
        'Esta obra possui concretagens e não pode ser excluída. Você pode inativá-la.',
      ),
    ).toBeInTheDocument();

    // The offered "Inativar obra" action performs the soft-delete.
    await userEvent.click(screen.getByRole('button', { name: 'Inativar obra' }));
    await waitFor(() => expect(mockedInativar.mock.calls[0]?.[0]).toBe('o1'));
    expect(
      await screen.findByText('Obra inativada. O histórico foi preservado.'),
    ).toBeInTheDocument();
  });

  it('shows the exact duplicate-sigla message on create (US20-CA3)', async () => {
    mockedListObras.mockResolvedValue([]);
    mockedCreateObra.mockRejectedValue(
      new Error('Já existe uma obra com esta sigla para este cliente.'),
    );
    renderPage();

    await userEvent.click((await screen.findAllByRole('button', { name: /Nova obra/ }))[0]);
    await userEvent.selectOptions(await screen.findByLabelText('Cliente'), CLIENTE_ID);
    await userEvent.type(screen.getByLabelText('Nome da obra'), 'Obra A');
    await userEvent.type(screen.getByLabelText('Sigla'), 'OBRA-A');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar obra' }));

    expect(
      await screen.findByText('Já existe uma obra com esta sigla para este cliente.'),
    ).toBeInTheDocument();
  });
});
