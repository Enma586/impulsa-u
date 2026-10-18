import { defineConfig, devices } from '@playwright/test';

const puerto = 5197;
const urlWeb = `http://localhost:${String(puerto)}`;

/** Proyectos de cada PR (sección 4 del documento E2E): escritorio y celular, en tema oscuro. */
export default defineConfig({
  testDir: './pruebas',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  reporter: 'list',
  // Usa el Google Chrome instalado: `playwright install chrome` en CI, sin descargar otro Chromium.
  use: { baseURL: urlWeb, locale: 'es-ES', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm --filter @impulsau/web exec vite --port ${String(puerto)} --strictPort`,
    cwd: '../..',
    url: urlWeb,
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    {
      name: 'escritorio-oscuro',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1024 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'celular-oscuro',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, colorScheme: 'dark' },
    },
  ],
});
