import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright = canal oficial de E2E (fluxos end-to-end no browser real).
 *
 * Testes de integração (RTL + jsdom) vivem em `src/test/integration/*.test.jsx`
 * e rodam via Vitest — NÃO são E2E, apesar do nome anterior da pasta.
 *
 * Aqui ficam os cenários que dependem de browser real:
 *   - smoke.spec.js      : fluxo básico carrega
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
    // Build E2E com Supabase DUMMY: ref determinístico ("dummy") → storageKey
    // sb-dummy-auth-token e endpoints previsíveis. O helper supabase-stub
    // intercepta toda a rede, então nenhum backend real é contatado.
    env: {
      VITE_SUPABASE_URL: 'https://dummy.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'dummy-anon-key-for-e2e',
    },
  },
})
