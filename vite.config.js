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
            // CacheFirst → o cache ANTIGO sobrevive ao deploy. Bumpar `cacheName`
            // força o SW a criar bucket novo; `cleanupOutdatedCaches` apaga o
            // antigo no activate. Bump quando schema SRD muda (ex.: nova choice
            // em phb-class-choices-pt.json).
            //
            // Histórico:
            //  v1 → v2 (2026-05-29): adicionou martial_archetype_maneuvers,
            //    sub-picks de Bárbaro Totem, Patrulheiro Caçador/Mestre das
            //    Bestas; descs enriquecidas de 19 subclasses; multiSelectByLevel
            //    em Bruxo invocações e Feiticeiro metamagia.
            //  v2 → v3 (2026-05-30): adicionou wild-shape-beasts-pt.json
            //    (catálogo de 70 bestas SRD pra Forma Selvagem do Druida).
            //  v3 → v4 (2026-05-30): traduções completas (ataques + traços)
            //    no wild-shape-beasts-pt.json.
            //  v4 → v5 (2026-06-17): marcação de combate (combat/category/
            //    actionType) nas features de phb-class-progression-pt.json e
            //    phb-class-choices-pt.json, consumida pela aba Combate.
            //  v5 → v6 (2026-06-18): correção das proficiências de multiclasse
            //    do Bárbaro (só Escudos, não armadura leve/média) em
            //    phb-multiclass-pt.json.
            //  v6 → v7 (2026-06-18): metamágica do Feiticeiro (nv10/17) e
            //    inimigo favorito do Patrulheiro (nv6/14) em
            //    phb-class-choices-pt.json.
            //  v7 → v8 (2026-06-24): talentos do Caldeirão de Tasha em
            //    tasha-feats-pt.json (1o conteúdo suplementar).
            //  v8 → v9 (2026-06-24): classe Artífice (tasha-classes,
            //    tasha-class-progression, tasha-class-choices).
            //  v9 → v10 (2026-06-24): catálogo de infusões do Artífice
            //    (tasha-infusions-pt.json) + lista de magias do Artífice.
            //  v10 → v11 (2026-06-25): subclasses de Tasha do bárbaro
            //    (tasha-class-choices-pt.json ganhou a chave barbaro).
            //  v11 → v12 (2026-06-26): features opcionais de Tasha
            //    (tasha-class-choices-pt.json: invocações do bruxo, metamagia
            //    do feiticeiro, estilos de luta, manobras).
            //  v12 → v13 (2026-06-26): magias do Caldeirão de Tasha
            //    (tasha-spells-pt.json: 21 magias compostas sobre o PHB).
            //  v13 → v14 (2026-06-26): features opcionais do Patrulheiro
            //    (Hábil, Inimigo Eleito) + Druida (Companheiro Animal)
            //    (tasha-class-choices-pt.json).
            urlPattern: ({ url }) => url.pathname.startsWith('/srd-data/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'srd-data-v14',
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
    exclude: [
      'node_modules', 'dist', 'e2e-pw', 'playwright-report', 'test-results',
      '.claude/**', '.claire/**', '.superpowers/**',
    ],
  },
})
