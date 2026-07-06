# Visual v2 no Site Inteiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar a identidade escura da ficha v2 (tokens `--v2-*`) pro site inteiro via tema global `.theme-v2` no `<html>` + ponte CSS regenerada pro app todo, com escape hatch `?theme=parchment` e passada visual em lista/wizard/login.

**Architecture:** Novo `src/theme/` (tokens com duplo escopo `.theme-v2, .sheet-v2`; ponte gerada pelo `scripts/gen-bridge.mjs` versionado, embrulhada em `@media screen`; flag espelho do sheetV2). O flip não toca JSX — as 76 telas parchment escurecem pela ponte. Depois, passada visual em 3 telas.

**Tech Stack:** React 19, Vite 8, Tailwind 4 (utilitários remapeados pelo index.css), Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-07-05-visual-v2-site-design.md`

**Branch:** criar `feature/visual-v2-site` a partir da master antes da Task 1.

---

## Contexto essencial pro implementador

- O `index.css` REMAPEIA as paletas Tailwind pra um tema parchment (claro e
  escuro via `data-theme` no `<html>`, controlado por `src/hooks/useTheme.js`).
  Os componentes usam classes como `bg-parchment-100`, `text-ink-500` etc.
- A ficha v2 (`.sheet-v2`) tem tokens escuros próprios
  (`v2/tokens.css`) e uma ponte gerada (`v2/legacy-bridge.css`) que re-tematiza
  os utilitários parchment DENTRO da ficha, por seletor com `!important`.
- Este projeto: globalizar tokens+ponte sob `.theme-v2` (aplicada no `<html>`),
  regenerando a ponte a partir do grep do `src/` INTEIRO.
- A impressão (`@media print` + `#print-character-view` no index.css) usa as
  classes parchment com cores de papel — por isso a ponte inteira vive dentro
  de `@media screen`.
- Convenção: comentários/UI em pt-BR com acentos; commits sem acento no título.

---

### Task 1: Flag `?theme` + teste

**Files:**
- Create: `src/theme/flag.js`
- Create: `src/test/theme-flag.test.js`

- [ ] **Step 1: Teste que falha**

Criar `src/test/theme-flag.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { isThemeV2Enabled } from '../theme/flag'

function makeStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  }
}

describe('isThemeV2Enabled (tema global v2 é o padrão)', () => {
  let storage
  beforeEach(() => { storage = makeStorage() })

  it('sem query param e sem storage, LIGADO por padrão', () => {
    expect(isThemeV2Enabled('', storage)).toBe(true)
  })

  it('?theme=parchment persiste o opt-out', () => {
    expect(isThemeV2Enabled('?theme=parchment', storage)).toBe(false)
    expect(isThemeV2Enabled('', storage)).toBe(false) // opt-out lembrado
  })

  it('?theme=v2 liga e limpa o opt-out', () => {
    storage.setItem('themeParchment', '1')
    expect(isThemeV2Enabled('?theme=v2', storage)).toBe(true)
    expect(isThemeV2Enabled('', storage)).toBe(true) // opt-out foi limpo
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/theme-flag.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/theme/flag.js`:

```js
/**
 * Tema global v2 (identidade escura da ficha aplicada ao site inteiro).
 * `?theme=parchment` é o escape hatch — desliga e persiste o opt-out;
 * `?theme=v2` religa e limpa. Sem query, ligado a menos que haja opt-out.
 * Espelho do isSheetV2Enabled. Removido no corte definitivo, após a
 * observação do dono em sessões reais.
 */
export function isThemeV2Enabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  const q = new URLSearchParams(search).get('theme')
  if (q === 'v2') { storage?.removeItem('themeParchment'); return true }
  if (q === 'parchment') { storage?.setItem('themeParchment', '1'); return false }
  return storage?.getItem('themeParchment') !== '1'
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/theme-flag.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/theme/flag.js src/test/theme-flag.test.js
git commit -m "feat(theme): flag do tema global v2 (?theme=parchment escape hatch)"
```

---

### Task 2: Tokens em `src/theme/tokens.css` (duplo escopo) + componentes v2-* planos

**Files:**
- Create: `src/theme/tokens.css`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx:1-2`
- Delete: `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css`

- [ ] **Step 1: Criar `src/theme/tokens.css`**

Conteúdo COMPLETO (é o `v2/tokens.css` atual com três mudanças: (a) o bloco de
variáveis ganha duplo escopo `.theme-v2, .sheet-v2`; (b) a APARÊNCIA
(background/color/font Inter) fica SÓ no `.sheet-v2` — o site global mantém as
fontes atuais, cores globais vêm da ponte/bespoke; (c) componentes `v2-*` viram
seletores planos):

```css
/* Design system v2 — direção "App moderno" escuro.
   Tokens com DUPLO escopo: `.theme-v2` (tema global no <html>) e `.sheet-v2`
   (ficha) — a ficha continua funcional mesmo com o tema global desligado
   pelo escape hatch (?theme=parchment).
   NÃO usar utilitários de cor do Tailwind em componentes v2 (index.css
   remapeia; a ponte cobre só o legado). */
.theme-v2,
.sheet-v2 {
  --v2-surface-0: #0f141a;
  --v2-surface-1: #1a222c;
  --v2-surface-2: #24313f;
  --v2-border: #2b3644;
  --v2-border-strong: #3a4756;
  --v2-text-1: #e7edf3;
  --v2-text-2: #8b99a7;
  --v2-text-3: #5c6a78;
  --v2-accent: #4fc7ab; /* fallback; na ficha o acento por classe sobrescreve */
  --v2-success: #58c98c;
  --v2-warning: #e8b04c;
  --v2-danger: #f0908a;
}

/* Aparência própria da FICHA (tipografia Inter etc.) — não vaza pro site. */
.sheet-v2 {
  background: var(--v2-surface-0);
  color: var(--v2-text-1);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* ── Componentes v2 (planos: utilizáveis em qualquer tela do tema) ── */
.v2-panel {
  background: var(--v2-surface-1);
  border: 1px solid var(--v2-border);
  border-radius: 10px;
  padding: 10px 12px;
}
.v2-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--v2-text-2);
  margin-bottom: 6px;
}
.v2-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
}
.v2-chip {
  background: var(--v2-surface-2);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  white-space: nowrap;
}
.v2-btn {
  background: var(--v2-surface-2);
  border: 1px solid var(--v2-border);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--v2-text-1);
  cursor: pointer;
}
.v2-btn:hover { border-color: var(--v2-border-strong); }
.v2-btn:focus-visible { outline: 2px solid var(--v2-accent); outline-offset: 1px; }
.v2-mut { color: var(--v2-text-2); }
.v2-acc { color: var(--v2-accent); }
.v2-ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
}
.v2-ability-mod {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
}
.v2-tab {
  border: 0;
  background: transparent;
  color: var(--v2-text-2);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.v2-tab[aria-selected='true'] {
  background: var(--v2-surface-2);
  color: var(--v2-text-1);
  font-weight: 600;
}

/* Linhas/cards roláveis (rolagem interativa) */
.v2-rollable {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}
.v2-rollable:hover { background: var(--v2-surface-2); }
.v2-rollable:active { transform: scale(0.99); }
.v2-rollable-armed { outline: 2px solid var(--v2-success); outline-offset: -2px; }

/* Bottom nav do mobile (< lg) da ficha. */
.v2-bottomnav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 40;
  background: var(--v2-surface-1);
  border-top: 1px solid var(--v2-border);
  padding-bottom: env(safe-area-inset-bottom);
}
.v2-bottomnav-item {
  flex: 1;
  min-height: 52px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 0; background: transparent; color: var(--v2-text-2); cursor: pointer;
}
.v2-bottomnav-item[aria-selected='true'] { color: var(--v2-accent); }

.v2-ability-roll {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 100%; padding: 8px 4px;
  border: 0; background: transparent; color: inherit; font: inherit;
  cursor: pointer; border-radius: 10px;
}
.v2-ability-roll:hover { background: var(--v2-surface-2); }
.v2-ability-edit {
  position: absolute; top: 2px; right: 2px;
  min-width: 24px; min-height: 24px;
  border: 0; background: transparent; color: var(--v2-text-3);
  cursor: pointer; border-radius: 6px; font-size: 12px; line-height: 1;
}
.v2-ability-edit:hover { color: var(--v2-text-1); background: var(--v2-surface-2); }
```

ATENÇÃO ao transcrever: o conteúdo acima foi derivado 1:1 do
`v2/tokens.css` atual — se o arquivo atual tiver algum seletor a mais que este
plano (confira com `git diff --no-index` mental ou leitura), preserve-o,
aplicando a mesma regra (des-escopar `.sheet-v2 .v2-*` → `.v2-*`).

- [ ] **Step 2: Atualizar o import do SheetV2 e apagar o arquivo antigo**

Em `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx`, trocar:

```jsx
import './tokens.css'
```

por:

```jsx
import '../../../../../theme/tokens.css'
```

Apagar `src/systems/dnd5e/components/CharacterSheet/v2/tokens.css`.

- [ ] **Step 3: Regressão da ficha**

Run: `npx vitest run src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-RollableRow.test.jsx src/test/sheetV2-ActionsTab.test.jsx src/test/sheetV2-dice-accent.test.jsx`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/theme/tokens.css src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx
git rm src/systems/dnd5e/components/CharacterSheet/v2/tokens.css
git commit -m "refactor(theme): tokens v2 em src/theme com duplo escopo (componentes v2-* planos)"
```

---

### Task 3: Gerador `scripts/gen-bridge.mjs` + ponte global

**Files:**
- Create: `scripts/gen-bridge.mjs`
- Create: `src/theme/legacy-bridge.css` (GERADO)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx:2`
- Delete: `src/systems/dnd5e/components/CharacterSheet/v2/legacy-bridge.css`

- [ ] **Step 1: Escrever o gerador**

Criar `scripts/gen-bridge.mjs` (rodar com `node scripts/gen-bridge.mjs`):

```js
// Gera src/theme/legacy-bridge.css: re-tematiza os utilitários de cor do
// Tailwind/parchment pro tema v2, POR UTILITÁRIO, com !important, escopo duplo
// (.theme-v2 global e .sheet-v2 da ficha) e TUDO dentro de @media screen —
// a impressão (#print-character-view) usa as cores parchment de papel.
// Uso: node scripts/gen-bridge.mjs   (regravar sempre que utilitários mudarem)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'src'
const OUT = 'src/theme/legacy-bridge.css'

/* ── 1. Coleta de tokens ──────────────────────────────────────────────── */
const PALETTES = 'parchment|ink|gilt|gold|shell|blood|accent|amber|blue|emerald|gray|green|orange|purple|red|rose|sky|yellow|white|black'
const TOKEN_RE = new RegExp(
  String.raw`(?<![-\w:])((?:[a-z-]+:)*(?:bg|text|border(?:-[tbrlxy])?|from|to|via|ring|divide|placeholder)-(?:${PALETTES})(?:-\d{2,3})?(?:\/\d{1,3})?)(?![-\w])`,
  'g',
)

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(jsx?|tsx?)$/.test(name)) yield p
  }
}

const tokens = new Set()
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(TOKEN_RE)) tokens.add(m[1])
}

/* ── 2. Mapeamento token → variável v2 ───────────────────────────────── */
function hueOf(palette) {
  if (['red', 'rose', 'blood'].includes(palette)) return 'danger'
  if (['emerald', 'green'].includes(palette)) return 'success'
  if (['amber', 'yellow', 'orange', 'gilt', 'gold'].includes(palette)) return 'warning'
  if (palette === 'accent') return 'accent'
  if (['blue', 'sky', 'purple'].includes(palette)) return 'cool'
  return 'neutral' // parchment, ink, gray, shell, white, black
}

function mapVar(kind, palette, step) {
  const hue = hueOf(palette)
  if (kind === 'gradient') return '--v2-surface-2'
  if (kind === 'bg') {
    if (palette === 'black') return '--v2-surface-0'
    if (palette === 'white') return '--v2-surface-1'
    if (palette === 'parchment') return step <= 300 ? '--v2-surface-1' : '--v2-surface-2'
    if (palette === 'gray') return step >= 800 ? '--v2-surface-1' : '--v2-surface-2'
    return '--v2-surface-2'
  }
  if (kind === 'border') {
    if (hue === 'danger') return '--v2-danger'
    if (hue === 'success') return '--v2-success'
    if (hue === 'warning') return '--v2-warning'
    if (hue === 'accent') return '--v2-accent'
    if (hue === 'cool') return '--v2-border'
    if (palette === 'gray') return step === 600 ? '--v2-border-strong' : '--v2-border'
    return '--v2-border-strong' // parchment, ink, shell, white, black
  }
  // kind === 'text'
  if (hue === 'danger') return '--v2-danger'
  if (hue === 'success') return '--v2-success'
  if (hue === 'warning') return '--v2-warning'
  if (hue === 'accent') return '--v2-accent'
  if (hue === 'cool') return '--v2-text-2'
  if (palette === 'white' || palette === 'black') return '--v2-text-1'
  if (palette === 'parchment') return step <= 300 ? '--v2-text-1' : '--v2-text-2'
  if (palette === 'ink') return step <= 50 ? '--v2-text-3' : step <= 200 ? '--v2-text-2' : '--v2-text-1'
  if (palette === 'gray') {
    if (step <= 200) return '--v2-text-1'
    if (step === 500) return '--v2-text-3'
    return '--v2-text-2'
  }
  return '--v2-text-2' // shell
}

/* ── 3. Parse do token → { seletor, media, propriedade, var } ────────── */
const VARIANT_PSEUDO = {
  hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible',
  active: ':active', disabled: ':disabled',
}

function parseToken(token) {
  const parts = token.split(':')
  const base = parts.pop()
  const variants = parts // ex.: ['lg'] ou ['hover'] ou ['lg','hover']

  const m = base.match(new RegExp(
    String.raw`^(bg|text|border(?:-[tbrlxy])?|from|to|via|ring|divide|placeholder)-(${PALETTES})(?:-(\d{2,3}))?(?:\/(\d{1,3}))?$`,
  ))
  if (!m) return null
  const [, prefix, palette, stepStr] = m
  const step = stepStr ? parseInt(stepStr, 10) : 0

  let kind, props
  if (prefix === 'bg') { kind = 'bg'; props = ['background-color'] }
  else if (prefix === 'text') { kind = 'text'; props = ['color'] }
  else if (prefix === 'placeholder') { kind = 'text'; props = ['color'] }
  else if (prefix === 'ring') { kind = 'border'; props = ['--tw-ring-color'] }
  else if (prefix === 'divide') { kind = 'border'; props = ['border-color'] }
  else if (prefix === 'from') { kind = 'gradient'; props = ['--tw-gradient-from'] }
  else if (prefix === 'to') { kind = 'gradient'; props = ['--tw-gradient-to'] }
  else if (prefix === 'via') { kind = 'gradient'; props = ['--tw-gradient-via'] }
  else { // border e direcionais
    kind = 'border'
    const dir = prefix.split('-')[1]
    props = dir === 't' ? ['border-top-color']
      : dir === 'b' ? ['border-bottom-color']
      : dir === 'l' ? ['border-left-color']
      : dir === 'r' ? ['border-right-color']
      : dir === 'x' ? ['border-left-color', 'border-right-color']
      : dir === 'y' ? ['border-top-color', 'border-bottom-color']
      : ['border-color']
  }

  const cssVar = mapVar(kind, palette, step)

  // Seletor: classe escapada + pseudos das variantes
  const escaped = token.replace(/[:/.]/g, ch => '\\' + ch)
  let sel = `.${escaped}`
  let media = null
  let groupHover = false
  for (const v of variants) {
    if (v === 'lg') media = '(min-width:1024px)'
    else if (v === 'group-hover') groupHover = true
    else if (v === 'placeholder') sel += '::placeholder'
    else if (VARIANT_PSEUDO[v]) sel += VARIANT_PSEUDO[v]
    else throw new Error(`Variante não suportada: ${v} em ${token}`)
  }
  if (prefix === 'placeholder') sel += '::placeholder' // sintaxe legada placeholder-gray-500
  if (prefix === 'divide') sel += ' > :not([hidden]) ~ :not([hidden])'
  if (groupHover) sel = `.group:hover ${sel}`

  return { sel, media, props, cssVar }
}

/* ── 4. Agrupar e emitir ─────────────────────────────────────────────── */
const groups = new Map() // chave: media|props|var → [seletores]
const unmapped = []
for (const token of [...tokens].sort()) {
  let parsed
  try { parsed = parseToken(token) } catch (e) { unmapped.push(String(e.message)); continue }
  if (!parsed) { unmapped.push(token); continue }
  const key = `${parsed.media ?? ''}|${parsed.props.join(';')}|${parsed.cssVar}`
  if (!groups.has(key)) groups.set(key, { ...parsed, sels: [] })
  groups.get(key).sels.push(parsed.sel)
}

if (unmapped.length) {
  console.error('Tokens sem mapeamento (estenda o gerador):\n' + unmapped.join('\n'))
  process.exit(1)
}

function rule({ sels, props, cssVar }) {
  const scoped = sels.flatMap(s => [`.theme-v2 ${s}`, `.sheet-v2 ${s}`]).join(',\n')
  const body = props.map(p => `  ${p}: var(${cssVar}) !important;`).join('\n')
  return `${scoped} {\n${body}\n}`
}

const plain = [...groups.values()].filter(g => !g.media)
const lg = [...groups.values()].filter(g => g.media)

/* ── 5. Bespoke: classes do index.css e dos dados 3D ─────────────────── */
const BESPOKE = `
/* ── Bespoke (classes próprias do index.css / dice3d) ─────────────────── */
html.theme-v2, .theme-v2 body, .theme-v2 #root {
  background-color: var(--v2-surface-0) !important;
  color: var(--v2-text-1) !important;
}
.theme-v2 body { background-image: none !important; }
html.theme-v2 { scrollbar-color: var(--v2-border-strong) var(--v2-surface-1); }
.theme-v2 ::-webkit-scrollbar-track { background: var(--v2-surface-1); }
.theme-v2 ::-webkit-scrollbar-thumb { background: var(--v2-border-strong); }
.theme-v2 ::-webkit-scrollbar-thumb:hover { background: var(--v2-text-3); }
.theme-v2 ::selection { background: var(--v2-surface-2); color: var(--v2-text-1); }
.theme-v2 *:focus-visible { outline-color: var(--v2-accent); }
.theme-v2 .ink-italic, .sheet-v2 .ink-italic { color: var(--v2-text-2) !important; }
.theme-v2 .rule-double { border-top-color: var(--v2-border-strong); box-shadow: 0 3px 0 -2px var(--v2-border-strong); }
.theme-v2 .rule-double-b { border-bottom-color: var(--v2-border-strong); box-shadow: 0 -3px 0 -2px var(--v2-border-strong) inset; }
.theme-v2 .setup-modal-bg { background-image: none; }
.theme-v2 .dice3d-toast {
  background: var(--v2-surface-1);
  color: var(--v2-text-1);
  border-color: var(--v2-border-strong);
}
/* Mapa da campanha: arte parchment é CONTEÚDO — map-canvas/token-*/map-frame
   ficam intocados de propósito. */
`

const HEADER = `/* ============================================================================
   Ponte de re-skin parchment/tailwind -> v2  (GERADA por scripts/gen-bridge.mjs
   — NAO editar a mao; rode \`node scripts/gen-bridge.mjs\` para regravar).
   Escopo duplo: .theme-v2 (tema global no <html>) e .sheet-v2 (ficha, cobre o
   escape hatch ?theme=parchment com a ficha v2 ligada).
   Tudo dentro de @media screen: a impressao (#print-character-view) usa as
   classes parchment com cores de papel e NUNCA deve ver a ponte.
   !important porque os utilitarios do Tailwind tem mesma especificidade.
   ============================================================================ */
`

const css = [
  HEADER,
  '@media screen {',
  plain.map(rule).join('\n\n'),
  BESPOKE,
  '}',
  '',
  '@media screen and (min-width:1024px) {',
  lg.map(rule).join('\n\n'),
  '}',
  '',
].join('\n')

writeFileSync(OUT, css)
console.log(`OK: ${tokens.size} tokens -> ${groups.size} grupos -> ${OUT}`)
```

- [ ] **Step 2: Rodar o gerador**

Run: `node scripts/gen-bridge.mjs`
Expected: `OK: N tokens -> M grupos -> src/theme/legacy-bridge.css` (N na casa
das centenas). Se sair `Tokens sem mapeamento`, estenda `hueOf`/`mapVar` pro
caso listado (ex.: paleta nova) e rode de novo — NUNCA ignore um token.

- [ ] **Step 3: Verificações do output**

```bash
# Sem tokens da ficha perdidos: seletores-chave da ponte antiga existem na nova
grep -c "text-white" src/theme/legacy-bridge.css      # >= 1
grep -c "bg-parchment-100" src/theme/legacy-bridge.css # >= 1
grep -c "ink-italic" src/theme/legacy-bridge.css       # >= 1
grep -c "dice3d-toast" src/theme/legacy-bridge.css     # >= 1
# Tudo dentro de @media screen (nenhuma regra fora):
head -20 src/theme/legacy-bridge.css
```

- [ ] **Step 4: Trocar o import e apagar a ponte antiga**

Em `SheetV2.jsx`, trocar `import './legacy-bridge.css'` por
`import '../../../../../theme/legacy-bridge.css'`.
Apagar `src/systems/dnd5e/components/CharacterSheet/v2/legacy-bridge.css`.

- [ ] **Step 5: Build + regressão**

Run: `npm run build`
Expected: PASS (lightningcss aceita o CSS gerado; se der parse error, o erro
aponta a linha do CSS — corrigir o GERADOR, nunca o CSS na mão).

Run: `npx vitest run src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-ActionsTab.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-bridge.mjs src/theme/legacy-bridge.css src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx
git rm src/systems/dnd5e/components/CharacterSheet/v2/legacy-bridge.css
git commit -m "feat(theme): gerador versionado + ponte global (app inteiro, @media screen)"
```

---

### Task 4: Aplicar o tema no `<html>` (sem flash) + meta theme-color + toggle claro/escuro

**Files:**
- Create: `src/theme/applyTheme.js`
- Create: `src/test/theme-apply.test.js`
- Modify: `src/main.jsx` (chamada antes do render)
- Modify: `src/hooks/useTheme.js:19-23` (guarda do meta)
- Modify: `src/components/ui/AppFooter.jsx` (esconde toggle claro/escuro sob o tema v2)

- [ ] **Step 1: Teste que falha**

Criar `src/test/theme-apply.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { applyThemeV2 } from '../theme/applyTheme'

describe('applyThemeV2', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('theme-v2')
    document.head.querySelector('meta[name="theme-color"]')?.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#3b2a1a'
    document.head.appendChild(meta)
  })

  it('liga por padrão: classe no <html> e meta escura', () => {
    expect(applyThemeV2()).toBe(true)
    expect(document.documentElement.classList.contains('theme-v2')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#0f141a')
  })

  it('com opt-out persistido, não aplica a classe nem mexe no meta', () => {
    window.localStorage.setItem('themeParchment', '1')
    expect(applyThemeV2()).toBe(false)
    expect(document.documentElement.classList.contains('theme-v2')).toBe(false)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#3b2a1a')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/theme-apply.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/theme/applyTheme.js`:

```js
import { isThemeV2Enabled } from './flag'

/**
 * Aplica (ou não) o tema global v2 no <html>. Chamado no main.jsx ANTES do
 * primeiro render — evita flash de parchment. A meta theme-color (PWA) vira
 * o surface-0 escuro; sob opt-out, quem cuida dela é o useTheme (parchment).
 */
export function applyThemeV2() {
  const on = isThemeV2Enabled()
  document.documentElement.classList.toggle('theme-v2', on)
  if (on) {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = '#0f141a'
  }
  return on
}
```

Em `src/main.jsx`, adicionar o import e a chamada ANTES do
`createRoot(...).render(...)`:

```jsx
import { applyThemeV2 } from './theme/applyTheme'

applyThemeV2()
```

Em `src/hooks/useTheme.js`, a função `apply` ganha a guarda (o hook roda no
AppFooter e NÃO pode sobrescrever a meta escura do tema v2):

```js
function apply(theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  // Sob o tema global v2, o chrome do browser fica no surface-0 escuro.
  meta.content = document.documentElement.classList.contains('theme-v2')
    ? '#0f141a'
    : (META_COLOR[theme] ?? META_COLOR.light)
}
```

Em `src/components/ui/AppFooter.jsx`: localizar o botão de alternância
claro/escuro (usa `toggle` do `useTheme`) e envolvê-lo em condicional — sob o
tema v2 o claro/escuro parchment é irrelevante e confundiria:

```jsx
import { isThemeV2Enabled } from '../../theme/flag'
// ... no JSX, em volta do botão que chama toggle:
{!isThemeV2Enabled() && (
  <button ...botão claro/escuro existente, sem NENHUMA outra mudança... >
)}
```

- [ ] **Step 4: Rodar e ver passar + regressões**

Run: `npx vitest run src/test/theme-apply.test.js src/test/ui/theme.test.jsx`
Expected: PASS. (Se `theme.test.jsx` quebrar por causa da guarda do meta:
garanta no teste que `document.documentElement` não tem a classe `theme-v2` —
os testes do useTheme testam o modo parchment.)

Run: `npm test`
Expected: PASS (suíte inteira).

- [ ] **Step 5: Commit**

```bash
git add src/theme/applyTheme.js src/test/theme-apply.test.js src/main.jsx src/hooks/useTheme.js src/components/ui/AppFooter.jsx
git commit -m "feat(theme): tema v2 global aplicado no html (sem flash) + meta PWA + toggle oculto"
```

---

### Task 5: Gate de axe nos dois temas

**Files:**
- Modify: `e2e-pw/a11y.spec.js`

- [ ] **Step 1: Adicionar o caso do escape hatch**

Em `e2e-pw/a11y.spec.js`, adicionar ao final do `test.describe` (depois do
loop da ficha):

```js
  test('lista com escape hatch parchment sem violações critical/serious', async ({ page, context }) => {
    await installAuthedApp(context)
    await page.goto('/?theme=parchment')
    await expect(page.getByRole('button', { name: /Recrutar Aventureiro/i })).toBeVisible()
    assertClean(await seriousViolations(page))
  })
```

- [ ] **Step 2: Rodar TODA a suíte de axe (o gate real do flip)**

Run: `npx playwright test a11y.spec.js`
Expected: PASS — os casos existentes (login, privacidade, lista, wizard,
ficha v1+v2) agora rodam NO TEMA ESCURO por default. Se aparecer violação de
contraste, a correção é no MAPEAMENTO do gerador (ex.: um passo de paleta indo
pro var errado) ou num bespoke faltante — corrigir `scripts/gen-bridge.mjs`,
regenerar (`node scripts/gen-bridge.mjs`) e rodar de novo. NÃO editar o CSS
gerado na mão; NÃO usar exceções do axe.

- [ ] **Step 3: Suíte e2e completa**

Run: `npx playwright test`
Expected: PASS (asserts por texto/role são imunes a cor).

- [ ] **Step 4: Commit**

```bash
git add e2e-pw/a11y.spec.js
git commit -m "test(a11y): axe roda no tema v2 por default + caso do escape hatch parchment"
```

---

### Task 6: Passada visual — lista + login

**Files:**
- Modify: `src/components/CharacterList/*.jsx` (só onde a passada apontar)
- Modify: `src/auth/LoginScreen.jsx` (idem)
- Modify: `scripts/gen-bridge.mjs` + regenerar (se a causa for mapeamento)

Task de QA visual guiada — não há código pré-escrito; há procedimento e
critérios. NÃO alterar lógica de nenhum componente; mudanças permitidas:
classes (adotar `v2-panel`/`v2-btn`/`v2-chip`/`v2-title`), espaçamentos,
e correções no gerador/bespoke.

- [ ] **Step 1: Capturar o estado atual**

Subir preview (`npm run dev -- --port 5180`) ou usar o stub do e2e; capturar
screenshots de: `/` (lista com personagens e mapa), `/` vazio (EmptyState),
tela de login (deslogado). Guardar no scratchpad pra comparação.

- [ ] **Step 2: Checklist da lista**

- Cards de personagem: legíveis? Se "chapados" (sem borda/fundo distinto),
  adotar `v2-panel` no container do card.
- Sidebar da companhia, BackupMenu, EmptyState: contraste e hierarquia OK?
- Mapa da campanha: a arte parchment (map-canvas/tokens/moldura) fica COMO
  ESTÁ (é conteúdo); só o entorno (tooltip, painéis) deve estar escuro.
- Header/AccountMenu/AppFooter: fundo surface, texto text-1/text-2.
- Botão primário "Recrutar Aventureiro": destaque adequado (se apagado,
  `v2-btn` + borda accent).

- [ ] **Step 3: Checklist do login**

- Card central legível sobre surface-0; título display (IM Fell) PERMANECE
  serif — só as cores mudam.
- Inputs: fundo surface-2, borda border, placeholder text-3.
- Botão "Entrar": destaque primário.
- Link de privacidade e mensagens de erro: contraste AA.

- [ ] **Step 4: Verificar e commitar**

Run: `npx playwright test a11y.spec.js` → PASS
Run: `npm test` → PASS
Screenshots "depois" das mesmas telas.

```bash
git add -A src/components/CharacterList src/auth src/theme scripts/gen-bridge.mjs
git commit -m "feat(theme): passada visual da lista e do login no tema v2"
```

---

### Task 7: Passada visual — wizard

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/**` (só onde a passada apontar)
- Modify: `scripts/gen-bridge.mjs` + regenerar (se a causa for mapeamento)

Mesmas regras da Task 6 (sem lógica; classes/espaçamento/gerador).

- [ ] **Step 1: Capturar o estado atual**

Screenshots de: grid do wizard (`/new` → Começar), modal de um bloco aberto
(ex.: Classe), picker com seleção (ex.: RacePicker), bloco de atributos
(PointBuy), ReviewBlock.

- [ ] **Step 2: Checklist do wizard**

- Grid de BlockCards: cards com `v2-panel`-look (fundo surface-1, borda),
  estado completo/incompleto distinguível (borda success vs border).
- Modais de bloco (BlockEditorModal): fundo surface-1, cabeçalho legível,
  overlay escurecido OK.
- Pickers (raça/classe/antecedente): seleção ativa com borda accent visível;
  hover perceptível.
- Barra de progresso e botão "✦ Inscrever Herói ✦": destaque primário.
- Textos de ajuda/legendas (ink-italic etc.): text-2, nunca text-3 em texto
  informativo longo.

- [ ] **Step 3: Verificar e commitar**

Run: `npx playwright test a11y.spec.js wizard.spec.js` → PASS
Run: `npm test` → PASS
Screenshots "depois".

```bash
git add -A src/systems/dnd5e/components/CharacterWizardV2 src/theme scripts/gen-bridge.mjs
git commit -m "feat(theme): passada visual do wizard no tema v2"
```

---

### Task 8: Gates finais + prova visual nos dois temas (controller)

- [ ] **Step 1: Gates**

Run: `npm test` → PASS (~1600+)
Run: `npx playwright test` → PASS (23 specs: 22 + axe parchment)
Run: `npm run build` → PASS

- [ ] **Step 2: Prova visual (controller, via stub do e2e)**

Screenshots lado a lado: lista, wizard e login no tema v2 (default) e com
`?theme=parchment` (escape hatch íntegro). Conferir: impressão — abrir o
PrintPreviewModal na ficha e confirmar preview em papel claro (a ponte é
@media screen); painel de rolagens e balão 3D escuros no tema v2.

- [ ] **Step 3: Merge + deploy (preferência registrada do dono)**

Merge na master + push. Atualizar memória do projeto.
