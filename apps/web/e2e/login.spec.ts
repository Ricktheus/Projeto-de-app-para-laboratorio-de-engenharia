import { expect, test } from '@playwright/test';

import { stubDashboardEmpty, stubLoginFailure, stubLoginSuccess } from './support/stubs';

/**
 * Login flow E2E (F-S010-2 / SPEC §7.2 "login"). Exercises the real form and
 * role-based redirect in a real browser; the auth boundary is stubbed.
 */
test.describe('Login (F-S003-1)', () => {
  test('bloqueia o envio e mostra erros de campo com o formulário vazio', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Informe o e-mail.')).toBeVisible();
    await expect(page.getByText('Informe a senha.')).toBeVisible();
  });

  test('mostra a mensagem genérica em credenciais inválidas (sem enumeração)', async ({ page }) => {
    await stubLoginFailure(page);
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('eng@lab.com');
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.');
  });

  test('autentica o engenheiro e redireciona para o dashboard operacional', async ({ page }) => {
    await stubLoginSuccess(page, {
      profile: { role: 'eng_escritorio', nome: 'Escritório', is_admin: true },
    });
    await stubDashboardEmpty(page);
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('eng@lab.com');
    await page.getByLabel('Senha').fill('secret123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard operacional' })).toBeVisible();
  });
});
