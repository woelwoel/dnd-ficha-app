import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'e2e-pw', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Arquivos de configuração e helpers de teste rodam em Node — não browser.
  {
    files: ['playwright.config.js', 'vite.config.js', 'eslint.config.js', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // ── Fronteira multi-sistema ─────────────────────────────────────
  // Fora de src/systems/** e src/test/**, ninguém importa das entranhas
  // de um sistema — só via contrato System (core registry + ui-registry).
  // Whitelist esvaziada na Fase 4 (2026-07-02). NÃO adicionar exceções.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: [
      'src/systems/**',
      'src/test/**',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/systems/dnd5e/**'],
          message: 'Importe via contrato System (src/systems), não das entranhas do dnd5e. Ver docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md (Fase 4).',
        }],
      }],
    },
  },
])
