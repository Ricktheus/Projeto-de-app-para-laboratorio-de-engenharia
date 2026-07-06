import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import { CampoPage } from '../features/campo/CampoPage';
import { LaudosPage } from '../features/laudos/LaudosPage';
import { ObrasPage } from '../features/obras/ObrasPage';
import { PainelPage } from '../features/painel/PainelPage';
import { PortalPage } from '../features/portal/PortalPage';
import { PrensaPage } from '../features/prensa/PrensaPage';
import { UsuariosPage } from '../features/usuarios/UsuariosPage';

import { ProtectedRoute } from './ProtectedRoute';
import { RoleHomeRedirect } from './RoleHomeRedirect';

/**
 * Web route table (F-S003-2). Every area route is wrapped by {@link
 * ProtectedRoute}, which enforces auth + role access. `/` resolves to the
 * role's home; unknown paths fall back to it.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleHomeRedirect />} />
      <Route
        path="/painel"
        element={
          <ProtectedRoute area="painel">
            <PainelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campo"
        element={
          <ProtectedRoute area="campo">
            <CampoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prensa"
        element={
          <ProtectedRoute area="prensa">
            <PrensaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal"
        element={
          <ProtectedRoute area="portal">
            <PortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/laudos"
        element={
          <ProtectedRoute area="laudos">
            <LaudosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/obras"
        element={
          <ProtectedRoute area="painel">
            <ObrasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute area="usuarios">
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
