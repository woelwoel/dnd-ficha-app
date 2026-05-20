import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Forja de Heróis — D&D 5e',
        short_name: 'Forja de Heróis',
        description: 'Gerador e gerenciador de fichas de personagem de D&D 5e em PT-BR. Funciona offline.',
        lang: 'pt-BR',
        theme_color: '#3b2a1a',
        background_color: '#fcf3da',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'any'      },
          { src: 'favicon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache do app shell (JS, CSS, HTML, favicon).
        globPatterns: ['**/*.{js,css,html,svg}'],
        // Aumenta o limite — bundle do CharacterSheet passa de 2MB.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Após deploy novo, o SW novo assume imediatamente — evita o caso de
        // SW velho servir HTML antigo apontando pra chunks que não existem mais.
        skipWaiting: true,
        clientsClaim: true,
        // Limpa precache de versões anteriores no activate.
        cleanupOutdatedCaches: true,
        // Runtime: dados SRD JSON cacheados sob demanda (CacheFirst — não mudam).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/srd-data/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'srd-data-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Mapas SVG/PNG do bestiário e tokens.
            urlPattern: ({ url }) => url.pathname.startsWith('/maps/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'maps-v1',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fontes do Google: cacheia stylesheet + arquivos .woff2 estaticamente.
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Desabilitado em dev — só registra no build (preview/produção).
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules', 'dist', 'e2e-pw', 'playwright-report', 'test-results'],
  },
})
