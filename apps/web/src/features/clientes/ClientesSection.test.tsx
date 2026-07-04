import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { EdgeFunctionError } from '../../services/functions';
import { useToastStore } from '../../stores/toast-store';

import { ClientesSection } from './ClientesSection';
import { criarCliente, listClientes } from './clientes-service';

vi.mock('./clientes-service', () => ({
  listClientes: vi.fn(),
  criarCliente: vi.fn(),
}));

const mockedList = vi.mocked(listClientes);
const mockedCriar = vi.mocked(criarCliente);
const VALID_CNPJ = '11.444.777/0001-61';

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClientesSection />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function fillForm(nome: string, cnpj: string, email: string) {
  await userEvent.type(screen.getByLabelText('Nome'), nome);
  await userEvent.type(screen.getByLabelText('CNPJ'), cnpj);
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.click(screen.getByRole('button', { name: /Cadastrar e enviar convite/ }));
}

describe('ClientesSection (F-S004-1)', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCriar.mockReset();
    useToastStore.setState({ toasts: [] });
  });

  it('shows the empty state with its exact copy when there are no clients', async () => {
    mockedList.mockResolvedValue([]);
    renderSection();
    expect(await screen.findByText('Nenhum cliente cadastrado.')).toBeInTheDocument();
  });

  it('blocks submit with "CNPJ inválido." for a CNPJ that fails the check digits', async () => {
    mockedList.mockResolvedValue([]);
    renderSection();
    await fillForm('Construtora X', '11.111.111/1111-11', 'x@x.com');
    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument();
    expect(mockedCriar).not.toHaveBeenCalled();
  });

  it('shows the success toast and clears the form on success', async () => {
    mockedList.mockResolvedValue([]);
    mockedCriar.mockResolvedValue({ user_id: 'u1', cliente_id: 'c1' });
    renderSection();
    await fillForm('Construtora X', VALID_CNPJ, 'x@x.com');
    expect(await screen.findByText('Cliente cadastrado e convite enviado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue(''));
  });

  it('shows the exact "e-mail já cadastrado" message and keeps the input', async () => {
    mockedList.mockResolvedValue([]);
    mockedCriar.mockRejectedValue(
      new EdgeFunctionError('Já existe um usuário com este e-mail.', 'EMAIL_JA_CADASTRADO', 409),
    );
    renderSection();
    await fillForm('Construtora X', VALID_CNPJ, 'x@x.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um usuário com este e-mail.',
    );
    // Input is preserved (never lost on error — SPEC §3.0).
    expect(screen.getByLabelText('Nome')).toHaveValue('Construtora X');
  });
});
