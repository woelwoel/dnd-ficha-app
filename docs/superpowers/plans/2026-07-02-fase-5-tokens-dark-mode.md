# Fase 5 — Tokens Semânticos + Dark Mode: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dark mode funcional ("pergaminho escuro") em todas as telas + tokens semânticos para componentes novos, SEM migrar os 226 componentes existentes.

**Architecture:** Insight que muda o custo da fase: o remap invertido `gray-*`→pergaminho (a "armadilha" da análise crítica) é CENTRALIZADO em `src/index.css` — todas as classes de cor do app resolvem para `var(--color-*)` geradas pelo `@theme` do Tailwind 4. Logo, um bloco `[data-theme="dark"]` que redefine as ~100 variáveis de paleta re-tematiza o app inteiro em cascata. A migração de componentes para tokens semânticos deixa de ser pré-requisito do dark mode e vira política gradual.

**Tech Stack:** Tailwind 4 (`@theme` + CSS vars), React hook + localStorage + `prefers-color-scheme`, lucide-react (ícones do toggle).

---

### Task 1: Tokens semânticos no @theme

**Files:**
- Modify: `src/index.css` (dentro do `@theme`, após a paleta ink)

- [ ] **Step 1:** Adicionar tokens semânticos referenciando a paleta (var() dentro de @theme é suportado no Tailwind 4; o build confirma):

```css
  /* ── Tokens semânticos (usar em componentes NOVOS; classes gray-* legadas
        seguem funcionando via remap abaixo, mas são deprecated) ── */
  --color-surface:        var(--color-parchment-200); /* papel base */
  --color-surface-raised: var(--color-parchment-100); /* cards */
  --color-surface-sunken: var(--color-parchment-300); /* wells, inputs */
  --color-text:           var(--color-ink-500);
  --color-text-muted:     var(--color-ink-200);
  --color-text-faint:     var(--color-ink-50);
  --color-edge:           var(--color-parchment-600); /* bordas */
  --color-edge-soft:      var(--color-parchment-400);
```

- [ ] **Step 2:** `npm run build` e conferir no CSS gerado que `bg-surface` etc. existem e resolvem. Se `var()` aninhado não funcionar no @theme desta versão, repetir os hex literais e adicionar os overrides no bloco dark da Task 2.

### Task 2: Bloco dark centralizado

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1:** Após o fechamento do `@theme`, adicionar o bloco de overrides. Design "pergaminho escuro": papel vira couro/madeira escura, tinta vira creme — a MESMA identidade, invertida. Escopado com `@media not print` para a impressão sair sempre clara (PrintView):

```css
/* ── Tema escuro: "pergaminho à luz de vela" ─────────────────────────
   Override centralizado das variáveis de paleta. NENHUM componente
   muda: todas as classes (inclusive o remap gray-*) resolvem via
   var(--color-*), então a cascata re-tematiza o app inteiro.
   @media not print: impressão sai SEMPRE no tema claro. */
@media not print {
  :root[data-theme='dark'] {
    /* Papel → couro escuro */
    --color-parchment-50:  #2b2114;
    --color-parchment-100: #262015;  /* card */
    --color-parchment-200: #201812;  /* base */
    --color-parchment-300: #191510;
    --color-parchment-400: #3a2f1e;  /* shadow → borda suave */
    --color-parchment-500: #4a3c26;
    --color-parchment-600: #5d4c30;  /* edge */
    --color-parchment-700: #7d6a4a;
    --color-parchment-800: #c9b896;
    --color-parchment-900: #e8dcc0;

    /* Tinta → creme */
    --color-ink-50:  #8a7a5e;  /* faded */
    --color-ink-100: #a5936e;
    --color-ink-200: #bfae8a;  /* secondary */
    --color-ink-300: #d3c3a0;
    --color-ink-400: #dfd2b2;
    --color-ink-500: #e8dcc0;  /* primary */
    --color-ink-600: #f0e7d0;
    --color-ink-700: #f7f0e0;

    /* Ornamento dourado clareia pra manter presença */
    --color-gilt-400: #c9a455;
    --color-gilt-500: #b8954a;
    --color-gilt-600: #a5823e;

    /* Remap gray-* recalculado (mesma convenção invertida do tema claro:
       50-500 = texto, 600-950 = fundos/bordas) */
    --color-gray-50:  #e8dcc0;
    --color-gray-100: #dfd2b2;
    --color-gray-200: #d3c3a0;
    --color-gray-300: #bfae8a;
    --color-gray-400: #a5936e;
    --color-gray-500: #8a7a5e;
    --color-gray-600: #5d4c30;
    --color-gray-700: #4a3c26;
    --color-gray-800: #262015;
    --color-gray-900: #201812;
    --color-gray-950: #191510;

    /* Sombras mais fundas */
    --shadow-parchment-sm: 0 1px 2px rgba(0,0,0,0.4);
    --shadow-parchment:    0 2px 6px rgba(0,0,0,0.5);
    --shadow-parchment-lg: 0 8px 24px rgba(0,0,0,0.6);
  }

  /* Paletas semânticas: clarear 1-2 steps pra contraste em fundo escuro.
     Estratégia mínima: só os steps mais usados como TEXTO/ícone (300-500)
     clareiam; steps de fundo (50-100) escurecem. Ajustar pelo axe (Fase 6). */
  :root[data-theme='dark'] {
    --color-amber-50: #3a2f18; --color-amber-100: #4a3c20;
    --color-amber-400: #d4b36a; --color-amber-500: #c9a455;
    --color-red-50: #3a1a10; --color-red-100: #4a2015;
    --color-red-400: #e08a60; --color-red-500: #d27a55;
    --color-blue-50: #1a2430; --color-blue-100: #223040;
    --color-blue-400: #8aa8c0; --color-blue-500: #7a9ab5;
    --color-green-50: #1c2a12; --color-green-100: #263a18;
    --color-green-400: #a3c078; --color-green-500: #8aa863;
    --color-purple-50: #2a1a24; --color-purple-100: #3a2432;
    --color-purple-400: #c094ad; --color-purple-500: #ba94ad;
    --color-yellow-400: #e6cf86; --color-yellow-500: #d4b35a;
    --color-orange-400: #d8a06d; --color-orange-500: #c47745;
    --color-sky-400: #94b5c8; --color-sky-500: #7aa3b8;
  }

  /* Gradientes do body no escuro (vinheta de vela) */
  :root[data-theme='dark'] body {
    background-image:
      radial-gradient(ellipse at 20% 15%, rgba(201, 164, 85, 0.06) 0%, transparent 45%),
      radial-gradient(ellipse at 75% 80%, rgba(201, 164, 85, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.35) 0%, transparent 70%);
  }
}
```

- [ ] **Step 2:** Verificação visual no preview: setar `document.documentElement.dataset.theme='dark'` via console e navegar pelas telas principais.

### Task 3: Hook useTheme + toggle na UI

**Files:**
- Create: `src/hooks/useTheme.js`
- Modify: `src/components/ui/AppFooter.jsx` (botão sol/lua)

- [ ] **Step 1:** Hook com 3 estados (auto/light/dark), persistência e meta theme-color:

```js
// src/hooks/useTheme.js
import { useCallback, useEffect, useState } from 'react'

const KEY = 'dnd-ficha:theme' // 'light' | 'dark' | ausente = auto (SO decide)

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

function resolve(pref) {
  return pref ?? (systemPrefersDark() ? 'dark' : 'light')
}

function apply(theme) {
  document.documentElement.dataset.theme = theme
  // PWA: barra do navegador acompanha o tema.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#201812' : '#e8dcc0'
}

export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY))
  const theme = resolve(pref)

  useEffect(() => { apply(theme) }, [theme])

  // Segue o SO em tempo real enquanto estiver no modo auto.
  useEffect(() => {
    if (pref) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply(resolve(null))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const toggle = useCallback(() => {
    // Ciclo simples claro↔escuro (auto vira explícito no primeiro toque).
    const next = resolve(pref) === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    setPref(next)
  }, [pref])

  return { theme, toggle }
}
```

- [ ] **Step 2:** Botão no `AppFooter` (padrão do arquivo; ícones `Moon`/`Sun` de lucide-react, `aria-label` "Alternar tema claro/escuro").
- [ ] **Step 3:** Testes: `src/test/ui/theme.test.jsx` — toggle alterna `data-theme` e persiste no localStorage; modo auto respeita matchMedia mockado.

### Task 4: Verificação + fechamento

- [ ] **Step 1:** Preview: telas principais (lista, ficha, wizard, campanhas) nos dois temas; screenshot de prova.
- [ ] **Step 2:** `npm test` + `npm run build` verdes.
- [ ] **Step 3:** Commit + merge master + push.

## Política contínua (fora desta fase)

- Componentes NOVOS usam os tokens semânticos (`bg-surface`, `text-text-muted`…); classes `gray-*` são deprecated (o remap vira camada de compat).
- Contraste AA nos dois temas é auditado pela Fase 6 (axe) — ajustes finos das paletas semânticas dark acontecem lá.
- Tokens "redesign" órfãos (`--color-bg-canvas`, `--color-shell-*`…) são candidatos a remoção quando a Fase 6 confirmar que nada os usa (redesign foi abandonado).
