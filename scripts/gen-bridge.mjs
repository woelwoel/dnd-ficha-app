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
const PALETTES = 'parchment|ink|gilt|gold|shell|blood|accent|amber|blue|emerald|gray|green|orange|purple|indigo|violet|red|rose|sky|yellow|white|black'

/* Utilitários SEMÂNTICOS (nome, não passo numérico — aliases do @theme do
   index.css). Não casam o TOKEN_RE (que exige palette-passo), então entram
   como regras extras explícitas. text-ink-on-map fica FORA de propósito: é
   tinta escura sobre os tokens/labels parchment do mapa (conteúdo). */
const SEMANTIC = {
  'bg-bg-elevated':      { props: ['background-color'], cssVar: '--v2-surface-1' },
  'text-ink-primary':    { props: ['color'], cssVar: '--v2-text-1' },
  'border-shell-border': { props: ['border-color'], cssVar: '--v2-border-strong' },
}
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
  if (['blue', 'sky', 'purple', 'indigo', 'violet'].includes(palette)) return 'cool'
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
  active: ':active', disabled: ':disabled', 'focus-within': ':focus-within',
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

// Regras dos utilitários semânticos (nome literal, sem escape especial).
const semanticCss = Object.entries(SEMANTIC)
  .map(([cls, { props, cssVar }]) => rule({ sels: [`.${cls}`], props, cssVar }))
  .join('\n\n')

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
/* Mapa da campanha: arte parchment é CONTEÚDO — map-canvas, token-* e
   map-frame ficam intocados de propósito. */
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
  '',
  semanticCss,
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
