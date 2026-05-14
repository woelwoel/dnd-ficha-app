# CharacterList "Mapa da Campanha" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `CharacterList.jsx` por um diretório `CharacterList/` que renderiza um mapa fantasy com tokens posicionáveis por personagem, sidebar de companhia com filtros, e toggle Mapa↔Lista, estabelecendo os design tokens compartilhados do redesign.

**Architecture:** Pure-engine modules (`class-icons.js`, `token-position.js`, `config.js`) sem React, testáveis isoladamente. Componentes React em `src/components/CharacterList/` cada um com uma responsabilidade (map, token, sidebar, list-view, empty-state). Storage estende com `updateCharacterPosition` e `touchCharacterLastOpened`. Schema do personagem usa o `passthrough()` existente — `position` e `lastOpenedAt` passam sem migração.

**Tech Stack:** React 19, Vite, Tailwind v4 (com `@theme` em `index.css`), Vitest + @testing-library/react + jsdom, Playwright para E2E, Zod para schema.

---

## Pré-requisitos para o engenheiro

Antes de começar, leia:
- `docs/superpowers/specs/2026-05-14-redesign-character-list-mapa-design.md` — spec completa.
- `src/index.css` — entenda como o `@theme` do Tailwind v4 declara design tokens.
- `src/components/CharacterList.jsx` — a tela atual que será substituída.
- `src/utils/storage.js` — entenda `upsertCharacter` e `loadCharacters`.
- `src/domain/characterSchema.js` — schema Zod com `passthrough()` (não precisamos bumpar `SCHEMA_VERSION`).

Padrões do projeto:
- Componentes em **arquivos `.jsx` separados**; testes em `src/test/<nome>.test.js[x]`.
- E2E em `src/test/e2e/<nome>.test.jsx` usa RTL + jsdom (NÃO Playwright — apesar do `test:e2e`, o padrão dos arquivos `*.test.jsx` em `src/test/e2e/` é Vitest+RTL).
- Comentários e mensagens em **português**.
- Não criar arquivos `.md` extras a menos que necessários.

Comandos:
- Rodar testes (Vitest): `npm test -- <padrão>` ou `npm test` (tudo).
- Lint: `npm run lint`.
- Build: `npm run build`.
- Dev: `npm run dev`.

---

## Estrutura de arquivos final

```
src/
├─ components/
│  ├─ CharacterList/                            ← novo diretório
│  │  ├─ CharacterList.jsx                      ← orquestrador (toolbar, modo, drawer)
│  │  ├─ CharacterMap.jsx                       ← mapa + banner + compass + render tokens
│  │  ├─ CharacterToken.jsx                     ← disco + silhueta + level + label + drag/click
│  │  ├─ CharacterSidebar.jsx                   ← lista compacta + filtros + cluster
│  │  ├─ CharacterListView.jsx                  ← modo lista (cards horizontais)
│  │  ├─ EmptyState.jsx                         ← zero personagens
│  │  ├─ MapTooltip.jsx                         ← tooltip rico do token
│  │  └─ index.js                               ← export { CharacterList }
│  └─ ui/
│     ├─ Banner.jsx                             ← SVG pergaminho + fitas
│     ├─ Button.jsx                             ← variants primary/ghost/gold
│     └─ Chip.jsx                               ← filtros, badges
├─ utils/
│  ├─ class-icons.js                            ← SVG paths por classe + componente ClassIcon
│  ├─ config.js                                 ← MAP_BACKGROUND_URL, CAMPAIGN_NAME_DEFAULT, MAX_VISIBLE_TOKENS
│  └─ token-position.js                         ← regions + classToRegion + getDefaultPosition
├─ test/
│  ├─ class-icons.test.js                       ← novo
│  ├─ config.test.js                            ← novo
│  ├─ token-position.test.js                    ← novo
│  ├─ storage.test.js                           ← estende existente
│  ├─ ui/                                       ← novo subdir (opcional, mas separa primitivos)
│  │  ├─ Banner.test.jsx
│  │  ├─ Button.test.jsx
│  │  └─ Chip.test.jsx
│  ├─ CharacterToken.test.jsx                   ← novo
│  ├─ CharacterMap.test.jsx                     ← novo
│  ├─ CharacterSidebar.test.jsx                 ← novo
│  ├─ CharacterListView.test.jsx                ← novo
│  ├─ EmptyState.test.jsx                       ← novo
│  ├─ CharacterList.test.jsx                    ← novo (substitui o atual em components.test.jsx)
│  └─ e2e/
│     └─ character-list-mapa.test.jsx           ← novo (fluxo completo)
public/
└─ maps/
   ├─ default.webp                              ← asset CC0 bundlado
   └─ CREDITS.md                                ← atribuição
```

`src/components/CharacterList.jsx` (arquivo único) é **deletado** depois que o novo diretório está completo (última task).

---

## Convenções importantes

- **TDD estrito**: a cada tarefa, escreva o teste falhando primeiro, rode pra ver falhar, implemente o mínimo, rode pra passar, commit.
- **Não tocar em arquivos fora do escopo da tarefa atual**.
- **Commits frequentes** com prefixos: `feat(redesign):`, `test(redesign):`, `style(redesign):`, `chore(redesign):`. Sempre `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- **Não usar `npm test --no-coverage`** — basta `npm test -- <padrão>`.
- **Não commitar `node_modules/`, `dist/`, `playwright-report/`**.

---

## Task 1: Estender design tokens em `index.css`

**Files:**
- Modify: `src/index.css` (adicionar bloco novo no `@theme` existente)

- [ ] **Step 1: Ler o `@theme` atual**

Run: `head -170 src/index.css`
Confirme que `@theme { ... }` existe e termina por volta da linha 169.

- [ ] **Step 2: Adicionar tokens novos no fim do bloco `@theme`**

Edite `src/index.css`. Localize o fechamento `}` do `@theme` (linha ~169) e ANTES dele insira:

```css
  /* ─────────────────────────────────────────────────────────────
     Redesign tokens — paleta clara híbrida (B), introduzida com
     CharacterList "Mapa da Campanha". Convive com paleta sépia
     legada acima durante a transição tela-por-tela.
     ───────────────────────────────────────────────────────────── */

  /* Base clara */
  --color-bg-canvas:    #faf7f1;
  --color-bg-surface:   #ffffff;
  --color-bg-elevated:  #f4ead3;
  --color-bg-overlay:   rgba(15, 10, 5, 0.55);

  /* Tinta */
  --color-ink-primary:   #1f1a14;
  --color-ink-secondary: #6b6356;
  --color-ink-muted:     #8a7456;
  --color-ink-inverse:   #faf7f1;

  /* Acentos sépia (novos aliases — não conflita com gilt-* legado) */
  --color-accent-50:  #fcf3da;
  --color-accent-100: #f4ead3;
  --color-accent-300: #d6c39f;
  --color-accent-500: #8b6f3a;
  --color-accent-700: #5a4530;
  --color-accent-900: #2a1f14;

  /* Dourado (heróico) */
  --color-gold-400: #d4ad6a;
  --color-gold-500: #b89855;
  --color-gold-700: #6e572b;

  /* Semânticas */
  --color-blood:      #8b0000;
  --color-ink-on-map: #2a1f14;

  /* Superfície escura (banner, sidebar do mapa) */
  --color-shell-900:    #1a1108;
  --color-shell-800:    #2a1f14;
  --color-shell-700:    #3a2b1c;
  --color-shell-border: #6e572b;

  /* Tipografia adicional (Inter para UI moderna) */
  --font-redesign-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* Sombras */
  --shadow-card:     0 2px 4px rgba(31, 26, 20, 0.06), 0 1px 2px rgba(31, 26, 20, 0.04);
  --shadow-elevated: 0 4px 12px rgba(31, 26, 20, 0.10), 0 2px 4px rgba(31, 26, 20, 0.06);
  --shadow-token:    0 4px 8px rgba(0, 0, 0, 0.5), 0 0 0 2px var(--color-gold-400);
  --shadow-banner:   0 3px 10px rgba(0, 0, 0, 0.4);
```

- [ ] **Step 3: Adicionar fonte Inter ao `@import url(...)` do Google Fonts (linha 3)**

Localize linha 3:
```css
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IM+Fell+English+SC&display=swap');
```

Substitua por:
```css
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IM+Fell+English+SC&family=Inter:wght@400;500;600;700&display=swap');
```

- [ ] **Step 4: Rodar build para validar CSS**

Run: `npm run build`
Expected: Build conclui sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
style(redesign): tokens da paleta híbrida + fonte Inter

Adiciona tokens de cor/tipografia/sombra para a paleta B do redesign
(off-white + sépia + ouro + sangue), convivendo com a paleta sépia
legada. Importa Inter pra UI/dados.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 2: Módulo `config.js`

**Files:**
- Create: `src/utils/config.js`
- Test: `src/test/config.test.js`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/config.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  MAP_BACKGROUND_URL,
  CAMPAIGN_NAME_DEFAULT,
  MAX_VISIBLE_TOKENS,
  CAMPAIGN_NAME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from '../utils/config'

describe('config', () => {
  it('expõe URL do mapa padrão apontando para /maps/default.webp', () => {
    expect(MAP_BACKGROUND_URL).toBe('/maps/default.webp')
  })

  it('expõe nome de campanha padrão com ornamentos', () => {
    expect(CAMPAIGN_NAME_DEFAULT).toMatch(/Companhia do Vale/)
    expect(CAMPAIGN_NAME_DEFAULT).toMatch(/⚜/)
  })

  it('define limite de tokens visíveis no sidebar antes de cluster', () => {
    expect(MAX_VISIBLE_TOKENS).toBe(10)
  })

  it('expõe chaves de localStorage com namespace do app', () => {
    expect(CAMPAIGN_NAME_STORAGE_KEY).toBe('dnd-ficha:campaign-name')
    expect(VIEW_MODE_STORAGE_KEY).toBe('dnd-ficha:char-list-view')
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- config`
Expected: FAIL — `Cannot find module '../utils/config'`.

- [ ] **Step 3: Implementar `src/utils/config.js`**

```js
/**
 * Configuração estática do app — caminhos de assets, nomes default,
 * chaves de localStorage. Sem dependências de runtime.
 *
 * Pra trocar o mapa de fundo, substitua o arquivo em /public/maps/default.webp
 * (ou aponte MAP_BACKGROUND_URL para outro caminho).
 */

export const MAP_BACKGROUND_URL = '/maps/default.webp'

export const CAMPAIGN_NAME_DEFAULT = '⚜ Companhia do Vale ⚜'

/** Limite de tokens listados no sidebar antes de virarem cluster "+ N outros". */
export const MAX_VISIBLE_TOKENS = 10

/** Chaves do localStorage (mantém namespace `dnd-ficha:`). */
export const CAMPAIGN_NAME_STORAGE_KEY = 'dnd-ficha:campaign-name'
export const VIEW_MODE_STORAGE_KEY = 'dnd-ficha:char-list-view'
```

- [ ] **Step 4: Rodar teste pra ver passar**

Run: `npm test -- config`
Expected: PASS, 4 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/config.js src/test/config.test.js
git commit -m "$(cat <<'EOF'
feat(redesign): módulo config com paths e chaves de storage

MAP_BACKGROUND_URL, CAMPAIGN_NAME_DEFAULT, MAX_VISIBLE_TOKENS e
chaves de localStorage centralizadas. Permite trocar o mapa default
substituindo só o asset em /public/maps/default.webp.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 3: Módulo `class-icons.js`

**Files:**
- Create: `src/utils/class-icons.js`
- Test: `src/test/class-icons.test.js`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/class-icons.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { getClassIconKey, ClassIcon, CLASS_KEYS } from '../utils/class-icons'

describe('getClassIconKey', () => {
  it('mapeia nomes em PT (case-insensitive) para chaves canônicas', () => {
    expect(getClassIconKey('Guerreiro')).toBe('guerreiro')
    expect(getClassIconKey('mago')).toBe('mago')
    expect(getClassIconKey('CLÉRIGO')).toBe('clerigo')
    expect(getClassIconKey('Patrulheiro')).toBe('patrulheiro')
  })

  it('mapeia substrings (multiclass strings tipo "Guerreiro 3 / Mago 2")', () => {
    expect(getClassIconKey('Guerreiro 3 / Mago 2')).toBe('guerreiro')
    expect(getClassIconKey('Mago 5 / Clérigo 1')).toBe('mago')
  })

  it('volta fallback para classes desconhecidas ou vazias', () => {
    expect(getClassIconKey('')).toBe('fallback')
    expect(getClassIconKey(null)).toBe('fallback')
    expect(getClassIconKey('Necromante')).toBe('fallback')
  })

  it('exporta lista CLASS_KEYS com 12 classes + fallback', () => {
    expect(CLASS_KEYS).toHaveLength(13)
    expect(CLASS_KEYS).toContain('guerreiro')
    expect(CLASS_KEYS).toContain('fallback')
  })
})

describe('<ClassIcon>', () => {
  it('renderiza um SVG com viewBox 0 0 32 32', () => {
    const { container } = render(<ClassIcon classKey="guerreiro" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('viewBox')).toBe('0 0 32 32')
  })

  it('aceita size e color via props', () => {
    const { container } = render(<ClassIcon classKey="mago" size={48} color="#ff0000" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
    expect(svg.getAttribute('color')).toBe('#ff0000')
  })

  it('renderiza um fallback quando classKey é desconhecido', () => {
    const { container } = render(<ClassIcon classKey="aaaa-inexistente" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('aceita o nome cru de classe e converte internamente', () => {
    const { container } = render(<ClassIcon classKey="Guerreiro" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- class-icons`
Expected: FAIL — `Cannot find module '../utils/class-icons'`.

- [ ] **Step 3: Implementar `src/utils/class-icons.js`**

```jsx
/**
 * Silhuetas SVG por classe de personagem para uso em tokens, chips e
 * avatares. Cada path foi desenhado em um viewBox 32x32 e usa
 * `currentColor` pra herdar cor do contexto.
 *
 * Para adicionar uma classe nova: incluir no PATHS e em CLASS_TO_KEY
 * uma ou mais substrings (lowercase, sem acento) que devem mapear pra ela.
 */

const PATHS = {
  guerreiro: (
    <>
      <path d="M16 3 L16 28 M11 8 L21 8 M8 13 L24 13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <circle cx="16" cy="4" r="2" fill="currentColor"/>
    </>
  ),
  mago: (
    <>
      <path d="M16 4 L9 22 L23 22 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
      <path d="M16 22 L16 28 M11 28 L21 28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M16 11 L17 14 L20 14 L17.5 16 L18.5 19 L16 17 L13.5 19 L14.5 16 L12 14 L15 14 Z" fill="#fcf3da"/>
    </>
  ),
  clerigo: (
    <>
      <path d="M16 4 L16 28 M8 12 L24 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="16" cy="12" r="3" fill="currentColor"/>
    </>
  ),
  ladino: (
    <>
      <path d="M8 6 L24 26 M24 6 L8 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="2" fill="currentColor"/>
      <circle cx="24" cy="6" r="2" fill="currentColor"/>
    </>
  ),
  barbaro: (
    <>
      <path d="M16 4 L16 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 12 Q12 8 16 12 Q20 8 24 12 L24 18 Q20 14 16 18 Q12 14 8 18 Z" fill="currentColor"/>
    </>
  ),
  bardo: (
    <>
      <path d="M10 6 L22 6 L20 26 L12 26 Z M14 8 L14 24 M18 8 L18 24" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <circle cx="16" cy="6" r="2" fill="currentColor"/>
    </>
  ),
  druida: (
    <>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 9 Q12 13 13 18 Q14 22 16 23 Q18 22 19 18 Q20 13 16 9 Z M16 13 L16 23" fill="currentColor"/>
    </>
  ),
  patrulheiro: (
    <>
      <path d="M8 8 Q16 4 24 8 Q24 16 24 24" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 24 L24 10 M19 10 L24 10 L24 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </>
  ),
  paladino: (
    <>
      <path d="M16 3 L16 28 M11 8 L21 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M11 6 Q6 9 8 14 L11 12 Z M21 6 Q26 9 24 14 L21 12 Z" fill="currentColor"/>
    </>
  ),
  feiticeiro: (
    <>
      <ellipse cx="16" cy="16" rx="11" ry="7" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="16" cy="16" r="3.5" fill="currentColor"/>
      <path d="M16 5 Q14 8 16 11 Q18 8 16 5 M16 27 Q14 24 16 21 Q18 24 16 27" fill="currentColor"/>
    </>
  ),
  bruxo: (
    <>
      <circle cx="16" cy="14" r="9" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
      <circle cx="12.5" cy="13" r="1.8" fill="#fcf3da"/>
      <circle cx="19.5" cy="13" r="1.8" fill="#fcf3da"/>
      <path d="M12 20 L20 20 M13 22 L19 22" stroke="#fcf3da" strokeWidth="1" fill="none"/>
    </>
  ),
  monge: (
    <>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 8 Q12 12 12 16 Q12 20 16 24 Q20 20 20 16 Q20 12 16 8 Z" fill="currentColor"/>
      <circle cx="13" cy="14" r="1.2" fill="#fcf3da"/>
      <circle cx="19" cy="18" r="1.2" fill="#fcf3da"/>
    </>
  ),
  fallback: (
    <>
      <path d="M16 4 L18 13 L27 13 L20 18 L23 27 L16 22 L9 27 L12 18 L5 13 L14 13 Z" fill="currentColor"/>
    </>
  ),
}

export const CLASS_KEYS = Object.keys(PATHS)

/**
 * Mapeia substrings (já normalizadas em lowercase, sem acento) para o key
 * canônico do PATHS. Pode ter múltiplas substrings por classe (sinônimos).
 */
const CLASS_TO_KEY = [
  ['guerreir', 'guerreiro'],
  ['mago', 'mago'],
  ['clerig', 'clerigo'],
  ['ladin', 'ladino'],
  ['barbar', 'barbaro'],
  ['bardo', 'bardo'],
  ['druid', 'druida'],
  ['patrulheir', 'patrulheiro'],
  ['ranger', 'patrulheiro'],
  ['paladin', 'paladino'],
  ['feiticeir', 'feiticeiro'],
  ['sorcerer', 'feiticeiro'],
  ['bruxo', 'bruxo'],
  ['warlock', 'bruxo'],
  ['monge', 'monge'],
  ['monk', 'monge'],
]

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function getClassIconKey(classNameRaw) {
  if (classNameRaw == null) return 'fallback'
  const lower = normalize(classNameRaw)
  if (!lower.trim()) return 'fallback'
  for (const [needle, key] of CLASS_TO_KEY) {
    if (lower.includes(needle)) return key
  }
  return 'fallback'
}

/**
 * Renderiza a silhueta SVG da classe. Aceita o nome cru
 * (`"Guerreiro 3 / Mago 2"`) ou o key canônico (`"guerreiro"`).
 */
export function ClassIcon({ classKey, size = 32, color, ...rest }) {
  const key = PATHS[classKey] ? classKey : getClassIconKey(classKey)
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      color={color}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[key]}
    </svg>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- class-icons`
Expected: PASS, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/class-icons.js src/test/class-icons.test.js
git commit -m "$(cat <<'EOF'
feat(redesign): silhuetas SVG por classe + helper de classificação

12 classes do PHB + fallback, cada uma com viewBox 32x32 usando
currentColor. getClassIconKey normaliza acento/case e aceita strings
multiclasse ("Guerreiro 3 / Mago 2").

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 4: Módulo `token-position.js`

**Files:**
- Create: `src/utils/token-position.js`
- Test: `src/test/token-position.test.js`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/token-position.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  REGIONS_DEFAULT,
  CLASS_TO_REGION,
  getDefaultPosition,
  clampPosition,
} from '../utils/token-position'

describe('REGIONS_DEFAULT', () => {
  it('expõe 6 regiões esperadas com coordenadas 0–1', () => {
    expect(Object.keys(REGIONS_DEFAULT).sort()).toEqual(
      ['castle', 'forest', 'port', 'ruins', 'tower', 'village']
    )
    for (const r of Object.values(REGIONS_DEFAULT)) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x).toBeLessThanOrEqual(1)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeLessThanOrEqual(1)
      expect(r.r).toBeGreaterThan(0)
    }
  })
})

describe('CLASS_TO_REGION', () => {
  it('mapeia classes mágicas para tower e castelo para tank/divinos', () => {
    expect(CLASS_TO_REGION.mago).toBe('tower')
    expect(CLASS_TO_REGION.clerigo).toBe('castle')
    expect(CLASS_TO_REGION.ladino).toBe('ruins')
    expect(CLASS_TO_REGION.druida).toBe('forest')
  })
})

describe('clampPosition', () => {
  it('clampa coordenadas para [0, 1]', () => {
    expect(clampPosition({ x: -0.5, y: 0.3 })).toEqual({ x: 0, y: 0.3 })
    expect(clampPosition({ x: 0.5, y: 1.5 })).toEqual({ x: 0.5, y: 1 })
    expect(clampPosition({ x: 2, y: -1 })).toEqual({ x: 1, y: 0 })
  })

  it('arredonda para granularidade de 0.005', () => {
    expect(clampPosition({ x: 0.1234, y: 0.6789 })).toEqual({ x: 0.125, y: 0.68 })
  })
})

describe('getDefaultPosition', () => {
  it('é determinístico pelo character.id (mesma entrada → mesma saída)', () => {
    const c = { id: 'abc-123', info: { class: 'Mago' } }
    const p1 = getDefaultPosition(c, 'default')
    const p2 = getDefaultPosition(c, 'default')
    expect(p1).toEqual(p2)
  })

  it('coloca mago perto da região da torre', () => {
    const c = { id: 'mago-x', info: { class: 'Mago' } }
    const pos = getDefaultPosition(c, 'default')
    const tower = REGIONS_DEFAULT.tower
    const d = Math.hypot(pos.x - tower.x, pos.y - tower.y)
    expect(d).toBeLessThanOrEqual(tower.r + 0.001)
  })

  it('coloca classe desconhecida em região fallback (castle) ainda no mapa', () => {
    const c = { id: 'mistery', info: { class: 'Necromante' } }
    const pos = getDefaultPosition(c, 'default')
    expect(pos.x).toBeGreaterThan(0)
    expect(pos.x).toBeLessThan(1)
    expect(pos.y).toBeGreaterThan(0)
    expect(pos.y).toBeLessThan(1)
  })

  it('IDs diferentes geram posições distintas dentro da mesma região', () => {
    const a = getDefaultPosition({ id: 'aaa', info: { class: 'Mago' } }, 'default')
    const b = getDefaultPosition({ id: 'bbb', info: { class: 'Mago' } }, 'default')
    expect(a).not.toEqual(b)
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- token-position`
Expected: FAIL — `Cannot find module '../utils/token-position'`.

- [ ] **Step 3: Implementar `src/utils/token-position.js`**

```js
/**
 * Posicionamento de tokens no mapa.
 *
 * Coordenadas são normalizadas (0..1) relativas ao bounding rect do
 * elemento `<map>` — assim funcionam em qualquer resolução.
 *
 * Regiões são pontos de interesse marcados no mapa default. Cada classe
 * tem uma região "natural" (mago → torre, druida → floresta, etc.); novos
 * personagens caem numa posição determinística dentro do raio da região.
 */

import { getClassIconKey } from './class-icons'

export const REGIONS_DEFAULT = {
  forest:  { x: 0.18, y: 0.55, r: 0.08 },
  castle:  { x: 0.50, y: 0.45, r: 0.10 },
  tower:   { x: 0.22, y: 0.40, r: 0.06 },
  ruins:   { x: 0.82, y: 0.65, r: 0.08 },
  village: { x: 0.42, y: 0.80, r: 0.06 },
  port:    { x: 0.80, y: 0.78, r: 0.06 },
}

export const CLASS_TO_REGION = {
  guerreiro:   'castle',
  paladino:    'castle',
  barbaro:     'castle',
  clerigo:     'castle',
  mago:        'tower',
  feiticeiro:  'tower',
  bruxo:       'tower',
  druida:      'forest',
  patrulheiro: 'forest',
  ladino:      'ruins',
  bardo:       'village',
  monge:       'village',
  fallback:    'castle',
}

const REGIONS_BY_MAP = { default: REGIONS_DEFAULT }

/** Hash determinístico simples (DJB2) → float em [0, 1). */
function hashFloat(str, salt = 0) {
  let h = 5381 + salt
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  return (Math.abs(h) % 100000) / 100000
}

export function clampPosition({ x, y }) {
  const cx = Math.min(1, Math.max(0, Number(x) || 0))
  const cy = Math.min(1, Math.max(0, Number(y) || 0))
  const snap = (v) => Math.round(v * 200) / 200 // grid 0.005
  return { x: snap(cx), y: snap(cy) }
}

/**
 * Calcula posição default determinística para o personagem dentro do
 * raio da região associada à sua classe. Mesmo ID → mesma posição.
 */
export function getDefaultPosition(character, mapKey = 'default') {
  const regions = REGIONS_BY_MAP[mapKey] || REGIONS_DEFAULT
  const classKey = getClassIconKey(character?.info?.class)
  const regionKey = CLASS_TO_REGION[classKey] || CLASS_TO_REGION.fallback
  const region = regions[regionKey] || regions.castle

  const id = String(character?.id || 'unknown')
  // Distribui em ângulo + raio determinístico (espiral leve)
  const theta = hashFloat(id, 0) * Math.PI * 2
  const rho = Math.sqrt(hashFloat(id, 1)) * region.r // sqrt distribui uniforme em disco

  return clampPosition({
    x: region.x + Math.cos(theta) * rho,
    y: region.y + Math.sin(theta) * rho,
  })
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- token-position`
Expected: PASS, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/token-position.js src/test/token-position.test.js
git commit -m "$(cat <<'EOF'
feat(redesign): auto-placement de tokens por classe/região

6 regiões marcadas no mapa default (castelo, torre, floresta, ruínas,
aldeia, porto). Cada classe tem região natural; getDefaultPosition é
determinístico via hash do character.id (mesma ficha → mesmo pino até
o usuário arrastar).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 5: Estender storage com `updateCharacterPosition` e `touchCharacterLastOpened`

**Files:**
- Modify: `src/utils/storage.js`
- Modify: `src/test/storage.test.js`

- [ ] **Step 1: Adicionar testes novos em `src/test/storage.test.js`**

Append no fim do arquivo (antes do último `})` da última suite ou como nova suite no fim):

```js
import {
  updateCharacterPosition,
  touchCharacterLastOpened,
} from '../utils/storage'

describe('updateCharacterPosition', () => {
  beforeEach(() => localStorage.clear())

  function seed(c) {
    const minimal = {
      id: c.id,
      meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      info: { name: c.name || 'X', class: c.class || '', level: 1, multiclasses: [] },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      appliedRacialBonuses: {},
      combat: { maxHp: 10, currentHp: 10, tempHp: 0, attacks: [] },
      proficiencies: {},
      spellcasting: {},
      inventory: { items: [] },
      traits: {},
    }
    upsertCharacter(minimal)
    return minimal
  }

  it('persiste position no character', () => {
    seed({ id: 'p1' })
    const res = updateCharacterPosition('p1', { x: 0.3, y: 0.7 })
    expect(res.ok).toBe(true)
    const reloaded = loadCharacterById('p1')
    expect(reloaded.position).toEqual({ x: 0.3, y: 0.7 })
  })

  it('clampa posições inválidas para [0, 1]', () => {
    seed({ id: 'p2' })
    updateCharacterPosition('p2', { x: 1.5, y: -0.2 })
    const reloaded = loadCharacterById('p2')
    expect(reloaded.position.x).toBe(1)
    expect(reloaded.position.y).toBe(0)
  })

  it('é no-op para ID inexistente', () => {
    const res = updateCharacterPosition('nao-existe', { x: 0.5, y: 0.5 })
    expect(res.ok).toBe(false)
  })
})

describe('touchCharacterLastOpened', () => {
  beforeEach(() => localStorage.clear())

  it('grava timestamp lastOpenedAt em ms', () => {
    const ch = {
      id: 't1',
      meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      info: { name: 'T', class: '', level: 1, multiclasses: [] },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      appliedRacialBonuses: {},
      combat: { maxHp: 10, currentHp: 10, tempHp: 0, attacks: [] },
      proficiencies: {},
      spellcasting: {},
      inventory: { items: [] },
      traits: {},
    }
    upsertCharacter(ch)
    const before = Date.now()
    touchCharacterLastOpened('t1')
    const reloaded = loadCharacterById('t1')
    expect(reloaded.lastOpenedAt).toBeGreaterThanOrEqual(before)
    expect(reloaded.lastOpenedAt).toBeLessThanOrEqual(Date.now())
  })
})
```

Se o arquivo já importa `upsertCharacter` e `loadCharacterById`, reaproveite os imports. Caso não, adicione no topo:

```js
import { upsertCharacter, loadCharacterById } from '../utils/storage'
```

- [ ] **Step 2: Rodar testes pra ver falhar**

Run: `npm test -- storage`
Expected: FAIL nas novas suites — `updateCharacterPosition is not a function`.

- [ ] **Step 3: Implementar em `src/utils/storage.js`**

Adicione no fim do arquivo:

```js
import { clampPosition } from './token-position'

/**
 * Atualiza somente `character.position` (sem revalidar todo o documento).
 * Posição passa por clampPosition (faixa [0,1] + grid).
 *
 * Retorna { ok: boolean, reason?: string }.
 */
export function updateCharacterPosition(id, position) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return { ok: false, reason: 'not-found' }
  const next = {
    ...all[idx],
    position: clampPosition(position),
  }
  all[idx] = next
  return safeSet(STORAGE_KEY, all)
}

/**
 * Marca o personagem como aberto agora — grava lastOpenedAt em epoch ms.
 * Usado para ordenar a Lista por "última vez jogado".
 */
export function touchCharacterLastOpened(id) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return { ok: false, reason: 'not-found' }
  all[idx] = { ...all[idx], lastOpenedAt: Date.now() }
  return safeSet(STORAGE_KEY, all)
}
```

> Observação: estes helpers contornam `validateForSave` (e portanto Zod) porque `position`/`lastOpenedAt` chegam pelo `passthrough()` no schema. Isso é seguro: clampPosition garante valores válidos para position; lastOpenedAt é apenas um número.

- [ ] **Step 4: Rodar testes**

Run: `npm test -- storage`
Expected: PASS, novos testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.js src/test/storage.test.js
git commit -m "$(cat <<'EOF'
feat(redesign): updateCharacterPosition + touchCharacterLastOpened

Helpers leves no storage pra persistir posição do token no mapa e
timestamp de última vez aberta a ficha. Não revalidam o doc inteiro;
posição passa por clampPosition; lastOpenedAt é só Date.now() bruto.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 6: Bundle do mapa CC0 + CREDITS

**Files:**
- Create: `public/maps/default.webp` (asset binário)
- Create: `public/maps/CREDITS.md`

- [ ] **Step 1: Criar diretório**

Run: `mkdir -p public/maps`

- [ ] **Step 2: Baixar mapa CC0 candidato**

Buscar manualmente uma das três opções abaixo e escolher uma:

1. **OpenGameArt Fantasy World Map** — https://opengameart.org/content/fantasy-world-map-0
   - Licença: CC0
   - Baixar PNG, converter para WebP com `cwebp -q 80 input.png -o public/maps/default.webp`
2. **OpenGameArt Fantasy Parchment Set** — https://opengameart.org/content/fantasy-parchment-set
   - Licença: CC0
   - Procurar arquivo com mapa completo, não apenas ícones.
3. **Outro CC0/CC-BY de OpenGameArt categoria Map** — https://opengameart.org/art-search?keys=map

Critérios:
- Resolução ≥ 1600x1000
- Estilo parchment/aged paper, top-down
- < 500KB depois de comprimir pra WebP
- Sem texto vivo (nomes ok), sem elementos políticos

Se for **CC-BY**, copiar nome do autor e link da fonte para o CREDITS.

- [ ] **Step 3: Validar tamanho do arquivo**

Run: `ls -lh public/maps/default.webp`
Expected: tamanho ≤ 500KB.

Se passar de 500KB, recomprima:
```
cwebp -q 70 original.png -o public/maps/default.webp
```

- [ ] **Step 4: Criar `public/maps/CREDITS.md`**

```markdown
# Atribuição dos mapas

## default.webp

- **Fonte:** <URL da página onde baixou>
- **Autor:** <nome do autor ou "Domínio público">
- **Licença:** <CC0 | CC-BY 3.0 | CC-BY-SA 3.0>
- **Observações:** Convertido para WebP, qualidade 80. Ajustado para a paleta do app.

> Para trocar o mapa: substitua `default.webp` (mesmas dimensões recomendadas).
> Se o novo mapa não combinar com as regiões em `src/utils/token-position.js`,
> ajuste as coordenadas em `REGIONS_DEFAULT` ou adicione uma chave de mapa nova.
```

- [ ] **Step 5: Commit**

```bash
git add public/maps/default.webp public/maps/CREDITS.md
git commit -m "$(cat <<'EOF'
chore(redesign): bundle de mapa CC0 default + atribuição

Asset bundlado em /public/maps/default.webp como background da
CharacterList. Pode ser substituído sem mudar código (path em
src/utils/config.js).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 7: Primitivo `Button.jsx` com variants

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/test/ui/Button.test.jsx`
- Modify: `src/components/ui/index.js` (exportar Button)

- [ ] **Step 1: Criar diretório de testes ui**

Run: `mkdir -p src/test/ui`

- [ ] **Step 2: Escrever teste falhando**

Crie `src/test/ui/Button.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../components/ui/Button'

describe('<Button>', () => {
  it('renderiza children com role=button', () => {
    render(<Button onClick={() => {}}>Salvar</Button>)
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument()
  })

  it('dispara onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('aplica classe distinta para variant="gold"', () => {
    render(<Button variant="gold">G</Button>)
    expect(screen.getByRole('button').className).toMatch(/gold-/)
  })

  it('aplica classe distinta para variant="ghost"', () => {
    render(<Button variant="ghost">H</Button>)
    expect(screen.getByRole('button').className).toMatch(/border/)
  })

  it('renderiza disabled quando disabled=true', () => {
    render(<Button disabled>X</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('passa type="button" por padrão (evita submit acidental)', () => {
    render(<Button>X</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
```

- [ ] **Step 3: Rodar teste pra ver falhar**

Run: `npm test -- ui/Button`
Expected: FAIL — Cannot find module.

- [ ] **Step 4: Implementar `src/components/ui/Button.jsx`**

```jsx
/**
 * Botão primitivo do redesign. Variants:
 *   primary  — fundo escuro, texto claro (padrão)
 *   ghost    — apenas borda (usado em filtros, ações secundárias)
 *   gold     — gradiente dourado, usado em CTAs heróicos
 *
 * Sempre type="button" por padrão.
 */
const VARIANTS = {
  primary: 'bg-[var(--color-shell-800)] text-[var(--color-ink-inverse)] hover:bg-[var(--color-shell-700)] border border-[var(--color-shell-border)]',
  ghost:   'bg-transparent text-[var(--color-ink-primary)] border border-[var(--color-accent-300)] hover:bg-[var(--color-bg-elevated)]',
  gold:    'bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-500)] text-[var(--color-shell-900)] hover:from-[var(--color-gold-500)] hover:to-[var(--color-gold-700)] border border-[var(--color-gold-700)] gold-cta font-semibold shadow-[var(--shadow-card)]',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded font-[var(--font-redesign-sans)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Exportar do barrel**

Modifique `src/components/ui/index.js`. Adicione no fim:

```js
export { Button } from './Button.jsx'
```

- [ ] **Step 6: Rodar testes**

Run: `npm test -- ui/Button`
Expected: PASS, 6 verdes.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Button.jsx src/test/ui/Button.test.jsx src/components/ui/index.js
git commit -m "$(cat <<'EOF'
feat(redesign): primitivo Button com variants primary/ghost/gold

Botão base do redesign. variant=gold usa gradiente dourado pra CTAs
heróicos ("⚔ Recrutar"). variant=ghost pra ações secundárias e
filtros. type="button" por padrão.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 8: Primitivo `Chip.jsx`

**Files:**
- Create: `src/components/ui/Chip.jsx`
- Create: `src/test/ui/Chip.test.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/ui/Chip.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from '../../components/ui/Chip'

describe('<Chip>', () => {
  it('renderiza children como botão com aria-pressed', () => {
    render(<Chip active={false} onClick={() => {}}>Mago</Chip>)
    const btn = screen.getByRole('button', { name: /Mago/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('aria-pressed=true quando active=true', () => {
    render(<Chip active onClick={() => {}}>Mago</Chip>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('dispara onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>X</Chip>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('aplica visual distinto quando ativo', () => {
    const { rerender } = render(<Chip active={false}>X</Chip>)
    const inactive = screen.getByRole('button').className
    rerender(<Chip active>X</Chip>)
    const active = screen.getByRole('button').className
    expect(active).not.toBe(inactive)
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- ui/Chip`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/Chip.jsx`**

```jsx
/**
 * Chip togglable usado em filtros do redesign. Reflete estado via
 * aria-pressed; visual ativo usa gradient dourado.
 */
export function Chip({ active = false, onClick, children, ariaLabel, className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1 text-[11px] uppercase tracking-wider px-2 py-1 rounded border transition-colors font-[var(--font-redesign-sans)] font-semibold'
  const state = active
    ? 'bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-500)] text-[var(--color-shell-900)] border-[var(--color-gold-700)]'
    : 'bg-transparent text-[var(--color-gold-400)] border-[var(--color-shell-border)] hover:bg-[rgba(212,173,106,0.08)]'
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${base} ${state} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Exportar do barrel**

Em `src/components/ui/index.js` adicione:

```js
export { Chip } from './Chip.jsx'
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- ui/Chip`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Chip.jsx src/test/ui/Chip.test.jsx src/components/ui/index.js
git commit -m "$(cat <<'EOF'
feat(redesign): primitivo Chip togglable para filtros

Componente <Chip active onClick>. Reflete estado via aria-pressed,
visual dourado quando ativo. Usado nos filtros de classe da sidebar.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 9: Primitivo `Banner.jsx`

**Files:**
- Create: `src/components/ui/Banner.jsx`
- Create: `src/test/ui/Banner.test.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/ui/Banner.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Banner } from '../../components/ui/Banner'

describe('<Banner>', () => {
  it('renderiza texto do banner', () => {
    render(<Banner>⚜ Companhia do Vale ⚜</Banner>)
    expect(screen.getByText(/Companhia do Vale/i)).toBeInTheDocument()
  })

  it('aplica role="heading" implícito para acessibilidade', () => {
    render(<Banner>X</Banner>)
    // Banner usa <h2> internamente
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
  })

  it('contém SVG decorativo das fitas', () => {
    const { container } = render(<Banner>X</Banner>)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- ui/Banner`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/Banner.jsx`**

```jsx
/**
 * Pergaminho-banner com duas fitas vermelhas laterais. Usado no topo
 * do mapa da CharacterList. SVG inline (sem assets externos).
 *
 * Acessível via role heading (h2).
 */
export function Banner({ children, className = '' }) {
  return (
    <div className={`relative inline-block ${className}`} style={{ filter: 'drop-shadow(var(--shadow-banner))' }}>
      <svg viewBox="0 0 280 50" className="block w-full h-auto" aria-hidden="true">
        <path d="M0,25 L18,12 L18,38 Z M280,25 L262,12 L262,38 Z" fill="#5a0000"/>
        <path d="M0,25 L18,18 L18,32 Z M280,25 L262,18 L262,32 Z" fill="#8b0000"/>
        <defs>
          <linearGradient id="bannerGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fcf3da"/>
            <stop offset="100%" stopColor="#e8dcc0"/>
          </linearGradient>
        </defs>
        <rect x="14" y="6" width="252" height="38" fill="url(#bannerGrad)" stroke="#5a4530" strokeWidth="1.5"/>
        <line x1="20" y1="11" x2="260" y2="11" stroke="#8b6f3a" strokeWidth="0.5"/>
        <line x1="20" y1="39" x2="260" y2="39" stroke="#8b6f3a" strokeWidth="0.5"/>
      </svg>
      <h2
        className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tracking-[0.15em]"
        style={{
          fontFamily: 'IM Fell English SC, serif',
          color: 'var(--color-ink-on-map)',
        }}
      >
        {children}
      </h2>
    </div>
  )
}
```

- [ ] **Step 4: Exportar do barrel**

Em `src/components/ui/index.js` adicione:

```js
export { Banner } from './Banner.jsx'
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- ui/Banner`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Banner.jsx src/test/ui/Banner.test.jsx src/components/ui/index.js
git commit -m "$(cat <<'EOF'
feat(redesign): primitivo Banner (pergaminho com fitas SVG)

Banner ornamental usado no topo do mapa da CharacterList. SVG inline
com fitas vermelhas laterais e pergaminho central; texto sobreposto
em IM Fell English SC.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 10: `MapTooltip.jsx`

**Files:**
- Create: `src/components/CharacterList/MapTooltip.jsx`
- Create: `src/test/CharacterList/MapTooltip.test.jsx`

- [ ] **Step 1: Criar diretórios**

Run: `mkdir -p src/components/CharacterList src/test/CharacterList`

- [ ] **Step 2: Escrever teste falhando**

Crie `src/test/CharacterList/MapTooltip.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'

const baseCharacter = {
  id: 't1',
  info: { name: 'Thoradin', race: 'Anão', class: 'Guerreiro', level: 5 },
  combat: { currentHp: 38, maxHp: 47, armorClass: 18 },
  lastOpenedAt: Date.now() - 3600 * 1000, // 1h atrás
}

describe('<MapTooltip>', () => {
  it('renderiza nome, raça, classe e nível', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/Thoradin/i)).toBeInTheDocument()
    expect(screen.getByText(/Anão/i)).toBeInTheDocument()
    expect(screen.getByText(/Guerreiro/i)).toBeInTheDocument()
    expect(screen.getByText(/Nível 5/i)).toBeInTheDocument()
  })

  it('renderiza HP atual/máx e CA quando combat tem dados', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/HP 38\/47/i)).toBeInTheDocument()
    expect(screen.getByText(/CA 18/i)).toBeInTheDocument()
  })

  it('renderiza "última jogada" relativa quando lastOpenedAt presente', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/h(á| ago)? .*/i)).toBeInTheDocument()
  })

  it('não quebra com personagem mínimo (sem combat ou lastOpenedAt)', () => {
    const min = { id: 'x', info: { name: 'X' } }
    render(<MapTooltip character={min} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('tem role="tooltip"', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar teste pra ver falhar**

Run: `npm test -- MapTooltip`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/components/CharacterList/MapTooltip.jsx`**

```jsx
/**
 * Tooltip rico para tokens do mapa. Mostra:
 *  - nome (display)
 *  - raça · classe · subclasse (serif itálico)
 *  - HP atual/máx + CA (sans)
 *  - "última jogada: X" (sans itálico)
 *
 * Apenas conteúdo — o posicionamento é responsabilidade do CharacterToken
 * (parent controla via inline style top/left).
 */
function relativeTime(epoch) {
  if (!epoch) return null
  const delta = Date.now() - epoch
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `há ${w} sem`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

export function MapTooltip({ character }) {
  const c = character || {}
  const info = c.info || {}
  const combat = c.combat || {}
  const last = relativeTime(c.lastOpenedAt)

  return (
    <div
      role="tooltip"
      className="px-3 py-2 rounded border text-xs"
      style={{
        background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
        borderColor: 'var(--color-gold-400)',
        color: 'var(--color-ink-inverse)',
        fontFamily: 'var(--font-redesign-sans)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        className="font-bold"
        style={{
          fontFamily: 'IM Fell English SC, serif',
          color: 'var(--color-gold-400)',
          letterSpacing: '0.05em',
        }}
      >
        {info.name || '—'}
      </div>
      {(info.race || info.class) && (
        <div className="italic mt-0.5" style={{ color: 'var(--color-gold-500)', fontFamily: 'EB Garamond, serif' }}>
          {[info.race, info.class].filter(Boolean).join(' · ')}
          {info.level != null && <> · Nível {info.level}</>}
        </div>
      )}
      {(combat.maxHp != null || combat.armorClass != null) && (
        <div className="mt-1">
          {combat.maxHp != null && (
            <>HP {combat.currentHp ?? combat.maxHp}/{combat.maxHp}</>
          )}
          {combat.armorClass != null && (
            <> · CA {combat.armorClass}</>
          )}
        </div>
      )}
      {last && (
        <div className="italic mt-1" style={{ color: 'var(--color-gold-500)' }}>
          {last}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- MapTooltip`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CharacterList/MapTooltip.jsx src/test/CharacterList/MapTooltip.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): MapTooltip para tokens do mapa

Tooltip rico com nome (display), raça/classe/nível, HP/CA e tempo
relativo desde última vez aberto ("há 2h", "há 3 sem"). Posicionamento
é controlado pelo parent CharacterToken.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 11: `CharacterToken.jsx` (sem drag por enquanto)

**Files:**
- Create: `src/components/CharacterList/CharacterToken.jsx`
- Create: `src/test/CharacterList/CharacterToken.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/CharacterToken.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterToken } from '../../components/CharacterList/CharacterToken'

const baseCharacter = {
  id: 't1',
  info: { name: 'Thoradin Pedra-Forte', race: 'Anão', class: 'Guerreiro', level: 5 },
  combat: { currentHp: 38, maxHp: 47, armorClass: 18 },
  position: { x: 0.3, y: 0.5 },
}

describe('<CharacterToken>', () => {
  it('renderiza nome do personagem', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(screen.getByText(/Thoradin Pedra-Forte/i)).toBeInTheDocument()
  })

  it('renderiza nível em algarismo romano', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('aria-label do botão inclui nome + classe + nível', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', expect.stringMatching(/Thoradin.*Guerreiro.*nível 5/i))
  })

  it('chama onSelect com o ID ao clicar', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterToken character={baseCharacter} onSelect={onSelect} />)
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('t1')
  })

  it('posicionamento aplica position.x/y como style left/top em %', () => {
    const { container } = render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    const wrapper = container.firstChild
    expect(wrapper.style.left).toBe('30%')
    expect(wrapper.style.top).toBe('50%')
  })

  it('renderiza um SVG (silhueta da classe) dentro do disco', () => {
    const { container } = render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- CharacterToken`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/CharacterToken.jsx`**

```jsx
import { useState, useRef } from 'react'
import { ClassIcon } from '../../utils/class-icons'
import { MapTooltip } from './MapTooltip'

function toRoman(num) {
  if (!Number.isFinite(num) || num <= 0) return '—'
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let r = ''
  let n = num
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v }
  }
  return r
}

/**
 * Token individual no mapa. Posicionado em coordenadas normalizadas
 * (position.x e position.y em 0..1) → traduzidas em % CSS.
 *
 * Click → onSelect(id). Hover/focus mostra MapTooltip.
 *
 * Drag será adicionado em uma task posterior (via onDragStart prop).
 */
export function CharacterToken({ character, onSelect, onDragStart }) {
  const [hovered, setHovered] = useState(false)
  const buttonRef = useRef(null)

  const { id, info = {}, position = { x: 0.5, y: 0.5 } } = character
  const lv = info.level ?? 1
  const romanLv = toRoman(lv)

  const ariaLabel = [
    info.name || 'Personagem',
    info.class,
    `nível ${lv}`,
  ].filter(Boolean).join(', ')

  function handlePointerDown(e) {
    if (onDragStart) onDragStart(e, id)
  }

  function handleClick() {
    if (onSelect) onSelect(id)
  }

  return (
    <div
      className="absolute z-[6] text-center -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${(position.x * 100).toFixed(2)}%`,
        top:  `${(position.y * 100).toFixed(2)}%`,
        width: '76px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="relative block mx-auto rounded-full transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
        style={{
          width: '56px',
          height: '56px',
          background: 'radial-gradient(circle at 30% 25%, #faf2da 0%, #e8dcc0 35%, #b89855 75%, #6e572b 100%)',
          border: '3px solid var(--color-shell-800)',
          boxShadow: 'var(--shadow-token)',
          color: 'var(--color-ink-on-map)',
          cursor: onDragStart ? 'grab' : 'pointer',
        }}
      >
        <span className="absolute inset-0 grid place-items-center">
          <ClassIcon classKey={info.class} size={32} />
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 rounded-full grid place-items-center font-bold"
          style={{
            background: 'linear-gradient(180deg, var(--color-blood), #5a0000)',
            color: 'var(--color-ink-inverse)',
            border: '2px solid var(--color-shell-800)',
            width: '22px',
            height: '22px',
            fontSize: '10px',
            fontFamily: 'IM Fell English SC, serif',
          }}
        >
          {romanLv}
        </span>
      </button>
      <div
        className="mt-1 inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold leading-tight max-w-full truncate"
        style={{
          background: 'rgba(255,251,242,0.95)',
          border: '1px solid var(--color-shell-border)',
          color: 'var(--color-ink-on-map)',
          fontFamily: 'IM Fell English SC, EB Garamond, serif',
          letterSpacing: '0.04em',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {info.name || 'Sem nome'}
      </div>
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-20 pointer-events-none">
          <MapTooltip character={character} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- CharacterToken`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterToken.jsx src/test/CharacterList/CharacterToken.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): CharacterToken — disco + silhueta + nível romano + label

Token individual posicionado em coords normalizadas (0..1) → CSS %.
Disco com gradient sépia + anel ouro + sombra. Silhueta da classe via
ClassIcon. Selo de nível em vermelho-sangue (romano). Label nome
em pergaminho abaixo. Hover/focus mostra MapTooltip.

Drag será adicionado em task posterior.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 12: `CharacterMap.jsx` (estrutura básica, sem drag)

**Files:**
- Create: `src/components/CharacterList/CharacterMap.jsx`
- Create: `src/test/CharacterList/CharacterMap.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/CharacterMap.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharacterMap } from '../../components/CharacterList/CharacterMap'

const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, position: { x: 0.2, y: 0.3 } },
  { id: 'b', info: { name: 'Bob',   class: 'Guerreiro', level: 3 }, position: { x: 0.7, y: 0.6 } },
]

describe('<CharacterMap>', () => {
  it('renderiza o banner com nome de campanha', () => {
    render(<CharacterMap characters={chars} campaignName="⚜ Teste ⚜" onSelect={() => {}} />)
    expect(screen.getByText(/Teste/)).toBeInTheDocument()
  })

  it('renderiza um token para cada personagem', () => {
    render(<CharacterMap characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('aplica background-image do MAP_BACKGROUND_URL', () => {
    const { container } = render(<CharacterMap characters={chars} onSelect={() => {}} />)
    const mapEl = container.querySelector('[data-testid="character-map-canvas"]')
    expect(mapEl.style.backgroundImage).toContain('/maps/default.webp')
  })

  it('tem region landmark com aria-label', () => {
    render(<CharacterMap characters={chars} onSelect={() => {}} />)
    expect(screen.getByRole('region', { name: /Mapa da campanha/i })).toBeInTheDocument()
  })

  it('chama onSelect ao clicar num token', async () => {
    const onSelect = vi.fn()
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CharacterMap characters={chars} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Alice/i }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('auto-posiciona quando position é null/undefined', () => {
    const minimal = [{ id: 'x', info: { name: 'X', class: 'Mago', level: 1 } }]
    render(<CharacterMap characters={minimal} onSelect={() => {}} />)
    expect(screen.getByText('X')).toBeInTheDocument() // não quebra
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- CharacterMap`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/CharacterMap.jsx`**

```jsx
import { useMemo } from 'react'
import { CharacterToken } from './CharacterToken'
import { Banner } from '../ui/Banner'
import { MAP_BACKGROUND_URL, CAMPAIGN_NAME_DEFAULT } from '../../utils/config'
import { getDefaultPosition } from '../../utils/token-position'

/**
 * Mapa background com tokens posicionados. Auto-place quando o
 * personagem não tem position salva.
 */
export function CharacterMap({
  characters = [],
  campaignName = CAMPAIGN_NAME_DEFAULT,
  onSelect,
  onTokenDragStart,
}) {
  const positioned = useMemo(
    () => characters.map(c => ({
      ...c,
      position: c.position || getDefaultPosition(c, 'default'),
    })),
    [characters]
  )

  return (
    <div
      role="region"
      aria-label="Mapa da campanha"
      className="relative w-full h-full overflow-hidden rounded"
      style={{
        border: '12px solid',
        borderImage: 'linear-gradient(135deg, var(--color-gold-700), var(--color-shell-700), var(--color-gold-700)) 1',
        boxShadow: 'inset 0 0 60px rgba(42,31,20,0.45), 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        data-testid="character-map-canvas"
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${MAP_BACKGROUND_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Banner no topo */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[300px] max-w-[80%] z-[3]">
        <Banner>{campaignName}</Banner>
      </div>

      {/* Rosa-dos-ventos */}
      <svg
        viewBox="0 0 78 78"
        className="absolute bottom-3 right-3 z-[4]"
        style={{ width: '78px', height: '78px', opacity: 0.85 }}
        aria-hidden="true"
      >
        <circle cx="39" cy="39" r="34" fill="rgba(244,234,211,0.55)" stroke="var(--color-shell-800)" strokeWidth="1.8"/>
        <circle cx="39" cy="39" r="26" fill="none" stroke="var(--color-shell-800)" strokeWidth="0.8"/>
        <circle cx="39" cy="39" r="3" fill="var(--color-shell-800)"/>
        <path d="M39,5 L43,39 L39,73 L35,39 Z" fill="var(--color-shell-800)"/>
        <path d="M5,39 L39,43 L73,39 L39,35 Z" fill="var(--color-shell-800)" opacity="0.55"/>
        <text x="39" y="3.5" textAnchor="middle" fontSize="7" fill="var(--color-shell-800)" fontWeight="700">N</text>
      </svg>

      {/* Tokens */}
      {positioned.map(c => (
        <CharacterToken
          key={c.id}
          character={c}
          onSelect={onSelect}
          onDragStart={onTokenDragStart}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- CharacterMap`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterMap.jsx src/test/CharacterList/CharacterMap.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): CharacterMap — background + banner + tokens

Renderiza mapa background (MAP_BACKGROUND_URL), banner pergaminho,
rosa-dos-ventos SVG, e tokens posicionados. Auto-place via
getDefaultPosition quando personagem não tem position salva.
Drag handler é passado por prop (será wired na orquestração).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 13: `CharacterSidebar.jsx` com filtros e cluster

**Files:**
- Create: `src/components/CharacterList/CharacterSidebar.jsx`
- Create: `src/test/CharacterList/CharacterSidebar.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/CharacterSidebar.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterSidebar } from '../../components/CharacterList/CharacterSidebar'

const make = (id, name, klass, level) => ({
  id, info: { name, class: klass, level, race: 'Humano' }
})

const chars = [
  make('a', 'Alice', 'Mago', 5),
  make('b', 'Bob', 'Guerreiro', 3),
  make('c', 'Carla', 'Mago', 7),
]

describe('<CharacterSidebar>', () => {
  it('renderiza todos os personagens por padrão', () => {
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('renderiza filtro "Todos" como ativo inicialmente', () => {
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Todos/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filtra por classe ao clicar no chip', async () => {
    const user = userEvent.setup()
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Filtrar por mago/i }))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('mostra cluster overflow quando há > MAX_VISIBLE_TOKENS', () => {
    const many = Array.from({ length: 15 }, (_, i) => make(`p${i}`, `Pers ${i}`, 'Mago', 1))
    render(<CharacterSidebar characters={many} onSelect={() => {}} />)
    expect(screen.getByText(/\+ 5 outros/i)).toBeInTheDocument()
  })

  it('clicar numa linha chama onSelect com ID', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterSidebar characters={chars} onSelect={onSelect} />)
    await user.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('renderiza estado vazio quando lista está vazia', () => {
    render(<CharacterSidebar characters={[]} onSelect={() => {}} />)
    expect(screen.getByText(/Nenhum herói/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- CharacterSidebar`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/CharacterSidebar.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { Chip } from '../ui/Chip'
import { ClassIcon, getClassIconKey } from '../../utils/class-icons'
import { MAX_VISIBLE_TOKENS } from '../../utils/config'

const FILTER_CLASSES = [
  { key: 'guerreiro',   label: 'Guerreiro' },
  { key: 'mago',        label: 'Mago' },
  { key: 'clerigo',     label: 'Clérigo' },
  { key: 'ladino',      label: 'Ladino' },
  { key: 'barbaro',     label: 'Bárbaro' },
  { key: 'bardo',       label: 'Bardo' },
  { key: 'druida',      label: 'Druida' },
  { key: 'patrulheiro', label: 'Patrulheiro' },
  { key: 'paladino',    label: 'Paladino' },
  { key: 'feiticeiro',  label: 'Feiticeiro' },
  { key: 'bruxo',       label: 'Bruxo' },
  { key: 'monge',       label: 'Monge' },
]

function toRoman(num) {
  if (!Number.isFinite(num) || num <= 0) return '—'
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let r = ''
  let n = num
  for (const [v, s] of map) {
    while (n >= v) { r += s; n -= v }
  }
  return r
}

export function CharacterSidebar({ characters = [], onSelect, onFilterChange }) {
  const [classFilter, setClassFilter] = useState(null) // null = todos

  const filtered = useMemo(() => {
    if (!classFilter) return characters
    return characters.filter(c => getClassIconKey(c.info?.class) === classFilter)
  }, [characters, classFilter])

  const visible = filtered.slice(0, MAX_VISIBLE_TOKENS)
  const hidden = filtered.length - visible.length

  function applyFilter(key) {
    setClassFilter(key)
    if (onFilterChange) onFilterChange(key)
  }

  return (
    <aside
      className="flex flex-col h-full p-3 rounded border"
      style={{
        background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
        borderColor: 'var(--color-shell-border)',
        color: 'var(--color-ink-inverse)',
        fontFamily: 'var(--font-redesign-sans)',
      }}
    >
      <h6
        className="text-center pb-1.5 mb-2 text-[11px] uppercase tracking-[0.18em] font-bold border-b"
        style={{
          color: 'var(--color-gold-400)',
          borderColor: 'var(--color-shell-border)',
          fontFamily: 'IM Fell English SC, serif',
        }}
      >
        Companhia
      </h6>

      <div className="flex flex-wrap gap-1 mb-2" role="group" aria-label="Filtros de classe">
        <Chip
          active={classFilter === null}
          onClick={() => applyFilter(null)}
          ariaLabel="Mostrar todas as classes"
        >
          Todos
        </Chip>
        {FILTER_CLASSES.map(f => (
          <Chip
            key={f.key}
            active={classFilter === f.key}
            onClick={() => applyFilter(f.key)}
            ariaLabel={`Filtrar por ${f.label.toLowerCase()}`}
          >
            <ClassIcon classKey={f.key} size={12} color="currentColor" />
          </Chip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs italic text-center mt-4" style={{ color: 'var(--color-gold-500)' }}>
            Nenhum herói nesse filtro.
          </p>
        )}
        {visible.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect && onSelect(c.id)}
            className="w-full flex items-center gap-2 px-1 py-1.5 text-left transition-colors hover:bg-[rgba(212,173,106,0.08)] border-b"
            style={{ borderColor: 'rgba(110, 87, 43, 0.3)' }}
          >
            <span
              className="grid place-items-center rounded-full flex-shrink-0"
              style={{
                width: '26px', height: '26px',
                background: 'radial-gradient(circle at 30% 25%, var(--color-accent-100), var(--color-accent-500))',
                border: '1px solid var(--color-shell-800)',
                color: 'var(--color-shell-800)',
              }}
            >
              <ClassIcon classKey={c.info?.class} size={16} color="currentColor" />
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-[12px] font-semibold leading-tight truncate"
                style={{ fontFamily: 'EB Garamond, serif', color: 'var(--color-ink-inverse)' }}
              >
                {c.info?.name || 'Sem nome'}
              </span>
              <span className="block text-[10px] italic mt-0.5" style={{ color: 'var(--color-gold-500)' }}>
                {c.info?.class || '—'}
              </span>
            </span>
            <span
              className="text-[11px] font-bold flex-shrink-0"
              style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}
            >
              {toRoman(c.info?.level ?? 1)}
            </span>
          </button>
        ))}
        {hidden > 0 && (
          <div
            className="mt-2 p-2 rounded text-[10px] text-center italic border-dashed"
            style={{
              background: 'rgba(212,173,106,0.1)',
              border: '1px dashed var(--color-shell-border)',
              color: 'var(--color-gold-500)',
            }}
          >
            + {hidden} outros
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- CharacterSidebar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterSidebar.jsx src/test/CharacterList/CharacterSidebar.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): CharacterSidebar — lista + filtros + cluster

Sidebar escura com cabeçalho COMPANHIA, chips de filtro por classe
(Todos + 12 classes), lista de personagens com mini-avatar + nome +
classe + nível romano. Cluster "+ N outros" quando passa de
MAX_VISIBLE_TOKENS (10).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 14: `CharacterListView.jsx` (modo lista)

**Files:**
- Create: `src/components/CharacterList/CharacterListView.jsx`
- Create: `src/test/CharacterList/CharacterListView.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/CharacterListView.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterListView } from '../../components/CharacterList/CharacterListView'

const now = Date.now()
const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, lastOpenedAt: now - 1000 * 60 },       // 1min
  { id: 'b', info: { name: 'Bob',   class: 'Guerreiro', level: 3 }, lastOpenedAt: now - 1000 * 3600 }, // 1h
  { id: 'c', info: { name: 'Carla', class: 'Clérigo', level: 7 } /* sem lastOpened */ },
]

describe('<CharacterListView>', () => {
  it('renderiza todos os personagens', () => {
    render(<CharacterListView characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('ordena por lastOpenedAt desc (mais recente primeiro), sem timestamp ao final', () => {
    render(<CharacterListView characters={chars} onSelect={() => {}} />)
    const cards = screen.getAllByTestId('list-card')
    expect(cards[0]).toHaveTextContent('Alice')
    expect(cards[1]).toHaveTextContent('Bob')
    expect(cards[2]).toHaveTextContent('Carla')
  })

  it('chama onSelect ao clicar num card', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterListView characters={chars} onSelect={onSelect} />)
    await user.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('renderiza estado vazio quando não há personagens', () => {
    render(<CharacterListView characters={[]} onSelect={() => {}} />)
    expect(screen.getByText(/Nenhum herói/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- CharacterListView`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/CharacterListView.jsx`**

```jsx
import { useMemo } from 'react'
import { ClassIcon } from '../../utils/class-icons'

function relativeTime(epoch) {
  if (!epoch) return null
  const delta = Date.now() - epoch
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `há ${w} sem`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

export function CharacterListView({ characters = [], onSelect }) {
  const sorted = useMemo(() => {
    return [...characters].sort((a, b) => {
      const ta = a.lastOpenedAt || 0
      const tb = b.lastOpenedAt || 0
      return tb - ta
    })
  }, [characters])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-ink-secondary)' }}>
        <p className="text-sm italic">Nenhum herói recrutado ainda.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {sorted.map(c => {
        const info = c.info || {}
        const last = relativeTime(c.lastOpenedAt)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect && onSelect(c.id)}
            data-testid="list-card"
            className="flex items-center gap-3 p-3 rounded-md text-left transition-colors hover:shadow-[var(--shadow-elevated)]"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-accent-300)',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--color-ink-primary)',
              fontFamily: 'var(--font-redesign-sans)',
            }}
          >
            <span
              className="grid place-items-center rounded-full flex-shrink-0"
              style={{
                width: '44px', height: '44px',
                background: 'radial-gradient(circle at 30% 25%, var(--color-accent-100), var(--color-accent-500))',
                border: '2px solid var(--color-shell-800)',
                color: 'var(--color-shell-800)',
              }}
            >
              <ClassIcon classKey={info.class} size={24} color="currentColor" />
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-base font-semibold truncate"
                style={{ fontFamily: 'EB Garamond, serif' }}
              >
                {info.name || 'Sem nome'}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>
                {[info.race, info.class].filter(Boolean).join(' · ') || '—'}
                {info.level != null && <> · Nível {info.level}</>}
              </span>
            </span>
            {last && (
              <span className="text-[11px] italic flex-shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
                {last}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- CharacterListView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterListView.jsx src/test/CharacterList/CharacterListView.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): CharacterListView — modo lista com cards horizontais

Modo alternativo ao mapa: cards horizontais com avatar grande à
esquerda, nome+meta no centro, "última vez aberta" relativa à direita.
Ordenado por lastOpenedAt desc.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 15: `EmptyState.jsx`

**Files:**
- Create: `src/components/CharacterList/EmptyState.jsx`
- Create: `src/test/CharacterList/EmptyState.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/EmptyState.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../../components/CharacterList/EmptyState'

describe('<EmptyState>', () => {
  it('renderiza mensagem convidativa', () => {
    render(<EmptyState onCreate={() => {}} />)
    expect(screen.getByText(/Sua história começa aqui/i)).toBeInTheDocument()
  })

  it('renderiza CTA grande "Recrutar"', () => {
    render(<EmptyState onCreate={() => {}} />)
    expect(screen.getByRole('button', { name: /Recrutar/i })).toBeInTheDocument()
  })

  it('CTA dispara onCreate', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<EmptyState onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Recrutar/i }))
    expect(onCreate).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- EmptyState`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/EmptyState.jsx`**

```jsx
import { Button } from '../ui/Button'

export function EmptyState({ onCreate }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-[2] pointer-events-none">
      <div
        className="pointer-events-auto max-w-sm text-center p-6 rounded"
        style={{
          background: 'rgba(255, 251, 242, 0.92)',
          border: '2px solid var(--color-accent-500)',
          boxShadow: 'var(--shadow-elevated)',
          color: 'var(--color-ink-primary)',
        }}
      >
        <p
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          Sua história começa aqui
        </p>
        <p
          className="text-sm italic mb-4"
          style={{ color: 'var(--color-ink-secondary)' }}
        >
          Recrute seu primeiro aventureiro pra começar a aventura.
        </p>
        <Button variant="gold" size="md" onClick={onCreate}>
          ⚔ Recrutar Aventureiro
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- EmptyState`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/EmptyState.jsx src/test/CharacterList/EmptyState.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): EmptyState — caixa convidativa no centro do mapa

Estado de "zero personagens": caixa pergaminho centralizada sobre o
mapa com mensagem + CTA dourado "⚔ Recrutar Aventureiro".

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 16: Orquestrador `CharacterList.jsx` (novo)

**Files:**
- Create: `src/components/CharacterList/CharacterList.jsx`
- Create: `src/components/CharacterList/index.js`
- Create: `src/test/CharacterList/CharacterList.test.jsx`

- [ ] **Step 1: Escrever teste falhando**

Crie `src/test/CharacterList/CharacterList.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterList } from '../../components/CharacterList'
import { upsertCharacter } from '../../utils/storage'

function seed(id, name, klass) {
  upsertCharacter({
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    info: { name, class: klass, level: 3, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: { maxHp: 20, currentHp: 20, tempHp: 0, attacks: [] },
    proficiencies: {},
    spellcasting: {},
    inventory: { items: [] },
    traits: {},
  })
}

describe('<CharacterList>', () => {
  beforeEach(() => localStorage.clear())

  it('renderiza toolbar com brand "Companhia"', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText(/Companhia/i)).toBeInTheDocument()
  })

  it('renderiza EmptyState quando localStorage vazio', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText(/Sua história começa aqui/i)).toBeInTheDocument()
  })

  it('renderiza tokens quando há personagens', () => {
    seed('a', 'Alice', 'Mago')
    seed('b', 'Bob', 'Guerreiro')
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('toggla entre modo Mapa e Lista', async () => {
    seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByRole('region', { name: /Mapa da campanha/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Lista$/i }))
    expect(screen.queryByRole('region', { name: /Mapa da campanha/i })).not.toBeInTheDocument()
    // No modo lista, Alice ainda aparece (no card)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('CTA "Recrutar" chama onCreate', async () => {
    seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Recrutar/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('click no token chama onSelect com ID', async () => {
    seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterList onSelect={onSelect} onCreate={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Alice/i }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- "CharacterList/CharacterList"`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/CharacterList/CharacterList.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { CharacterMap } from './CharacterMap'
import { CharacterSidebar } from './CharacterSidebar'
import { CharacterListView } from './CharacterListView'
import { EmptyState } from './EmptyState'
import { Button } from '../ui/Button'
import {
  loadCharacters,
  touchCharacterLastOpened,
} from '../../utils/storage'
import {
  CAMPAIGN_NAME_DEFAULT,
  CAMPAIGN_NAME_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
} from '../../utils/config'

const VIEW_MAP = 'map'
const VIEW_LIST = 'list'

function readView() {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return v === VIEW_LIST ? VIEW_LIST : VIEW_MAP
  } catch { return VIEW_MAP }
}
function writeView(v) {
  try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, v) } catch {}
}

function readCampaignName() {
  try {
    return localStorage.getItem(CAMPAIGN_NAME_STORAGE_KEY) || CAMPAIGN_NAME_DEFAULT
  } catch { return CAMPAIGN_NAME_DEFAULT }
}

export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState(loadCharacters)
  const [view, setView] = useState(readView)
  const [campaignName] = useState(readCampaignName)

  // Sincroniza state com localStorage se mudar de aba (multi-tab safety)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'dnd-app-characters') setCharacters(loadCharacters())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleSelect = useCallback((id) => {
    touchCharacterLastOpened(id)
    setCharacters(loadCharacters())
    if (onSelect) onSelect(id)
  }, [onSelect])

  const switchView = useCallback((v) => {
    setView(v)
    writeView(v)
  }, [])

  const isEmpty = characters.length === 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-ink-primary)' }}
    >
      {/* Toolbar */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
          borderColor: 'var(--color-shell-border)',
          color: 'var(--color-ink-inverse)',
        }}
      >
        <h1
          className="text-base font-bold"
          style={{
            fontFamily: 'IM Fell English SC, serif',
            color: 'var(--color-gold-400)',
            letterSpacing: '0.12em',
          }}
        >
          {campaignName.replace(/⚜\s*/g, '')} {/* sem ornamentos na toolbar pra não duplicar */}
        </h1>

        <div className="flex items-center gap-2" role="group" aria-label="Modo de visualização">
          <Button
            variant={view === VIEW_MAP ? 'gold' : 'ghost'}
            size="sm"
            onClick={() => switchView(VIEW_MAP)}
            aria-pressed={view === VIEW_MAP}
          >
            ▦ Mapa
          </Button>
          <Button
            variant={view === VIEW_LIST ? 'gold' : 'ghost'}
            size="sm"
            onClick={() => switchView(VIEW_LIST)}
            aria-pressed={view === VIEW_LIST}
          >
            ≡ Lista
          </Button>
        </div>

        <Button variant="gold" size="md" onClick={onCreate}>
          ⚔ Recrutar
        </Button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex overflow-hidden">
        {view === VIEW_MAP ? (
          <>
            <div className="flex-1 relative p-3">
              <CharacterMap
                characters={characters}
                campaignName={campaignName}
                onSelect={handleSelect}
              />
              {isEmpty && <EmptyState onCreate={onCreate} />}
            </div>
            <div className="hidden md:block w-[240px] flex-shrink-0 p-3 pl-0">
              <CharacterSidebar
                characters={characters}
                onSelect={handleSelect}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 max-w-3xl mx-auto w-full">
            <CharacterListView
              characters={characters}
              onSelect={handleSelect}
            />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Criar `src/components/CharacterList/index.js`**

```js
export { CharacterList } from './CharacterList'
```

- [ ] **Step 5: Rodar testes do orquestrador**

Run: `npm test -- "CharacterList/CharacterList"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CharacterList/CharacterList.jsx src/components/CharacterList/index.js src/test/CharacterList/CharacterList.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): CharacterList orquestrador — toolbar + view toggle

Compõe toolbar (brand + Mapa/Lista + Recrutar) com modo Mapa (mapa +
sidebar) ou modo Lista (cards horizontais). Persiste view em
localStorage. Cliques em tokens marcam lastOpenedAt antes de chamar
onSelect.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 17: Wire drag-and-drop dos tokens no mapa

**Files:**
- Modify: `src/components/CharacterList/CharacterMap.jsx`
- Modify: `src/components/CharacterList/CharacterList.jsx`
- Create: `src/test/CharacterList/CharacterMap.drag.test.jsx`

- [ ] **Step 1: Escrever teste de drag em arquivo NOVO**

Crie `src/test/CharacterList/CharacterMap.drag.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterMap } from '../../components/CharacterList/CharacterMap'

const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, position: { x: 0.5, y: 0.5 } },
]

function mockBoundingRect(el, rect) {
  el.getBoundingClientRect = () => ({
    left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
    width: rect.width, height: rect.height, x: rect.left, y: rect.top,
    toJSON() {},
  })
}

describe('<CharacterMap> drag', () => {
  beforeEach(() => localStorage.clear())

  it('chama onPositionChange com novas coordenadas normalizadas após pointerup', () => {
    const onPositionChange = vi.fn()
    const { container } = render(
      <CharacterMap
        characters={chars}
        onSelect={() => {}}
        onPositionChange={onPositionChange}
      />
    )
    const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
    mockBoundingRect(canvas, { left: 0, top: 0, width: 1000, height: 800 })

    const tokenButton = screen.getByRole('button', { name: /Alice/i })
    // Inicia drag
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    // Move pointer fora do botão, no document
    fireEvent.pointerMove(window, { clientX: 800, clientY: 600, pointerId: 1 })
    // Encerra
    fireEvent.pointerUp(window, { clientX: 800, clientY: 600, pointerId: 1 })

    expect(onPositionChange).toHaveBeenCalledTimes(1)
    const [id, pos] = onPositionChange.mock.calls[0]
    expect(id).toBe('a')
    expect(pos.x).toBeCloseTo(0.8, 1)
    expect(pos.y).toBeCloseTo(0.75, 1)
  })

  it('não dispara onSelect quando houve movimento (drag), só quando foi click puro', () => {
    const onSelect = vi.fn()
    const onPositionChange = vi.fn()
    const { container } = render(
      <CharacterMap
        characters={chars}
        onSelect={onSelect}
        onPositionChange={onPositionChange}
      />
    )
    const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
    mockBoundingRect(canvas, { left: 0, top: 0, width: 1000, height: 800 })

    const tokenButton = screen.getByRole('button', { name: /Alice/i })
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 800, clientY: 600, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 800, clientY: 600, pointerId: 1 })

    // Movimento ≥ 4px → drag, NÃO click
    expect(onSelect).not.toHaveBeenCalled()
    expect(onPositionChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar teste pra ver falhar**

Run: `npm test -- CharacterMap.drag`
Expected: FAIL — onPositionChange não é chamado.

- [ ] **Step 3: Atualizar `CharacterMap.jsx` para wirar drag**

Substitua `src/components/CharacterList/CharacterMap.jsx` por:

```jsx
import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { CharacterToken } from './CharacterToken'
import { Banner } from '../ui/Banner'
import { MAP_BACKGROUND_URL, CAMPAIGN_NAME_DEFAULT } from '../../utils/config'
import { getDefaultPosition, clampPosition } from '../../utils/token-position'

const DRAG_THRESHOLD_PX = 4

export function CharacterMap({
  characters = [],
  campaignName = CAMPAIGN_NAME_DEFAULT,
  onSelect,
  onPositionChange,
}) {
  const containerRef = useRef(null)
  const dragState = useRef(null) // { id, startX, startY, moved, lastPos }
  const [draggedPositions, setDraggedPositions] = useState({}) // id → {x,y} durante drag

  const positioned = useMemo(
    () => characters.map(c => ({
      ...c,
      position: draggedPositions[c.id] || c.position || getDefaultPosition(c, 'default'),
    })),
    [characters, draggedPositions]
  )

  const computePos = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return clampPosition({
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    })
  }, [])

  const handlePointerMove = useCallback((e) => {
    const st = dragState.current
    if (!st) return
    const dx = Math.abs(e.clientX - st.startX)
    const dy = Math.abs(e.clientY - st.startY)
    if (!st.moved && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
      st.moved = true
    }
    if (st.moved) {
      const pos = computePos(e.clientX, e.clientY)
      if (pos) {
        st.lastPos = pos
        setDraggedPositions(prev => ({ ...prev, [st.id]: pos }))
      }
    }
  }, [computePos])

  const handlePointerUp = useCallback((e) => {
    const st = dragState.current
    if (!st) return
    dragState.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)

    if (st.moved && st.lastPos && onPositionChange) {
      onPositionChange(st.id, st.lastPos)
      // Limpa dragged depois de propagar (parent vai atualizar `characters`)
      setDraggedPositions(prev => {
        const next = { ...prev }
        delete next[st.id]
        return next
      })
    } else if (!st.moved && onSelect) {
      onSelect(st.id)
    }
  }, [onSelect, onPositionChange, handlePointerMove])

  const handleTokenDragStart = useCallback((e, id) => {
    dragState.current = { id, startX: e.clientX, startY: e.clientY, moved: false, lastPos: null }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    e.preventDefault()
  }, [handlePointerMove, handlePointerUp])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  // O click do token só dispara onSelect se NÃO houve drag — então passamos
  // um onSelect "vazio" para o CharacterToken e tratamos o select no pointerup
  // quando moved === false. Isso evita race entre click e drag.
  const noopSelect = useCallback(() => {}, [])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa da campanha"
      className="relative w-full h-full overflow-hidden rounded"
      style={{
        border: '12px solid',
        borderImage: 'linear-gradient(135deg, var(--color-gold-700), var(--color-shell-700), var(--color-gold-700)) 1',
        boxShadow: 'inset 0 0 60px rgba(42,31,20,0.45), 0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        data-testid="character-map-canvas"
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${MAP_BACKGROUND_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[300px] max-w-[80%] z-[3]">
        <Banner>{campaignName}</Banner>
      </div>

      <svg
        viewBox="0 0 78 78"
        className="absolute bottom-3 right-3 z-[4]"
        style={{ width: '78px', height: '78px', opacity: 0.85 }}
        aria-hidden="true"
      >
        <circle cx="39" cy="39" r="34" fill="rgba(244,234,211,0.55)" stroke="var(--color-shell-800)" strokeWidth="1.8"/>
        <circle cx="39" cy="39" r="26" fill="none" stroke="var(--color-shell-800)" strokeWidth="0.8"/>
        <circle cx="39" cy="39" r="3" fill="var(--color-shell-800)"/>
        <path d="M39,5 L43,39 L39,73 L35,39 Z" fill="var(--color-shell-800)"/>
        <path d="M5,39 L39,43 L73,39 L39,35 Z" fill="var(--color-shell-800)" opacity="0.55"/>
        <text x="39" y="3.5" textAnchor="middle" fontSize="7" fill="var(--color-shell-800)" fontWeight="700">N</text>
      </svg>

      {positioned.map(c => (
        <CharacterToken
          key={c.id}
          character={c}
          onSelect={noopSelect}
          onDragStart={handleTokenDragStart}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wirar `onPositionChange` no orquestrador**

Em `src/components/CharacterList/CharacterList.jsx`:

Adicione no imports:
```js
import { updateCharacterPosition } from '../../utils/storage'
```

Dentro do componente, antes do `return`:
```js
const handlePositionChange = useCallback((id, position) => {
  updateCharacterPosition(id, position)
  setCharacters(loadCharacters())
}, [])
```

E na chamada do `<CharacterMap>` passe `onPositionChange={handlePositionChange}`.

- [ ] **Step 5: Rodar TODOS os testes de CharacterMap (anteriores + drag)**

Run: `npm test -- CharacterMap`
Expected: PASS, todos os testes (incluindo o anterior `CharacterMap.test.jsx`) verdes.

> Observação: o teste antigo `chama onSelect ao clicar num token` pode quebrar porque agora click só dispara onSelect via pointerup do dragState. Atualize esse teste para usar pointerDown+pointerUp em mesma coordenada (sem move) caso falhe:
> ```jsx
> fireEvent.pointerDown(tokenButton, { clientX: 0, clientY: 0, pointerId: 1 })
> fireEvent.pointerUp(window, { clientX: 0, clientY: 0, pointerId: 1 })
> ```

- [ ] **Step 6: Rodar `CharacterList/CharacterList` tests também**

Run: `npm test -- CharacterList/CharacterList`
Expected: PASS (mesmo ajuste de pointerDown+pointerUp pode ser necessário no teste do orquestrador).

- [ ] **Step 7: Commit**

```bash
git add src/components/CharacterList/CharacterMap.jsx src/components/CharacterList/CharacterList.jsx src/test/CharacterList/CharacterMap.drag.test.jsx src/test/CharacterList/CharacterMap.test.jsx src/test/CharacterList/CharacterList.test.jsx
git commit -m "$(cat <<'EOF'
feat(redesign): drag-and-drop dos tokens com persistência

CharacterMap captura pointerdown nos tokens, escuta pointermove/up
no window, e dispara onPositionChange quando movimento > 4px (senão
trata como click → onSelect). Posição persiste via
updateCharacterPosition no storage. Atualizado teste de click do
mapa para pointerDown+pointerUp na mesma coord.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 18: Integrar novo `CharacterList/` no App e deletar arquivo antigo

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/components/CharacterList.jsx`
- Modify: `src/test/components.test.jsx` (se existirem testes que referenciam o velho)

- [ ] **Step 1: Verificar imports da CharacterList no codebase**

Run: `grep -rn "from.*CharacterList'" src/ | grep -v node_modules`
Expected: lista todos os imports — devem virar `from './components/CharacterList'` (sem `.jsx`).

- [ ] **Step 2: Atualizar `src/App.jsx`**

Localize a linha (provavelmente linha ~7):
```js
import { CharacterList } from './components/CharacterList'
```

Já está apontando para o diretório (porque temos `index.js` lá), então NADA muda. Se estava `./components/CharacterList.jsx`, retire o `.jsx`.

- [ ] **Step 3: Deletar `src/components/CharacterList.jsx`**

Run: `rm src/components/CharacterList.jsx`

- [ ] **Step 4: Inspecionar testes antigos**

Run: `grep -l "CharacterList" src/test/*.test.* 2>&1`
Expected: lista arquivos que mencionam CharacterList.

Para cada arquivo encontrado (excluindo nossos novos `src/test/CharacterList/*`), abrir e:
- Se testavam o "Tomo dos Heróis" (texto antigo), pode REMOVER os blocos antigos OU atualizar pra novo texto ("Companhia") — preferir remover blocos especificamente sobre layout antigo, deixar testes ainda válidos (ex: que valida onSelect ser chamado).

Provável arquivo a inspecionar: `src/test/components.test.jsx`. Se mencionar `Tomo dos Heróis`, `Inscrever Novo Herói`, etc., delete só esses describes/its.

- [ ] **Step 5: Rodar TODA a suíte de testes**

Run: `npm test`
Expected: PASS. Se algum E2E (em `src/test/e2e/`) referenciar CharacterList antiga, atualizar texto.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: zero erros. Corrija se houver imports não usados em App.jsx ou outros arquivos.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build verde.

- [ ] **Step 8: Commit**

```bash
git add -u
git add src/
git commit -m "$(cat <<'EOF'
refactor(redesign): remover CharacterList.jsx legado (pergaminho)

Substitui CharacterList.jsx (Tomo dos Heróis em pergaminho com lista
vertical) pelo diretório src/components/CharacterList/ que renderiza
o redesign "Mapa da Campanha". App.jsx mantém o mesmo import (resolve
via index.js do diretório).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 19: E2E — fluxo completo

**Files:**
- Create: `src/test/e2e/character-list-mapa.test.jsx`

- [ ] **Step 1: Escrever teste E2E (Vitest + RTL, segue padrão dos outros em e2e/)**

Crie `src/test/e2e/character-list-mapa.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterList } from '../../components/CharacterList'
import { upsertCharacter, loadCharacterById } from '../../utils/storage'

function seed(id, name, klass, level = 3) {
  upsertCharacter({
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    info: { name, class: klass, level, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: { maxHp: 20, currentHp: 20, tempHp: 0, attacks: [] },
    proficiencies: {},
    spellcasting: {},
    inventory: { items: [] },
    traits: {},
  })
}

function mockMapRect(container, rect = { left: 0, top: 0, width: 1000, height: 800 }) {
  const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
  canvas.getBoundingClientRect = () => ({
    left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
    width: rect.width, height: rect.height, x: rect.left, y: rect.top, toJSON() {},
  })
}

describe('E2E — CharacterList Mapa', () => {
  beforeEach(() => localStorage.clear())

  it('fluxo: criar → ver token → arrastar → posição persiste', () => {
    seed('e2e-1', 'Heitor', 'Guerreiro')
    const { container, unmount } = render(
      <CharacterList onSelect={() => {}} onCreate={() => {}} />
    )
    mockMapRect(container)

    // Token está visível
    expect(screen.getByText('Heitor')).toBeInTheDocument()

    // Arrasta de centro para canto inferior direito
    const tokenButton = screen.getByRole('button', { name: /Heitor/i })
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 900, clientY: 720, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 900, clientY: 720, pointerId: 1 })

    // Storage reflete posição nova
    const reloaded = loadCharacterById('e2e-1')
    expect(reloaded.position.x).toBeCloseTo(0.9, 1)
    expect(reloaded.position.y).toBeCloseTo(0.9, 1)

    // Re-renderiza simulando reload da página
    unmount()
    const second = render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText('Heitor')).toBeInTheDocument()
    // Não testamos estilo exato — testamos que reload mantém persistência via outro path no doc
    const stillThere = loadCharacterById('e2e-1')
    expect(stillThere.position.x).toBeCloseTo(0.9, 1)
  })

  it('fluxo: toggle Mapa → Lista persiste em localStorage', async () => {
    seed('e2e-2', 'Lyra', 'Maga')
    const user = userEvent.setup()
    const { unmount } = render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)

    await user.click(screen.getByRole('button', { name: /^Lista$/i }))
    expect(localStorage.getItem('dnd-ficha:char-list-view')).toBe('list')

    unmount()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    // Já carrega em modo lista
    expect(screen.queryByRole('region', { name: /Mapa da campanha/i })).not.toBeInTheDocument()
    expect(screen.getByText('Lyra')).toBeInTheDocument()
  })

  it('fluxo: estado vazio mostra CTA e dispara onCreate', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)

    expect(screen.getByText(/Sua história começa aqui/i)).toBeInTheDocument()
    const ctas = screen.getAllByRole('button', { name: /Recrutar/i })
    await user.click(ctas[0])
    expect(onCreate).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar E2E**

Run: `npm test -- character-list-mapa`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/e2e/character-list-mapa.test.jsx
git commit -m "$(cat <<'EOF'
test(redesign): E2E do fluxo CharacterList mapa

Cobre: criar personagem → ver token no mapa → arrastar → posição
persiste após reload; toggle Mapa↔Lista persiste em localStorage;
estado vazio mostra CTA que dispara onCreate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin HEAD:master
git push origin HEAD
```

---

## Task 20: Lint + Build + Smoke manual

**Files:** nenhum (verificação final)

- [ ] **Step 1: Rodar suíte completa**

Run: `npm test`
Expected: 100% verde.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero warnings/erros.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build sucesso, sem warnings sobre arquivos faltando.

- [ ] **Step 4: Smoke manual via dev server**

Run: `npm run dev`
Abra `http://localhost:5173`. Verifique:
- Mapa carrega com banner "⚜ Companhia do Vale ⚜"
- Tokens aparecem nas regiões corretas por classe
- Hover mostra tooltip rico
- Click no token vai pra ficha
- Voltar → click no toggle Lista → vê cards
- Arrastar token e recarregar → permanece na nova posição
- Tela vazia mostra CTA centralizado
- Recrutar abre o wizard normalmente

Se algo estiver errado, corrigir nos commits específicos, não nesse.

Mata o servidor (Ctrl+C).

- [ ] **Step 5: Commit final se houve ajustes**

Se nada precisou ajustar, pular. Senão:

```bash
git add -u
git commit -m "fix(redesign): ajustes finais pós-smoke manual

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master
git push origin HEAD
```

---

## Verificação de cobertura do spec

| Seção spec | Task(s) que cobre |
|---|---|
| §3.1 Cores | Task 1 |
| §3.2 Tipografia (Inter + Garamond + IM Fell) | Task 1 |
| §3.3 Espaçamento e raios | Aplicado inline ao longo dos componentes |
| §3.4 Sombras | Task 1 |
| §3.5 Primitivos: Button, Chip, Banner, Tooltip | Tasks 7, 8, 9 (Tooltip existente preservada, MapTooltip novo em 10) |
| §4.1 Layout desktop | Tasks 12, 16 |
| §4.2 Layout mobile (drawer) | Task 16 (`hidden md:block` na sidebar). Drawer mobile FAB NÃO está nessa entrega (escopo recortado — sidebar some no mobile, fica só mapa + toolbar). Pode virar follow-up se priorizado. |
| §4.3 Toolbar | Task 16 |
| §4.4 Mapa | Tasks 12, 17 |
| §4.5 Tokens | Tasks 11, 17 |
| §4.6 Silhuetas por classe | Task 3 |
| §4.7 Sidebar | Task 13 |
| §4.8 Toggle Mapa↔Lista | Task 16 (apenas — fica na toolbar) |
| §4.9 Estado vazio | Task 15 |
| §4.10 Confirmação de delete | NÃO incluído neste plano (delete continua pelo menu da ficha aberta). Adicionar como follow-up se priorizado. |
| §5 Estrutura de arquivos | Tasks 2–16 |
| §6 Modelo de dados (position, lastOpenedAt) | Task 5 |
| §7.1 Drag-and-drop | Task 17 |
| §7.2 Click vs drag | Task 17 |
| §7.3 Tooltip hover/focus | Tasks 10, 11 |
| §7.4 Toggle Mapa↔Lista persistente | Task 16 |
| §7.5 Filtros da sidebar | Task 13 |
| §8 Acessibilidade | Aplicado ao longo (aria-label, role, focus-visible) |
| §9 Performance | Background WebP em Task 6; transform-only em Task 11/17 |
| §10 Testing | Cada task tem testes; E2E em Task 19 |
| §11 Asset mapa | Task 6 |

**Gaps deliberados (fora do escopo desta entrega — virar follow-ups):**
- Drawer mobile retrátil pra sidebar (mobile fica só mapa, sidebar somem em < md).
- Confirmação de delete a partir da lista (delete continua dentro da ficha).
- UI de upload/swap do mapa pelo usuário (já planejado em §12 spec).
- Edição do nome da campanha via UI.

---

## Execução

Plano completo em `docs/superpowers/plans/2026-05-14-redesign-character-list-mapa.md`. Duas opções de execução:

**1. Subagent-Driven (recomendado)** — Eu disparo um subagente por tarefa, reviso entre tarefas, iteração rápida.

**2. Inline Execution** — Executo as tarefas nesta sessão usando `superpowers:executing-plans`, com checkpoints pra review.

**Qual abordagem?**
