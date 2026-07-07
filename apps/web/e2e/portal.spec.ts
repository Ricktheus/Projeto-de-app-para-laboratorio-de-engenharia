import { expect, test } from '@playwright/test';

import { stubLaudosList, stubLoginSuccess } from './support/stubs';

/**
 * Client portal E2E (F-S010-2 / SPEC §7.2 "portal"). Signs in as a client and
 * asserts the portal lists only its signed reports (with the download action),
 * plus the empty state.
 */
const PORTAL_LAUDO = {
  id: 'l-1',
  numero: 'N-777',
  tipo_laudo: 'final_28d',
  versao: 1,
  data_emissao: '2026-06-10',
  obra_id: 'o-1',
  obras: { nome: 'Obra Portal', sigla: 'OBRA-P' },
};

async function loginAsClient(page: import('@playwright/test').Page, email: string) {
  await stubLoginSuccess(page, {
    user: { id: 'cli-1', email },
    profile: { role: 'cliente', nome: 'Cliente', is_admin: false },
  });
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('secret123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/portal$/);
}

test.describe('Portal do cliente (F-S009-1)', () => {
  test('cliente autenticado vê seus laudos assinados para download', async ({ page }) => {
    await stubLaudosList(page, [PORTAL_LAUDO]);
    await loginAsClient(page, 'cliente@obra.com');
    await expect(page.getByText('N-777')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar laudo (PDF)' })).toBeVisible();
  });

  test('portal sem laudos mostra o estado vazio', async ({ page }) => {
    await stubLaudosList(page, []);
    await loginAsClient(page, 'cliente2@obra.com');
    await expect(page.getByText('Você ainda não possui laudos disponíveis.')).toBeVisible();
  });
});
