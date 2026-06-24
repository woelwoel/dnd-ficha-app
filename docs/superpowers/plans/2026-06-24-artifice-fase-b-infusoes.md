# Artífice — Fase B (Infusões) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Artífice o sistema **Infundir Item** como rastreamento na ficha: escolher infusões conhecidas (até um cap por nível) e marcar as ativas, cada ativa ligada a um item do inventário (até um cap por nível), mostrando a descrição — sem auto-aplicar efeitos.

**Architecture:** Catálogo `tasha-infusions-pt.json` mesclado pelo `SrdProvider` (mecanismo `COMPOSED`, lazy). Caps e estado derivam de funções puras em `domain/artificerInfusions.js`. Estado persiste em `combat.artificerInfusions = { known, active }`. UI: painel só na Ficha (Artífice nv≥2), persistindo via `updateCombat('artificerInfusions', …)`.

**Tech Stack:** React + Vite, Zod, Vitest + @testing-library/react, Python + pymupdf (esteira em `scripts/tasha/`). Base: [spec da Fase B](../specs/2026-06-24-artifice-infusoes-design.md), [spike](../notes/2026-06-23-artifice-spike.md).

**Fatos confirmados (não re-derivar):**
- Caps por nível de Artífice — Conhecidas: 0(nv1), 4(2–5), 6(6–9), 8(10–13), 10(14–17), 12(18–20). Itens infundidos: 0(nv1), 2(2–5), 3(6–9), 4(10–13), 5(14–17), 6(18–20).
- `combatSchema` está em `src/systems/dnd5e/domain/characterSchema.js` (~linha 156). O padrão de default por campo já é usado (ex.: `settings.sources` via `.default([])`) — usar o mesmo, sem bump de SCHEMA_VERSION.
- Updater da ficha: `updateCombat(field, value)` (de `useCharacterContext().updaters`) grava `combat[field] = value` e persiste. Painéis montam em `SheetContent.jsx`.
- `SrdProvider` já tem `COMPOSED` (estratégia array|objeto) + `loadComposed`; `feats` é composto lazy. Espelhar pra `infusions`.
- Conteúdo-fonte: PDF do Tasha, seção "Infusões de Artífice" a partir da página (0-indexada) ~18. Cada infusão: nome em linha própria, linha "Item: <tipo>" e às vezes "Pré-requisito: nível N de artífice". Extração UTF-8 limpa.
- Procedência: `sourceOf`/`filterCatalogBySources`/`SourceBadge` já existem em `domain/sources.js` / `components/SourceBadge.jsx`.

---

## Estrutura de arquivos

**Criar:**
- `src/systems/dnd5e/domain/artificerInfusions.js` — funções puras: `getInfusionCaps(level)`, `artificerLevelOf(character)`, `availableInfusions(catalog, level, sources)`, `pruneOrphanActive(active, itemIds)`.
- `public/srd-data/tasha-infusions-pt.json` — catálogo (gerado por script).
- `scripts/tasha/build_infusions.py` — extrai/estrutura as infusões.
- `src/systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel.jsx` — painel.
- Testes: `src/test/dnd5e/artificer-infusions-caps.test.js`, `tasha-infusions-schema.test.js`, `artificer-infusions-logic.test.js`, `ArtificerInfusionsPanel.test.jsx`.

**Modificar:**
- `src/systems/dnd5e/domain/characterSchema.js` — `combat.artificerInfusions`.
- `src/systems/dnd5e/data/SrdProvider.jsx` — compor `infusions` (lazy).
- `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` — montar o painel.
- `vite.config.js` — bump `cacheName`.

---

## Task B1: Caps e nível de Artífice (funções puras)

**Files:**
- Create: `src/systems/dnd5e/domain/artificerInfusions.js`
- Test: `src/test/dnd5e/artificer-infusions-caps.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/artificer-infusions-caps.test.js
import { describe, it, expect } from 'vitest'
import { getInfusionCaps, artificerLevelOf } from '../../systems/dnd5e/domain/artificerInfusions'

describe('getInfusionCaps', () => {
  it('nv1 = sem infusões', () => expect(getInfusionCaps(1)).toEqual({ known: 0, active: 0 }))
  it('nv2 = 4 conhecidas / 2 ativas', () => expect(getInfusionCaps(2)).toEqual({ known: 4, active: 2 }))
  it('nv6 = 6 / 3', () => expect(getInfusionCaps(6)).toEqual({ known: 6, active: 3 }))
  it('nv10 = 8 / 4', () => expect(getInfusionCaps(10)).toEqual({ known: 8, active: 4 }))
  it('nv14 = 10 / 5', () => expect(getInfusionCaps(14)).toEqual({ known: 10, active: 5 }))
  it('nv18 = 12 / 6', () => expect(getInfusionCaps(18)).toEqual({ known: 12, active: 6 }))
})

describe('artificerLevelOf', () => {
  it('classe primária Artífice usa info.level', () => {
    expect(artificerLevelOf({ info: { class: 'artifice', level: 5, multiclasses: [] } })).toBe(5)
  })
  it('Artífice em multiclasse usa o nível DA classe', () => {
    expect(artificerLevelOf({ info: { class: 'mago', level: 3, multiclasses: [{ class: 'artifice', level: 4 }] } })).toBe(4)
  })
  it('sem Artífice = 0', () => {
    expect(artificerLevelOf({ info: { class: 'mago', level: 3, multiclasses: [] } })).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** — `npm test -- src/test/dnd5e/artificer-infusions-caps.test.js`.

- [ ] **Step 3: Implementar**

```js
// src/systems/dnd5e/domain/artificerInfusions.js
/** Caps de infusões (conhecidas/ativas) por nível de Artífice — tabela O Artífice. */
export function getInfusionCaps(artificerLevel) {
  const L = Number(artificerLevel) || 0
  if (L < 2) return { known: 0, active: 0 }
  if (L < 6) return { known: 4, active: 2 }
  if (L < 10) return { known: 6, active: 3 }
  if (L < 14) return { known: 8, active: 4 }
  if (L < 18) return { known: 10, active: 5 }
  return { known: 12, active: 6 }
}

/** Nível NA classe Artífice (primária ou multiclasse); 0 se não for Artífice. */
export function artificerLevelOf(character) {
  const info = character?.info ?? {}
  if (info.class === 'artifice') return info.level ?? 0
  const mc = (info.multiclasses ?? []).find(m => m.class === 'artifice')
  return mc?.level ?? 0
}
```

- [ ] **Step 4: Rodar, ver passar.**

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/artificerInfusions.js src/test/dnd5e/artificer-infusions-caps.test.js
git commit -m "feat(dnd5e): caps de infusões + nível de Artífice (funções puras)"
git push
```

---

## Task B2: Schema — combat.artificerInfusions

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js` (combatSchema)
- Test: `src/test/dnd5e/artificer-infusions-schema-default.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/artificer-infusions-schema-default.test.js
import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'

function minimal(overrides = {}) {
  return {
    id: 'c1', meta: { createdAt: 'x', updatedAt: 'x' },
    info: { name: 'T' }, attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
    proficiencies: {}, inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    ...overrides,
  }
}

describe('combat.artificerInfusions default', () => {
  it('ficha legada materializa { known: [], active: [] }', () => {
    const res = safeParseCharacter(minimal())
    expect(res.success).toBe(true)
    expect(res.data.combat.artificerInfusions).toEqual({ known: [], active: [] })
  })
  it('preserva valores declarados', () => {
    const res = safeParseCharacter(minimal({
      combat: { maxHp: 10, currentHp: 10, armorClass: 10,
        artificerInfusions: { known: ['arma-aprimorada'], active: [{ infusion: 'arma-aprimorada', itemId: 'i1' }] } },
    }))
    expect(res.data.combat.artificerInfusions.known).toEqual(['arma-aprimorada'])
    expect(res.data.combat.artificerInfusions.active[0]).toEqual({ infusion: 'arma-aprimorada', itemId: 'i1' })
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** (ajuste `minimal` se o Zod apontar campo obrigatório faltando — complete até falhar especificamente em `artificerInfusions`).

- [ ] **Step 3: Implementar** — em `characterSchema.js`, dentro de `combatSchema = z.object({ ... })`, adicionar o campo (seguindo o estilo dos outros campos do combat):

```js
  artificerInfusions: z.object({
    known: z.array(z.string()).default([]),
    active: z.array(z.object({
      infusion: z.string(),
      itemId: z.string(),
    })).default([]),
  }).default({ known: [], active: [] }),
```

Se `combatSchema` usar `.passthrough()` ou não tiver `.default` no objeto-pai, garantir que o default materialize mesmo quando `combat` não traz `artificerInfusions` (o `.default(...)` no campo resolve isso, como em `settings.sources`).

- [ ] **Step 4: Rodar, ver passar** + regressão `npm test -- src/test/ -t "schema"`.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/characterSchema.js src/test/dnd5e/artificer-infusions-schema-default.test.js
git commit -m "feat(dnd5e): combat.artificerInfusions no schema (default vazio)"
git push
```

---

## Task B3: Extrair o catálogo de infusões

**Files:**
- Create: `scripts/tasha/build_infusions.py`
- Create: `public/srd-data/tasha-infusions-pt.json`
- Test: `src/test/dnd5e/tasha-infusions-schema.test.js`

> Espelhar `scripts/tasha/build_feats.py`/`build_artificer.py`. Seção "Infusões de Artífice" no PDF a partir da p18 (0-indexada). Inspecionar com `extract_text.py` pra achar o intervalo exato de páginas. Cada infusão: nome (linha própria) + "Item: <tipo>" + opcional "Pré-requisito: <nível>º nível de artífice" + corpo. Aplicar a `normalize_glyphs` já existente (reuso de `build_artificer.py` ou recriar a função).

- [ ] **Step 1: Escrever `build_infusions.py`** que produz `public/srd-data/tasha-infusions-pt.json`, array de:
```
{ "index": slug(name), "name", "prereq": <int nível, default 2>, "itemType": <texto do "Item:">, "requiresAttunement": <bool, do "(requer sintonização)">, "desc": <corpo>, "source": "tasha" }
```
Âncora: cada infusão começa num nome de linha própria seguido (em até 2 linhas) por "Item:". `prereq`: ler de "Pré-requisito: Nº nível de artífice" quando houver (senão 2). `requiresAttunement`: true se o "Item:" contiver "requer sintonização". `desc`: junta linhas até a próxima infusão, sem ruído de rodapé.

- [ ] **Step 2: Gerar e revisar**
```bash
PDF="C:/Users/gvfar/OneDrive/RPG BIGBIG/D&D 5e - Caldeirão de Tasha para Tudo (Versão Fã) (1).pdf"
python scripts/tasha/build_infusions.py "$PDF"
```
Revisar com a tool Read: nomes corretos, `prereq` numérico, `itemType` presente, descrições limpas e acentuadas, sem `ld8`/`+ l`.

- [ ] **Step 3: Teste de schema** — `src/test/dnd5e/tasha-infusions-schema.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const inf = JSON.parse(readFileSync(resolve(process.cwd(), 'public/srd-data/tasha-infusions-pt.json'), 'utf-8'))

describe('tasha-infusions-pt.json', () => {
  it('não vazio', () => { expect(Array.isArray(inf)).toBe(true); expect(inf.length).toBeGreaterThan(0) })
  it('campos por item', () => {
    for (const i of inf) {
      expect(i.index).toMatch(/^[a-z0-9-]+$/)
      expect(typeof i.name).toBe('string')
      expect(typeof i.desc).toBe('string'); expect(i.desc.length).toBeGreaterThan(10)
      expect(Number.isInteger(i.prereq)).toBe(true)
      expect(i.source).toBe('tasha')
    }
  })
  it('índices únicos', () => {
    const ix = inf.map(i => i.index); expect(new Set(ix).size).toBe(ix.length)
  })
  it('sem ruído/glifo', () => {
    const s = JSON.stringify(inf)
    expect(s).not.toMatch(/-----\s*p\.\d+/); expect(s).not.toMatch(/\bld\d/); expect(s).not.toMatch(/\+ l\b/)
  })
})
```

- [ ] **Step 4: Rodar** — corrigir JSON/script até passar.

- [ ] **Step 5: Commit**
```bash
git add scripts/tasha/build_infusions.py public/srd-data/tasha-infusions-pt.json src/test/dnd5e/tasha-infusions-schema.test.js
git commit -m "feat(tasha): catálogo de infusões do Artífice (tasha-infusions-pt.json)"
git push
```

---

## Task B4: SrdProvider compõe `infusions` (lazy)

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`
- Test: `src/test/dnd5e/SrdProvider-infusions.test.jsx`

- [ ] **Step 1: Teste que falha**

```jsx
// src/test/dnd5e/SrdProvider-infusions.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useLazySrdDataset } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const inf = useLazySrdDataset('infusions')
  return <div data-testid="inf">{(inf ?? []).map(i => `${i.index}:${i.source}`).join(',')}</div>
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const body = String(url).includes('tasha-infusions') ? [{ index: 'arma-aprimorada', name: 'Arma', source: 'tasha' }] : []
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})
describe('SrdProvider — infusions', () => {
  it('carrega infusions carimbado tasha', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => expect(screen.getByTestId('inf').textContent).toContain('arma-aprimorada:tasha'))
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** — em `SrdProvider.jsx`:
  - Adicionar parte ao `DATASETS`: `infusionsTasha: { pt: 'tasha-infusions-pt.json', fallback: null, lazy: true }`.
  - Adicionar ao `COMPOSED`: `infusions: { strategy: 'array', parts: [['infusionsTasha', 'tasha']] }` (só Tasha — não há infusões PHB).
  - `EMPTY_DEFAULTS.infusions = []`.
  - Confirmar que `requestDataset('infusions')`/`useLazySrdDataset('infusions')` passam pelo ramo composto (já implementado pra feats). Como é lazy, não entra no boot.

- [ ] **Step 4: Rodar, ver passar** + `npm test -- src/test/dnd5e/SrdProvider-composed.test.jsx` (não regredir).

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/SrdProvider-infusions.test.jsx
git commit -m "feat(dnd5e): SrdProvider expõe dataset lazy de infusões (tasha)"
git push
```

---

## Task B5: Lógica do painel (oferta, órfãos)

**Files:**
- Modify: `src/systems/dnd5e/domain/artificerInfusions.js`
- Test: `src/test/dnd5e/artificer-infusions-logic.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/artificer-infusions-logic.test.js
import { describe, it, expect } from 'vitest'
import { availableInfusions, pruneOrphanActive } from '../../systems/dnd5e/domain/artificerInfusions'

const catalog = [
  { index: 'a', name: 'A', prereq: 2, source: 'tasha' },
  { index: 'b', name: 'B', prereq: 6, source: 'tasha' },
  { index: 'phb-x', name: 'X', prereq: 2, source: 'phb' },
]

describe('availableInfusions', () => {
  it('filtra por nível e por fonte ativa', () => {
    // nv5, fonte tasha: 'a' (prereq2) sim, 'b' (prereq6) não, phb-x sim (phb sempre)
    expect(availableInfusions(catalog, 5, ['phb', 'tasha']).map(i => i.index)).toEqual(['a', 'phb-x'])
  })
  it('sem tasha: some infusão tasha', () => {
    expect(availableInfusions(catalog, 20, ['phb']).map(i => i.index)).toEqual(['phb-x'])
  })
})

describe('pruneOrphanActive', () => {
  it('remove ativas cujo item não existe mais', () => {
    const active = [{ infusion: 'a', itemId: 'i1' }, { infusion: 'b', itemId: 'gone' }]
    expect(pruneOrphanActive(active, ['i1'])).toEqual([{ infusion: 'a', itemId: 'i1' }])
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** — adicionar a `artificerInfusions.js`:

```js
import { filterCatalogBySources } from './sources'

/** Infusões oferecíveis: pré-requisito de nível ≤ nível, gateadas pela fonte. */
export function availableInfusions(catalog, artificerLevel, activeSources) {
  const L = Number(artificerLevel) || 0
  const bySource = filterCatalogBySources(catalog ?? [], activeSources)
  return bySource.filter(i => (i.prereq ?? 2) <= L)
}

/** Remove infusões ativas cujo item não está mais no inventário. */
export function pruneOrphanActive(active, inventoryItemIds) {
  const ids = new Set(inventoryItemIds ?? [])
  return (active ?? []).filter(a => ids.has(a.itemId))
}
```

- [ ] **Step 4: Rodar, ver passar.**

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/domain/artificerInfusions.js src/test/dnd5e/artificer-infusions-logic.test.js
git commit -m "feat(dnd5e): lógica de oferta de infusões + limpeza de órfãos"
git push
```

---

## Task B6: Componente ArtificerInfusionsPanel

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel.jsx`
- Test: `src/test/dnd5e/ArtificerInfusionsPanel.test.jsx`

> Componente controlado: recebe `value` (`{ known, active }`), `catalog`, `artificerLevel`, `activeSources`, `inventoryItems` (`[{id,name}]`), `onChange(next)`, `readOnly`. Sem acesso a contexto — testável isolado.

- [ ] **Step 1: Teste que falha**

```jsx
// src/test/dnd5e/ArtificerInfusionsPanel.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtificerInfusionsPanel } from '../../systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel'

const catalog = [
  { index: 'a', name: 'Arma Aprimorada', prereq: 2, itemType: 'arma', desc: 'desc A', source: 'tasha' },
  { index: 'b', name: 'Bota Veloz', prereq: 2, itemType: 'botas', desc: 'desc B', source: 'tasha' },
]
const base = {
  catalog, artificerLevel: 2, activeSources: ['phb', 'tasha'],
  inventoryItems: [{ id: 'i1', name: 'Espada' }],
}

describe('ArtificerInfusionsPanel', () => {
  it('mostra cap de conhecidas e permite adicionar', () => {
    const onChange = vi.fn()
    render(<ArtificerInfusionsPanel value={{ known: [], active: [] }} onChange={onChange} {...base} />)
    expect(screen.getByText(/0\s*\/\s*4/)).toBeInTheDocument() // conhecidas 0/4 no nv2
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Arma Aprimorada/i }))
    expect(onChange).toHaveBeenCalledWith({ known: ['a'], active: [] })
  })

  it('no cap de conhecidas, bloqueia adicionar', () => {
    const onChange = vi.fn()
    const four = { known: ['a', 'b', 'c', 'd'], active: [] }
    render(<ArtificerInfusionsPanel value={four} onChange={onChange}
      {...base} catalog={[...catalog, { index: 'c', name: 'C', prereq: 2, desc: 'c', source: 'tasha' }, { index: 'd', name: 'D', prereq: 2, desc: 'd', source: 'tasha' }, { index: 'e', name: 'E', prereq: 2, desc: 'e', source: 'tasha' }]} />)
    const addE = screen.getByRole('button', { name: /Adicionar E/i })
    expect(addE).toBeDisabled()
  })

  it('atribui infusão conhecida a um item (ativa)', () => {
    const onChange = vi.fn()
    render(<ArtificerInfusionsPanel value={{ known: ['a'], active: [] }} onChange={onChange} {...base} />)
    fireEvent.change(screen.getByLabelText(/Item para Arma Aprimorada/i), { target: { value: 'i1' } })
    expect(onChange).toHaveBeenCalledWith({ known: ['a'], active: [{ infusion: 'a', itemId: 'i1' }] })
  })

  it('readOnly desabilita ações', () => {
    render(<ArtificerInfusionsPanel value={{ known: ['a'], active: [] }} onChange={() => {}} {...base} readOnly />)
    expect(screen.getByRole('button', { name: /Adicionar Bota Veloz/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** o componente. Requisitos:
  - Importa `getInfusionCaps`, `availableInfusions` de `../../domain/artificerInfusions` e `SourceBadge` de `../SourceBadge`.
  - `caps = getInfusionCaps(artificerLevel)`.
  - Seção **Conhecidas**: mostra `known.length / caps.known`. Lista `availableInfusions(catalog, artificerLevel, activeSources)`; cada item tem botão "Adicionar <nome>" (aria-label) que emite `onChange({ ...value, known: [...known, idx] })`; desabilitado se `known.includes(idx)`, se `known.length >= caps.known`, ou `readOnly`. Itens já conhecidos mostram botão "Remover <nome>" → `onChange({ known: known.filter(...), active: active.filter(a => a.infusion !== idx) })` (remover conhecida tira a ativa também). Mostra `desc` + `<SourceBadge source={i.source} />`.
  - Seção **Ativas (Itens Infundidos)**: mostra `active.length / caps.active`. Para cada infusão CONHECIDA, um `<select aria-label="Item para <nome>">` com opções `['', ...inventoryItems]` (label = item.name; value = item.id); valor atual = itemId da ativa correspondente (ou ''). `onChange`: ao escolher item, adiciona/atualiza `{ infusion: idx, itemId }` em `active` (respeitando `caps.active` — se já no cap e a infusão ainda não é ativa, o select fica desabilitado); ao escolher '' remove a ativa daquela infusão. `readOnly` desabilita os selects.
  - Sem efeitos colaterais fora de `onChange` (componente controlado).

- [ ] **Step 4: Rodar, ver passar (4/4).**

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel.jsx src/test/dnd5e/ArtificerInfusionsPanel.test.jsx
git commit -m "feat(dnd5e): ArtificerInfusionsPanel (conhecidas/ativas com caps)"
git push
```

---

## Task B7: Montar o painel na Ficha

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx`
- Test: manual (`npm run dev`) + suíte completa

> Renderiza só pra Artífice nv≥2. Lê catálogo lazy, nível, fontes, itens; persiste via `updateCombat`. Limpa órfãos na leitura.

- [ ] **Step 1: Implementar** em `SheetContent.jsx`:
  - Importar: `ArtificerInfusionsPanel`, `artificerLevelOf`, `pruneOrphanActive` (de `../../domain/artificerInfusions`), e `useLazySrdDataset`.
  - `const artLevel = artificerLevelOf(character)`.
  - `const infusionsCatalog = useLazySrdDataset('infusions')` (dispara o fetch lazy).
  - Sources: `character.meta?.settings?.sources ?? ['phb']`. Itens: `(character.inventory?.items ?? []).map(i => ({ id: i.id, name: i.name }))`.
  - Estado atual: `const stored = character.combat?.artificerInfusions ?? { known: [], active: [] }`. Limpar órfãos: `const value = { known: stored.known, active: pruneOrphanActive(stored.active, items.map(i => i.id)) }`.
  - Renderizar, dentro do bloco da aba "ficha" (coluna direita, junto dos outros painéis — ex.: perto de `CombatClassActions`), SÓ quando `artLevel >= 2`:
    ```jsx
    {artLevel >= 2 && (
      <CollapsibleSection title="Infusões de Artífice" defaultOpen={false}>
        <div className="p-4">
          <ArtificerInfusionsPanel
            value={value}
            catalog={infusionsCatalog ?? []}
            artificerLevel={artLevel}
            activeSources={character.meta?.settings?.sources ?? ['phb']}
            inventoryItems={items}
            readOnly={readOnly}
            onChange={(next) => updateCombat('artificerInfusions', next)}
          />
        </div>
      </CollapsibleSection>
    )}
    ```
    (Usar o `CollapsibleSection` local do `SheetContent`, como o controle de Fontes.)

- [ ] **Step 2: Suíte** — `npm test` (sem regressão; painel novo é aditivo e gateado por nível).

- [ ] **Step 3: Verificação manual** (`npm run dev`): Artífice nv3 com Tasha → painel "Infusões de Artífice" aparece; adicionar conhecidas até o cap (bloqueia no cap); atribuir uma a um item do inventário; remover o item do inventário → a ativa volta a "não atribuída". Não-Artífice / Artífice nv1 → painel ausente.

- [ ] **Step 4: Commit**
```bash
git add src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx
git commit -m "feat(dnd5e): painel de Infusões na Ficha (Artífice nv2+), persiste em combat"
git push
```

---

## Task B8: Bump do cache do service worker

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Bump** `cacheName: 'srd-data-v9'` → `'srd-data-v10'` + linha de histórico (`v9 → v10 (2026-XX): catálogo de infusões do Artífice`).

- [ ] **Step 2: Build** — `npm run build` (exit 0; `tasha-infusions-pt.json` no precache).

- [ ] **Step 3: Commit**
```bash
git add vite.config.js
git commit -m "chore(pwa): bump srd-data cache v9->v10 (infusões)"
git push
```

---

## Verificação final da Fase B

- [ ] `npm test` — suíte inteira verde.
- [ ] `npm run build` — limpo, cache `v10`, `tasha-infusions-pt.json` no precache.
- [ ] `npm run dev` — fluxo manual do painel (Task B7 Step 3) ok.
- [ ] Ficha legada / não-Artífice intacta (painel ausente, `combat.artificerInfusions` default vazio não atrapalha).

## Fora desta fase

- Fase C (teto de sintonia, Lampejo de Genialidade como recurso, Item de Armazenar Magia).
- Auto-aplicar efeitos das infusões.
- Gerenciar infusões no Wizard.
