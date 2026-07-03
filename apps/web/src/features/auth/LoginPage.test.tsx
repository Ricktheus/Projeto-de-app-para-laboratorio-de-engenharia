import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import { useToastStore } from '../../stores/toast-store';

import { LoginPage } from './LoginPage';
import { signInWithCredentials } from './auth-service';

vi.mock('./auth-service', () => ({
  signInWithCredentials: vi.fn(),
  signOut: vi.fn(),
  fetchProfile: vi.fn(),
}));

const mockedSignIn = vi.mocked(signInWithCredentials);
const fakeSession = { access_token: 'a', user: { id: 'u1' } } as unknown as Session;

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/painel" element={<div>HOME PAINEL</div>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email = 'eng@lab.com', password = 'secret123') {
  await userEvent.clear(screen.getByLabelText('E-mail'));
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.clear(screen.getByLabelText('Senha'));
  await userEvent.type(screen.getByLabelText('Senha'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage (F-S003-1)', () => {
  beforeEach(() => {
    mockedSignIn.mockReset();
    useAuthStore.setState({
      status: 'unauthenticated',
      session: null,
      profile: null,
      failedAttempts: [],
    });
    useToastStore.setState({ toasts: [] });
  });

  it('blocks submit and shows field errors when the form is empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(mockedSignIn).not.toHaveBeenCalled();
  });

  it('shows the exact generic message on invalid credentials (no user enumeration)', async () => {
    mockedSignIn.mockRejectedValue({ status: 400, message: 'Invalid login credentials' });
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  it('disables the button and shows a spinner while the request is in flight', async () => {
    let resolve: (value: {
      session: Session;
      profile: { role: 'eng_lab'; nome: string; isAdmin: boolean };
    }) => void = () => {};
    mockedSignIn.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    renderLogin();
    await fillAndSubmit();

    const button = screen.getByRole('button', { name: /Entrando/ });
    expect(button).toBeDisabled();
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeDisabled();

    resolve({ session: fakeSession, profile: { role: 'eng_lab', nome: 'RT', isAdmin: true } });
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
  });

  it('creates the session and redirects to the role home on success', async () => {
    mockedSignIn.mockResolvedValue({
      session: fakeSession,
      profile: { role: 'eng_escritorio', nome: 'Escritório', isAdmin: true },
    });
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByText('HOME PAINEL')).toBeInTheDocument();
    expect(useAuthStore.getState().profile?.role).toBe('eng_escritorio');
  });

  it('shows the throttle message after 3 failed attempts in the window', async () => {
    mockedSignIn.mockRejectedValue({ status: 400, message: 'Invalid login credentials' });
    renderLogin();

    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    await fillAndSubmit();
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
      ),
    );
    // A 4th submit is blocked client-side without hitting the service again.
    expect(mockedSignIn).toHaveBeenCalledTimes(3);
    await fillAndSubmit();
    expect(mockedSignIn).toHaveBeenCalledTimes(3);
  });
});
