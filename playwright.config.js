import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright para testes E2E críticos (fluxos end-to-end no browser real).
 *
 * O grosso dos testes E2E vive em `src/test/e2e/*.test.jsx` (RTL+jsdom).
 * Aqui ficam os 2 cenários que precisam de browser real:
 *   - wizard.spec.js     : criação completa de personagem
 *   - persistence.spec.js: refresh do navegador mantém dados (localStorage)
 *
 * O webServer roda `vite preview` na build estática para evitar HMR.
 */
export default defineConfig({
  testDir: './e2e-pw',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
