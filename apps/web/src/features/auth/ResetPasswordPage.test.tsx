import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../../components/ui';
import { useToastStore } from '../../stores/toast-store';

import { ResetPasswordPage } from './ResetPasswordPage';
import { establishRecoverySession, requestPasswordReset, updatePassword } from './reset-service';

vi.mock('./reset-service', () => ({
  establishRecoverySession: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

const mockedEstablish = vi.mocked(establishRecoverySession);
const mockedRequest = vi.mocked(requestPasswordReset);
const mockedUpdate = vi.mocked(updatePassword);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>TELA DE LOGIN</div>} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockedEstablish.mockReset();
    mockedRequest.mockReset().mockResolvedValue(undefined);
    mockedUpdate.mockReset().mockResolvedValue(undefined);
    useToastStore.setState({ toasts: [] });
  });

  it('with no recovery token, shows the request form and sends the reset e-mail', async () => {
    mockedEstablish.mockResolvedValue('none');
    renderPage();

    const email = await screen.findByLabelText('E-mail');
    await userEvent.type(email, 'eng@lab.com');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));

    await waitFor(() => expect(mockedRequest).toHaveBeenCalledWith('eng@lab.com'));
    // Unique to the persistent confirmation paragraph (the toast shares the prefix).
    expect(await screen.findByText(/você receberá um link/)).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('with a valid recovery token, sets the new password and returns to login', async () => {
    mockedEstablish.mockResolvedValue('ready');
    renderPage();

    const pwd = await screen.findByLabelText('Nova senha');
    await userEvent.type(pwd, 'novaSenha123');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha123');
    await userEvent.click(screen.getByRole('button', { name: /Salvar nova senha/ }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledWith('novaSenha123'));
    expect(await screen.findByText('TELA DE LOGIN')).toBeInTheDocument();
  });

  it('blocks the submit when the two passwords do not match', async () => {
    mockedEstablish.mockResolvedValue('ready');
    renderPage();

    const pwd = await screen.findByLabelText('Nova senha');
    await userEvent.type(pwd, 'novaSenha123');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'outraSenha999');
    await userEvent.click(screen.getByRole('button', { name: /Salvar nova senha/ }));

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('shows an error state when the recovery link is invalid or expired', async () => {
    mockedEstablish.mockResolvedValue('error');
    renderPage();

    expect(await screen.findByText(/inválido ou expirou/)).toBeInTheDocument();
  });
});
