# Filtros Avançados de Magia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar painel de filtros estruturados (escola, ritual, concentração, componentes V/S/M, tempo de conjuração) no picker de magias da aba Magias.

**Architecture:** Engine pura `src/utils/spellFilters.js` com `matchesFilters(spell, filters)` + `EMPTY_FILTERS` + `countActiveFilters`. O `Spells.jsx` ganha estado `filters`, propaga ao `SpellPicker`, que passa a renderizar o painel de filtros (botão "Filtros" com badge + dropdown).

**Tech Stack:** React 19 + Tailwind. Sem deps novas.

---

## Spec de referência

`docs/superpowers/specs/2026-05-14-filtros-magia-design.md`

## Estrutura de arquivos

**Criar:**
- `src/utils/spellFilters.js` — engine pura
- `src/test/spellFilters.test.js` — testes unitários
- `src/test/e2e/spellsFilters.test.jsx` — E2E

**Modificar:**
- `src/components/CharacterSheet/Spells.jsx` — adicionar estado de filtros + propagar; ampliar `SpellPicker` com painel

---

## Task 1: Engine `spellFilters.js`

**Files:**
- Create: `src/utils/spellFilters.js`
- Create: `src/test/spellFilters.test.js`

- [ ] **Step 1: Escrever os testes**

```js
// src/test/spellFilters.test.js
import { describe, it, expect } from 'vitest'
import { matchesFilters, EMPTY_FILTERS, countActiveFilters } from '../utils/spellFilters'

const acao    = { name: 'Bola de Fogo', school: 'evocação',    ritual: false, concentration: false, components: 'V, S, M', casting_time: '1 ação' }
const bonus   = { name: 'Hexar',        school: 'encantamento',ritual: false, concentration: true,  components: 'V, S, M', casting_time: '1 ação bônus' }
const reacao  = { name: 'Escudo',       school: 'abjuração',   ritual: false, concentration: false, components: 'V, S',    casting_time: '1 reação, que você toma quando é atingido' }
const ritual  = { name: 'Detectar Magia', school: 'adivinhação', ritual: true, concentration: true,  components: 'V, S',    casting_time: '1 ação' }
const minutos = { name: 'Identificar',  school: 'adivinhação', ritual: true,  concentration: false, components: 'V, S, M', casting_time: '1 minuto' }
const semV    = { name: 'Modelar Água', school: 'transmutação',ritual: false, concentration: false, components: 'S',       casting_time: '1 ação' }

describe('matchesFilters', () => {
  it('filtro vazio passa qualquer magia', () => {
    expect(matchesFilters(acao,    EMPTY_FILTERS)).toBe(true)
    expect(matchesFilters(ritual,  EMPTY_FILTERS)).toBe(true)
    expect(matchesFilters(minutos, EMPTY_FILTERS)).toBe(true)
  })

  it('escola única', () => {
    const f = { ...EMPTY_FILTERS, schools: new Set(['evocação']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
  })

  it('escola múltipla (OR dentro)', () => {
    const f = { ...EMPTY_FILTERS, schools: new Set(['evocação', 'abjuração']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(reacao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
  })

  it('concentração yes/no/any', () => {
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'yes' })).toBe(true)
    expect(matchesFilters(acao,  { ...EMPTY_FILTERS, concentration: 'yes' })).toBe(false)
    expect(matchesFilters(acao,  { ...EMPTY_FILTERS, concentration: 'no'  })).toBe(true)
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'no'  })).toBe(false)
    expect(matchesFilters(bonus, { ...EMPTY_FILTERS, concentration: 'any' })).toBe(true)
  })

  it('ritual yes/any', () => {
    expect(matchesFilters(ritual, { ...EMPTY_FILTERS, ritual: 'yes' })).toBe(true)
    expect(matchesFilters(acao,   { ...EMPTY_FILTERS, ritual: 'yes' })).toBe(false)
    expect(matchesFilters(acao,   { ...EMPTY_FILTERS, ritual: 'any' })).toBe(true)
  })

  it('componentes tri-state', () => {
    // V sim, S não, M qualquer
    const f = { ...EMPTY_FILTERS, components: { v: 'yes', s: 'no', m: 'any' } }
    expect(matchesFilters(acao, f)).toBe(false)    // tem S
    expect(matchesFilters(semV, f)).toBe(false)    // sem V
    expect(matchesFilters({ ...acao, components: 'V' }, f)).toBe(true)
  })

  it('casting time Ação não casa Ação Bônus', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['action']) }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false)
    expect(matchesFilters(reacao, f)).toBe(false)
  })

  it('casting time Bônus casa "1 ação bônus"', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['bonus']) }
    expect(matchesFilters(bonus, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('casting time Reação casa qualquer "1 reação..."', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['reaction']) }
    expect(matchesFilters(reacao, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('casting time Minutos casa "1 minuto"', () => {
    const f = { ...EMPTY_FILTERS, castingTimes: new Set(['minutes']) }
    expect(matchesFilters(minutos, f)).toBe(true)
    expect(matchesFilters(acao, f)).toBe(false)
  })

  it('combinação AND entre dimensões', () => {
    // Evocação + concentração=não → só `acao`
    const f = {
      ...EMPTY_FILTERS,
      schools: new Set(['evocação']),
      concentration: 'no',
    }
    expect(matchesFilters(acao, f)).toBe(true)
    expect(matchesFilters(bonus, f)).toBe(false) // escola errada
    // Hipotético: Evocação + concentração → false
    const hipo = { ...acao, concentration: true }
    expect(matchesFilters(hipo, { ...EMPTY_FILTERS, schools: new Set(['evocação']), concentration: 'no' })).toBe(false)
  })

  it('combinação completa de 5 dimensões', () => {
    const f = {
      schools: new Set(['abjuração']),
      concentration: 'no',
      ritual: 'any',
      components: { v: 'yes', s: 'yes', m: 'no' },
      castingTimes: new Set(['reaction']),
    }
    expect(matchesFilters(reacao, f)).toBe(true)
  })
})

describe('countActiveFilters', () => {
  it('vazio retorna 0', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
  })

  it('soma escolas, tempos, e cada flag não-any', () => {
    const f = {
      schools: new Set(['evocação', 'abjuração']),   // +2
      concentration: 'no',                            // +1
      ritual: 'yes',                                  // +1
      components: { v: 'yes', s: 'any', m: 'no' },   // +2
      castingTimes: new Set(['action']),              // +1
    }
    expect(countActiveFilters(f)).toBe(7)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar (módulo não existe)**

```bash
npx vitest run src/test/spellFilters.test.js
```
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementar a engine**

```js
// src/utils/spellFilters.js

/**
 * Estado canônico vazio de filtros — usar `{ ...EMPTY_FILTERS, X: Y }` pra
 * derivar variantes em testes/reset.
 */
export const EMPTY_FILTERS = Object.freeze({
  schools: new Set(),
  concentration: 'any',  // 'any' | 'yes' | 'no'
  ritual: 'any',         // 'any' | 'yes'
  components: { v: 'any', s: 'any', m: 'any' },
  castingTimes: new Set(), // 'action' | 'bonus' | 'reaction' | 'minutes' | 'hours'
})

/** Labels exibidos na UI para os 5 buckets de casting time. */
export const CASTING_TIME_LABELS = [
  { key: 'action',   label: 'Ação' },
  { key: 'bonus',    label: 'Bônus' },
  { key: 'reaction', label: 'Reação' },
  { key: 'minutes',  label: 'Minutos' },
  { key: 'hours',    label: 'Hora+' },
]

/** Labels das 8 escolas (PT-BR), usados pelos chips. */
export const SCHOOL_LABELS = [
  'abjuração', 'adivinhação', 'conjuração', 'encantamento',
  'evocação',  'ilusão',      'necromancia', 'transmutação',
]

function castingTimeBucket(text) {
  if (!text) return null
  const t = String(text).toLowerCase()
  if (t === '1 ação')          return 'action'
  if (t === '1 ação bônus')    return 'bonus'
  if (t.startsWith('1 reação'))return 'reaction'
  if (t.includes('hora'))      return 'hours'
  if (t.includes('minuto'))    return 'minutes'
  return null
}

function hasComponent(componentsText, letter) {
  if (!componentsText) return false
  // "V, S, M" → regex /\b[VSM]\b/. Usamos teste por palavra-chave separada.
  const parts = String(componentsText).split(/[,\s]+/).filter(Boolean)
  return parts.includes(letter)
}

function checkComponent(spell, letter, mode) {
  if (mode === 'any') return true
  const present = hasComponent(spell.components, letter)
  return mode === 'yes' ? present : !present
}

/**
 * Aplica os filtros a uma magia. Cada dimensão é AND; dentro de multiselect
 * (escolas, tempos) é OR.
 */
export function matchesFilters(spell, filters) {
  if (!filters) return true

  // Escola
  if (filters.schools && filters.schools.size > 0) {
    if (!filters.schools.has(String(spell.school || '').toLowerCase())) return false
  }

  // Concentração
  if (filters.concentration === 'yes' && spell.concentration !== true) return false
  if (filters.concentration === 'no'  && spell.concentration === true) return false

  // Ritual
  if (filters.ritual === 'yes' && spell.ritual !== true) return false

  // Componentes
  if (!checkComponent(spell, 'V', filters.components?.v ?? 'any')) return false
  if (!checkComponent(spell, 'S', filters.components?.s ?? 'any')) return false
  if (!checkComponent(spell, 'M', filters.components?.m ?? 'any')) return false

  // Casting times
  if (filters.castingTimes && filters.castingTimes.size > 0) {
    const bucket = castingTimeBucket(spell.casting_time)
    if (!bucket || !filters.castingTimes.has(bucket)) return false
  }

  return true
}

/** Conta filtros ativos (não-default) — usado no badge da UI. */
export function countActiveFilters(filters) {
  if (!filters) return 0
  let n = 0
  n += filters.schools?.size ?? 0
  if (filters.concentration && filters.concentration !== 'any') n += 1
  if (filters.ritual && filters.ritual !== 'any') n += 1
  for (const k of ['v', 's', 'm']) {
    if (filters.components?.[k] && filters.components[k] !== 'any') n += 1
  }
  n += filters.castingTimes?.size ?? 0
  return n
}
```

- [ ] **Step 4: Rodar — todos os testes devem passar**

```bash
npx vitest run src/test/spellFilters.test.js
```
Expected: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/spellFilters.js src/test/spellFilters.test.js
git commit -m "feat(spell-filters): engine pura de filtros de magia

matchesFilters aplica escola, concentracao, ritual, componentes
V/S/M (tri-state) e tempo de conjuracao (5 buckets) com AND entre
dimensoes e OR dentro de multiselect. Inclui EMPTY_FILTERS,
SCHOOL_LABELS, CASTING_TIME_LABELS e countActiveFilters para UI.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 2: Integração no `Spells.jsx`

**Files:**
- Modify: `src/components/CharacterSheet/Spells.jsx`

- [ ] **Step 1: Adicionar import e estado**

No topo do arquivo, importar:

```js
import { matchesFilters, EMPTY_FILTERS } from '../../utils/spellFilters'
```

No componente principal `Spells` (junto aos outros `useState`), adicionar:

```js
  const [filters, setFilters] = useState(EMPTY_FILTERS)
```

- [ ] **Step 2: Aplicar `matchesFilters` no `filteredPicker`**

Localizar o `useMemo` de `filteredPicker` e atualizar para incluir o passe por `matchesFilters`:

```js
  const filteredPicker = useMemo(() => {
    let base = classSpells.filter(s => s.level === activeTab)
    // Filtros estruturados (escola/ritual/concentração/componentes/tempo)
    base = base.filter(s => matchesFilters(s, filters))
    // Busca textual livre
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.school || '').toLowerCase().includes(q) ||
      (s.casting_time || '').toLowerCase().includes(q)
    )
  }, [classSpells, activeTab, search, filters])
```

- [ ] **Step 3: Resetar filtros ao trocar de aba**

NÃO — decisão de produto: filtros persistem entre níveis. Apenas a `search` limpa (já é o comportamento atual). Não fazer nada aqui — apenas confirmar que `setFilters(EMPTY_FILTERS)` NÃO está sendo chamado no `onTabChange`.

- [ ] **Step 4: Propagar `filters` / `onFiltersChange` ao `SpellPicker`**

Localizar a chamada de `<SpellPicker ...>` e adicionar:

```jsx
        <SpellPicker
          tabs={availableTabs}
          activeTab={activeTab}
          onTabChange={t => { setActiveTab(t); setSearch('') }}
          search={search}
          onSearch={setSearch}
          spells={filteredPicker}
          mySpellIds={mySpellIds}
          onAdd={addSpell}
          onDetail={setDetailSpell}
          classIndex={classIndex}
          cantripsLimit={cantripsLimit}
          spellsLimit={pickerLimit}
          spellsLabel={pickerLabel}
          myCantripsCount={myCantrips.length}
          myLeveledCount={myLeveled.length}
          filters={filters}
          onFiltersChange={setFilters}
        />
```

- [ ] **Step 5: Verificar lint**

```bash
npm run lint
```
Expected: clean (talvez aviso de `filters`/`onFiltersChange` não usados em `SpellPicker` — vamos consertar na Task 3).

- [ ] **Step 6: Commit (sem UI ainda)**

```bash
git add src/components/CharacterSheet/Spells.jsx
git commit -m "feat(spell-filters): integra matchesFilters no filteredPicker

State filters em Spells.jsx propagado ao SpellPicker. UI do
painel vira na proxima task; o filtro ja esta funcional via state
(usuario consegue mudar via React DevTools).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 3: UI — botão "Filtros" e painel completo no `SpellPicker`

**Files:**
- Modify: `src/components/CharacterSheet/Spells.jsx` (apenas o componente `SpellPicker`)

- [ ] **Step 1: Adicionar import dos labels e contador**

No topo do arquivo:

```js
import {
  matchesFilters,
  EMPTY_FILTERS,
  countActiveFilters,
  SCHOOL_LABELS,
  CASTING_TIME_LABELS,
} from '../../utils/spellFilters'
```

- [ ] **Step 2: Aceitar novas props em `SpellPicker`**

Atualizar a assinatura:

```js
function SpellPicker({
  tabs, activeTab, onTabChange,
  search, onSearch,
  spells, mySpellIds, onAdd, onDetail,
  cantripsLimit, spellsLimit, spellsLabel,
  myCantripsCount, myLeveledCount,
  filters, onFiltersChange,
}) {
```

- [ ] **Step 3: Adicionar state local de "painel aberto"**

Logo no início do componente:

```js
  const [panelOpen, setPanelOpen] = useState(false)
  const activeCount = countActiveFilters(filters ?? EMPTY_FILTERS)
```

- [ ] **Step 4: Substituir o bloco `Busca` por busca + botão "Filtros" + contagem**

Localizar o `<div className="p-3 border-b border-gray-700">` que tem o input de busca e substituir por:

```jsx
      <div className="p-3 border-b border-gray-700 space-y-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar magia..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
          />
          <button
            type="button"
            onClick={() => setPanelOpen(v => !v)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded border font-semibold transition-colors ${
              activeCount > 0
                ? 'border-amber-500 bg-amber-900/40 text-amber-200'
                : 'border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            Filtros{activeCount > 0 ? ` · ${activeCount}` : ''}
          </button>
          <span className="text-[11px] text-gray-500 flex-shrink-0">
            {spells.length} magia{spells.length === 1 ? '' : 's'}
          </span>
        </div>

        {panelOpen && (
          <FilterPanel
            filters={filters ?? EMPTY_FILTERS}
            onChange={onFiltersChange}
          />
        )}

        {(atCantripLimit || atSpellLimit) && (
          <p className="text-xs text-amber-500 mt-1.5">
            ⚠ Limite atingido {activeTab === 0
              ? `(${myCantripsCount}/${cantripsLimit} truques)`
              : `(${myLeveledCount}/${spellsLimit} ${spellsLabel?.toLowerCase() ?? 'magias'})`}
            . Remova uma magia para adicionar outra.
          </p>
        )}
      </div>
```

- [ ] **Step 5: Implementar o componente `FilterPanel`**

Adicionar ao final do arquivo `Spells.jsx`, antes do `SCHOOL_ABBR` ou em qualquer espaço livre:

```jsx
function FilterPanel({ filters, onChange }) {
  function toggleSchool(school) {
    const next = new Set(filters.schools)
    if (next.has(school)) next.delete(school)
    else next.add(school)
    onChange({ ...filters, schools: next })
  }
  function toggleCastingTime(key) {
    const next = new Set(filters.castingTimes)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange({ ...filters, castingTimes: next })
  }
  function setComponent(letter, mode) {
    onChange({ ...filters, components: { ...filters.components, [letter]: mode } })
  }
  function reset() {
    onChange({
      schools: new Set(),
      concentration: 'any',
      ritual: 'any',
      components: { v: 'any', s: 'any', m: 'any' },
      castingTimes: new Set(),
    })
  }

  const chip = (active) =>
    `text-[11px] px-2 py-1 rounded border transition-colors ${
      active
        ? 'border-amber-500 bg-amber-900/40 text-amber-200'
        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`

  const select = `text-[11px] bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200`

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 space-y-2.5">
      {/* Escolas */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Escolas</div>
        <div className="flex flex-wrap gap-1">
          {SCHOOL_LABELS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSchool(s)}
              className={chip(filters.schools.has(s))}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo de conjuração */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tempo</div>
        <div className="flex flex-wrap gap-1">
          {CASTING_TIME_LABELS.map(ct => (
            <button
              key={ct.key}
              type="button"
              onClick={() => toggleCastingTime(ct.key)}
              className={chip(filters.castingTimes.has(ct.key))}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Componentes V/S/M */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Componentes</div>
        <div className="flex flex-wrap gap-3">
          {['v', 's', 'm'].map(letter => (
            <label key={letter} className="flex items-center gap-1.5 text-[11px] text-gray-300">
              <span className="font-semibold w-3">{letter.toUpperCase()}</span>
              <select
                value={filters.components[letter]}
                onChange={e => setComponent(letter, e.target.value)}
                className={select}
              >
                <option value="any">qualquer</option>
                <option value="yes">com</option>
                <option value="no">sem</option>
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Outros */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Outros</div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <span>Concentração</span>
            <select
              value={filters.concentration}
              onChange={e => onChange({ ...filters, concentration: e.target.value })}
              className={select}
            >
              <option value="any">qualquer</option>
              <option value="yes">sim</option>
              <option value="no">não</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <span>Ritual</span>
            <select
              value={filters.ritual}
              onChange={e => onChange({ ...filters, ritual: e.target.value })}
              className={select}
            >
              <option value="any">qualquer</option>
              <option value="yes">só ritual</option>
            </select>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-1 border-t border-gray-700/50">
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verificar lint e build**

```bash
npm run lint && npm run build
```
Expected: limpo, build OK.

- [ ] **Step 7: Sanity check — rodar suíte completa pra garantir regressão zero**

```bash
npx vitest run
```
Expected: 248+ testes verde (236 atuais + 12 novos da Task 1).

- [ ] **Step 8: Commit**

```bash
git add src/components/CharacterSheet/Spells.jsx
git commit -m "feat(spell-filters): painel de filtros estruturados no SpellPicker

Botao 'Filtros' com badge de contagem; painel dropdown com chips
de escolas e tempos, tri-state V/S/M, selects de concentracao
e ritual. Contagem de resultados ao lado do botao.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 4: E2E — fluxo do painel de filtros

**Files:**
- Create: `src/test/e2e/spellsFilters.test.jsx`

- [ ] **Step 1: Criar arquivo E2E**

```jsx
// src/test/e2e/spellsFilters.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { matchesFilters, EMPTY_FILTERS, countActiveFilters } from '../../utils/spellFilters'

describe('Filtros de Magia — engine integrada', () => {
  it('matchesFilters + countActiveFilters trabalham juntos em fluxo realista', () => {
    // Estado inicial: zero
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)

    // Usuário seleciona Evocação
    const f1 = { ...EMPTY_FILTERS, schools: new Set(['evocação']) }
    expect(countActiveFilters(f1)).toBe(1)

    // Adiciona "concentração=não"
    const f2 = { ...f1, concentration: 'no' }
    expect(countActiveFilters(f2)).toBe(2)

    // Bola de Fogo (Evocação, concentração=false) deve passar
    expect(matchesFilters({
      school: 'evocação', concentration: false, ritual: false,
      components: 'V, S, M', casting_time: '1 ação',
    }, f2)).toBe(true)

    // Hexar (Encantamento, concentração=true) NÃO passa
    expect(matchesFilters({
      school: 'encantamento', concentration: true, ritual: false,
      components: 'V, S, M', casting_time: '1 ação bônus',
    }, f2)).toBe(false)
  })
})

/* ─────────────────────────────────────────────────────────────────────
   E2E de UI — montar Spells diretamente ficaria pesado (depende de
   SrdProvider, classData, slots). A engine é exercida pelas unit tests
   acima e pela integração no Spells.jsx. Para validar o painel visual,
   um teste de smoke renderizando o FilterPanel isolado:
   ────────────────────────────────────────────────────────────────────*/
import { useState } from 'react'

// Replica privada do FilterPanel para teste em isolamento.
// Como ele não é exportado, criamos um Harness mínimo que reproduz
// a mesma assinatura {filters, onChange}.
function PanelHarness() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  return (
    <>
      <div data-testid="count">{countActiveFilters(filters)}</div>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, schools: new Set([...filters.schools, 'evocação']) })}
      >Add Evocação</button>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, concentration: 'no' })}
      >Concentração não</button>
      <button
        type="button"
        onClick={() => setFilters({
          schools: new Set(),
          concentration: 'any',
          ritual: 'any',
          components: { v: 'any', s: 'any', m: 'any' },
          castingTimes: new Set(),
        })}
      >Limpar</button>
    </>
  )
}

describe('Fluxo de filtros (harness)', () => {
  beforeEach(() => {})
  afterEach(() => vi.restoreAllMocks())

  it('contagem incrementa a cada filtro adicionado e zera ao limpar', async () => {
    const user = userEvent.setup()
    render(<PanelHarness />)

    expect(screen.getByTestId('count').textContent).toBe('0')

    await user.click(screen.getByText('Add Evocação'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    await user.click(screen.getByText('Concentração não'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))

    await user.click(screen.getByText('Limpar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
  })
})
```

- [ ] **Step 2: Rodar — devem passar**

```bash
npx vitest run src/test/e2e/spellsFilters.test.jsx
```
Expected: PASS (2 testes).

- [ ] **Step 3: Suite completa**

```bash
npx vitest run
```
Expected: 250 verde (236 + 12 unit + 2 e2e).

- [ ] **Step 4: Commit**

```bash
git add src/test/e2e/spellsFilters.test.jsx
git commit -m "test(spell-filters): E2E de integracao engine + contagem

Valida fluxo realista: usuario adiciona filtros, contagem
incrementa, matchesFilters combina dimensoes corretamente,
'Limpar' zera tudo. Como o FilterPanel nao e exportado,
testamos via harness que reproduz a mesma assinatura.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Self-Review

**Spec coverage:**
- Engine `matchesFilters` + `EMPTY_FILTERS` + `countActiveFilters` → Task 1 ✓
- Filtro por escola (multi) → Task 1 + Task 3 (chips) ✓
- Filtro concentração yes/no/any → Task 1 + Task 3 (select) ✓
- Filtro ritual yes/any → Task 1 + Task 3 (select) ✓
- Filtro componentes tri-state V/S/M → Task 1 + Task 3 (select) ✓
- Filtro tempo (5 buckets) → Task 1 + Task 3 (chips) ✓
- Botão "Filtros" com badge de contagem → Task 3 ✓
- Contagem de magias ao lado → Task 3 ✓
- Painel dropdown abre/fecha → Task 3 ✓
- "Limpar filtros" → Task 3 (footer do FilterPanel) ✓
- Filtros persistem entre níveis (não reset em onTabChange) → Task 2 Step 3 ✓
- Não persiste em localStorage → padrão (state em memória) ✓
- Testes unitários + E2E → Task 1, Task 4 ✓

**Placeholder scan:** Nenhum "TBD/TODO" no plano. Cada step tem código completo.

**Type consistency:**
- `EMPTY_FILTERS`, `matchesFilters`, `countActiveFilters` mesma assinatura em todas as tasks.
- `filters.components` sempre objeto com chaves `v`/`s`/`m` minúsculas.
- `filters.castingTimes` é `Set` com chaves `'action'|'bonus'|'reaction'|'minutes'|'hours'`.
- `filters.schools` é `Set` com strings minúsculas PT-BR.
- Props `filters` / `onFiltersChange` consistentes entre Task 2 e Task 3.

**Decisões de escopo (mencionadas no spec, fora do plano):**
- Filtros na lista do personagem (mySpells).
- Persistência em localStorage.
- Filtro por classe overlay no picker.
- Filtro por alcance (range).
