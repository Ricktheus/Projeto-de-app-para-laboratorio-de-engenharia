import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E config (F-S010-2 / SPEC §7.2). Drives the REAL web app in a real
 * Chromium against a Vite dev server, stubbing only the Supabase/Edge network
 * boundary (see e2e/support/stubs.ts) so the flows — login, public validation and
 * the client portal — run deterministically without a live backend.
 *
 * `[PREMISSA]` The browser is the environment's pre-installed Chromium
 * (PLAYWRIGHT_BROWSERS_PATH); `executablePath` points at it so no download is
 * needed. Vite reads the dummy public creds from `.env.e2e` (`--mode e2e`).
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    trace: 'off',
    launchOptions: { executablePath: CHROMIUM_PATH },
  },
  webServer: {
    command: `pnpm exec vite --mode e2e --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
