import { type UserRole } from '@concreto/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { Toaster } from '../components/ui';
import { useAuthStore } from '../stores/auth-store';
import { useToastStore } from '../stores/toast-store';

import { ProtectedRoute } from './ProtectedRoute';

function setAuth(role: UserRole) {
  useAuthStore.setState({
    status: 'authenticated',
    session: null,
    profile: { role, nome: 'Fulano', isAdmin: role !== 'socio_campo' && role !== 'cliente' },
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>PÁGINA DE LOGIN</div>} />
        <Route path="/campo" element={<div>HOME CAMPO</div>} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute area="usuarios">
              <div>GESTÃO DE USUÁRIOS</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prensa"
          element={
            <ProtectedRoute area="prensa">
              <div>PRENSA</div>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (F-S003-2)', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', session: null, profile: null, failedAttempts: [] });
    useToastStore.setState({ toasts: [] });
  });

  it('redirects a deep link to a protected route to /login when unauthenticated', () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    renderAt('/usuarios');
    expect(screen.getByText('PÁGINA DE LOGIN')).toBeInTheDocument();
  });

  it('shows a loader during the initial bootstrap (no premature redirect)', () => {
    renderAt('/usuarios'); // status stays 'loading'
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.queryByText('GESTÃO DE USUÁRIOS')).not.toBeInTheDocument();
  });

  it('lets an allowed role open the page', () => {
    setAuth('eng_escritorio');
    renderAt('/usuarios');
    expect(screen.getByText('GESTÃO DE USUÁRIOS')).toBeInTheDocument();
  });

  it('denies socio_campo from user management: redirects home + toast (DoD)', async () => {
    setAuth('socio_campo');
    renderAt('/usuarios');
    expect(screen.getByText('HOME CAMPO')).toBeInTheDocument();
    expect(screen.queryByText('GESTÃO DE USUÁRIOS')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('Você não tem permissão para acessar esta página.'),
      ).toBeInTheDocument(),
    );
  });

  it('denies socio_campo from the press screen too (DoD)', () => {
    setAuth('socio_campo');
    renderAt('/prensa');
    expect(screen.getByText('HOME CAMPO')).toBeInTheDocument();
    expect(screen.queryByText('PRENSA')).not.toBeInTheDocument();
  });
});
