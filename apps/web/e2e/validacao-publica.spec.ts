import { expect, test } from '@playwright/test';

import { stubValidarLaudo } from './support/stubs';

/**
 * Public QR validation E2E (F-S010-2 / SPEC §7.2 "validação pública"): the
 * anonymous anti-fraud surface. Valid code ⇒ correct data; unknown code ⇒ the
 * exact not-found / not-authentic copy.
 */
const LAUDO = {
  autentico: true,
  numero: 'N-003AGEHAB',
  versao: 2,
  cliente: 'Construtora Alfa',
  obra: 'Residencial Beta',
  data_emissao: '2026-06-01',
  resultados: [
    { idade_dias: 7, fcm_mpa: 21.5, fck_projeto: 30 },
    { idade_dias: 28, fcm_mpa: 32.4, fck_projeto: 30 },
  ],
};

test.describe('Validação pública por QR (F-S009-2)', () => {
  test('código válido mostra o laudo autêntico e os dados corretos', async ({ page }) => {
    await stubValidarLaudo(page, 200, LAUDO);
    await page.goto('/validar/ABC123');
    await expect(page.getByText('Laudo autêntico.')).toBeVisible();
    await expect(page.getByText('N-003AGEHAB')).toBeVisible();
    await expect(page.getByText('Construtora Alfa')).toBeVisible();
    // FCM do resultado de 28 dias.
    await expect(page.getByText('32.4')).toBeVisible();
  });

  test('código inexistente mostra "não encontrado / não autêntico"', async ({ page }) => {
    await stubValidarLaudo(page, 404, {
      error: 'LAUDO_NAO_ENCONTRADO',
      message: 'Laudo não encontrado / não autêntico.',
    });
    await page.goto('/validar/INEXISTENTE');
    await expect(page.getByText('Laudo não encontrado / não autêntico.')).toBeVisible();
  });
});
