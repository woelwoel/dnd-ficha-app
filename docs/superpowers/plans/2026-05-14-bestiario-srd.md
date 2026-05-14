# Bestiário SRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modal flutuante global de consulta de monstros SRD 5.1 — read-only, com filtros (CR/tipo/tamanho/alinhamento) e stat block estilo PHB.

**Architecture:** Engine pura `src/utils/monsters.js` (matchesMonsterFilters / formatCR), dataset `public/srd-data/5e-SRD-Monsters.json`, dois componentes (`BestiaryModal` + `MonsterStatBlock`), trigger flutuante montado globalmente em `App.jsx`. Sem provider novo — estado local do modal.

**Tech Stack:** React 19 + Tailwind. Sem deps novas.

---

## Spec de referência

`docs/superpowers/specs/2026-05-14-bestiario-srd-design.md`

## Estrutura de arquivos

**Criar:**
- `public/srd-data/5e-SRD-Monsters.json` — dataset SRD 5.1 (~330 monstros)
- `src/utils/monsters.js` — engine
- `src/test/monsters.test.js` — testes unit
- `src/components/Bestiary/MonsterStatBlock.jsx` — stat block visual
- `src/components/Bestiary/BestiaryModal.jsx` — modal completo (lista + filtros + detalhe)
- `src/components/Bestiary/BestiaryButton.jsx` — botão flutuante
- `src/test/e2e/bestiary.test.jsx` — E2E

**Modificar:**
- `src/App.jsx` — montar `<BestiaryButton />` global

**Convenções:**
- Strings de tipo/tamanho/alinhamento são exatamente as do JSON SRD (`'humanoid'`, `'Small'`, `'neutral evil'`). UI capitaliza para exibição.
- CR é número (frações representadas como `0.125`, `0.25`, `0.5`); `formatCR` converte para string.

---

## Task 1: Engine `monsters.js`

**Files:**
- Create: `src/utils/monsters.js`
- Create: `src/test/monsters.test.js`

- [ ] **Step 1: Escrever testes**

```js
// src/test/monsters.test.js
import { describe, it, expect } from 'vitest'
import {
  matchesMonsterFilters,
  formatCR,
  countActiveMonsterFilters,
  EMPTY_MONSTER_FILTERS,
} from '../utils/monsters'

const goblin = {
  index: 'goblin', name: 'Goblin',
  size: 'Small', type: 'humanoid', alignment: 'neutral evil',
  challenge_rating: 0.25,
}
const dragon = {
  index: 'ancient-red-dragon', name: 'Ancient Red Dragon',
  size: 'Gargantuan', type: 'dragon', alignment: 'chaotic evil',
  challenge_rating: 24,
}
const sphinx = {
  index: 'androsphinx', name: 'Androsphinx',
  size: 'Large', type: 'monstrosity', alignment: 'lawful neutral',
  challenge_rating: 17,
}
const commoner = {
  index: 'commoner', name: 'Commoner',
  size: 'Medium', type: 'humanoid', alignment: 'any alignment',
  challenge_rating: 0,
}

describe('matchesMonsterFilters', () => {
  it('vazio passa qualquer monstro', () => {
    expect(matchesMonsterFilters(goblin, EMPTY_MONSTER_FILTERS)).toBe(true)
    expect(matchesMonsterFilters(dragon, EMPTY_MONSTER_FILTERS)).toBe(true)
  })

  it('CR min/max isolado', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, cr: { min: 1, max: 5 } }
    expect(matchesMonsterFilters(goblin, f)).toBe(false)   // 0.25
    expect(matchesMonsterFilters(commoner, f)).toBe(false) // 0
    expect(matchesMonsterFilters(dragon, f)).toBe(false)   // 24
    const f2 = { ...EMPTY_MONSTER_FILTERS, cr: { min: 0, max: 0.5 } }
    expect(matchesMonsterFilters(goblin, f2)).toBe(true)
  })

  it('tipo single', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, types: new Set(['dragon']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(false)
  })

  it('tipo múltiplo (OR)', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, types: new Set(['dragon', 'humanoid']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(true)
    expect(matchesMonsterFilters(sphinx, f)).toBe(false)
  })

  it('tamanho', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, sizes: new Set(['Small', 'Medium']) }
    expect(matchesMonsterFilters(goblin, f)).toBe(true)
    expect(matchesMonsterFilters(commoner, f)).toBe(true)
    expect(matchesMonsterFilters(dragon, f)).toBe(false)
  })

  it('alinhamento case-insensitive (casa exato após lowercase)', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, alignments: new Set(['chaotic evil']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters({ ...dragon, alignment: 'Chaotic Evil' }, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(false)
  })

  it('AND entre dimensões', () => {
    const f = {
      cr: { min: 10, max: 30 },
      types: new Set(['dragon']),
      sizes: new Set(['Gargantuan']),
      alignments: new Set(['chaotic evil']),
    }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(sphinx, f)).toBe(false) // tipo errado
  })
})

describe('formatCR', () => {
  it('valores fracionários', () => {
    expect(formatCR(0)).toBe('0')
    expect(formatCR(0.125)).toBe('1/8')
    expect(formatCR(0.25)).toBe('1/4')
    expect(formatCR(0.5)).toBe('1/2')
  })
  it('inteiros', () => {
    expect(formatCR(1)).toBe('1')
    expect(formatCR(5)).toBe('5')
    expect(formatCR(30)).toBe('30')
  })
})

describe('countActiveMonsterFilters', () => {
  it('vazio retorna 0', () => {
    expect(countActiveMonsterFilters(EMPTY_MONSTER_FILTERS)).toBe(0)
  })

  it('cr.min > 0 e cr.max < 30 contam', () => {
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 5, max: 30 } })).toBe(1)
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 0, max: 10 } })).toBe(1)
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 1, max: 10 } })).toBe(2)
  })

  it('soma sets', () => {
    const f = {
      cr: { min: 0, max: 30 },
      types: new Set(['dragon', 'humanoid']),
      sizes: new Set(['Small']),
      alignments: new Set(['chaotic evil', 'lawful good']),
    }
    expect(countActiveMonsterFilters(f)).toBe(5)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar (módulo não existe)**

```bash
npx vitest run src/test/monsters.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implementar engine**

```js
// src/utils/monsters.js

/**
 * Engine de filtros do Bestiário SRD — funções puras, sem React.
 */

export const EMPTY_MONSTER_FILTERS = Object.freeze({
  cr: { min: 0, max: 30 },
  types: new Set(),
  sizes: new Set(),
  alignments: new Set(),
})

/** Tipos SRD em ordem alfabética (chaves exatas do JSON). */
export const MONSTER_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead',
]

/** Tamanhos SRD em ordem de pequeno → grande. */
export const MONSTER_SIZES = [
  'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan',
]

/** Alinhamentos exibidos como chips. Casamento é case-insensitive. */
export const ALIGNMENTS = [
  'lawful good', 'neutral good', 'chaotic good',
  'lawful neutral', 'neutral', 'chaotic neutral',
  'lawful evil', 'neutral evil', 'chaotic evil',
  'unaligned',
]

/**
 * Aplica todos os filtros a um monstro.
 * AND entre dimensões; OR dentro de multiselect.
 */
export function matchesMonsterFilters(monster, filters) {
  if (!filters) return true

  // CR
  const cr = Number(monster.challenge_rating ?? 0)
  if (cr < (filters.cr?.min ?? 0)) return false
  if (cr > (filters.cr?.max ?? 30)) return false

  // Tipo
  if (filters.types && filters.types.size > 0) {
    if (!filters.types.has(String(monster.type || '').toLowerCase())) return false
  }

  // Tamanho
  if (filters.sizes && filters.sizes.size > 0) {
    if (!filters.sizes.has(monster.size)) return false
  }

  // Alinhamento — case-insensitive
  if (filters.alignments && filters.alignments.size > 0) {
    const a = String(monster.alignment || '').toLowerCase()
    if (!filters.alignments.has(a)) return false
  }

  return true
}

/** Converte CR numérico para string PHB (1/8, 1/4, 1/2, N). */
export function formatCR(cr) {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25)  return '1/4'
  if (cr === 0.5)   return '1/2'
  return String(cr ?? 0)
}

/** Conta filtros não-default. Usado no badge da UI. */
export function countActiveMonsterFilters(filters) {
  if (!filters) return 0
  let n = 0
  if ((filters.cr?.min ?? 0) > 0)  n += 1
  if ((filters.cr?.max ?? 30) < 30) n += 1
  n += filters.types?.size ?? 0
  n += filters.sizes?.size ?? 0
  n += filters.alignments?.size ?? 0
  return n
}

/** Cor Tailwind de badge por faixa de CR. */
export function crBadgeColor(cr) {
  if (cr <= 1)  return 'bg-gray-700/40 text-gray-300 border-gray-600'
  if (cr <= 4)  return 'bg-green-900/40 text-green-300 border-green-700'
  if (cr <= 10) return 'bg-blue-900/40 text-blue-300 border-blue-700'
  if (cr <= 16) return 'bg-yellow-900/40 text-yellow-300 border-yellow-700'
  return 'bg-red-900/40 text-red-300 border-red-700'
}
```

- [ ] **Step 4: Rodar — todos devem passar**

```bash
npx vitest run src/test/monsters.test.js
```
Expected: PASS (14 testes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/monsters.js src/test/monsters.test.js
git commit -m "feat(bestiary): engine de filtros + formatCR

matchesMonsterFilters aplica CR (min/max), tipo, tamanho e
alinhamento (case-insensitive). AND entre dimensoes, OR dentro
de multiselect. Inclui formatCR (1/8, 1/4, 1/2, N),
countActiveMonsterFilters e crBadgeColor para UI.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 2: Dataset `5e-SRD-Monsters.json`

**Files:**
- Create: `public/srd-data/5e-SRD-Monsters.json`

- [ ] **Step 1: Baixar do repositório 5e-bits/5e-database (mesma fonte dos outros SRDs)**

```bash
curl -L -o public/srd-data/5e-SRD-Monsters.json \
  "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/5e-SRD-Monsters.json"
```

Se a URL acima retornar 404 (estrutura do repo pode ter mudado), tentar:

```bash
curl -L -o public/srd-data/5e-SRD-Monsters.json \
  "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/5e-SRD-Monsters.json"
```

- [ ] **Step 2: Validar JSON e contar entradas**

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('public/srd-data/5e-SRD-Monsters.json','utf8'));console.log('count:',d.length);console.log('sample:',Object.keys(d[0]).slice(0,15))"
```
Expected: count entre 300 e 400; keys incluem `index`, `name`, `size`, `type`, `alignment`, `challenge_rating`, `hit_points`, `armor_class`, `actions`.

- [ ] **Step 3: Verificar que o shape bate com o que a engine espera**

```bash
node -e "
const d=JSON.parse(require('fs').readFileSync('public/srd-data/5e-SRD-Monsters.json','utf8'));
const goblin=d.find(m=>m.index==='goblin');
console.log('goblin CR:', goblin?.challenge_rating, 'type:', goblin?.type, 'size:', goblin?.size);
const dragon=d.find(m=>m.index==='ancient-red-dragon');
console.log('dragon CR:', dragon?.challenge_rating);
"
```
Expected: imprime CR/tipo/tamanho do Goblin e CR do Ancient Red Dragon.

- [ ] **Step 4: Commit**

```bash
git add public/srd-data/5e-SRD-Monsters.json
git commit -m "feat(bestiary): dataset SRD 5.1 de monstros

Importa 5e-SRD-Monsters.json do projeto 5e-bits/5e-database
(mesma fonte dos demais SRDs ja em uso). ~300+ monstros com
stat blocks completos.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 3: Componente `MonsterStatBlock`

**Files:**
- Create: `src/components/Bestiary/MonsterStatBlock.jsx`

- [ ] **Step 1: Criar o componente**

```jsx
// src/components/Bestiary/MonsterStatBlock.jsx
import { formatCR } from '../../utils/monsters'

const ABILITY_LABELS = [
  { key: 'strength',     label: 'FOR' },
  { key: 'dexterity',    label: 'DES' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom',       label: 'SAB' },
  { key: 'charisma',     label: 'CAR' },
]

function modOf(score) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function joinACs(armor_class) {
  if (!Array.isArray(armor_class) || armor_class.length === 0) return '—'
  return armor_class.map(ac => {
    if (typeof ac === 'number') return String(ac)
    const desc = ac.type ? ` (${ac.type})` : ''
    return `${ac.value}${desc}`
  }).join(', ')
}

function joinSpeed(speed) {
  if (!speed || typeof speed !== 'object') return '—'
  return Object.entries(speed)
    .map(([k, v]) => k === 'walk' ? v : `${k} ${v}`)
    .join(', ')
}

function joinSenses(senses) {
  if (!senses || typeof senses !== 'object') return '—'
  return Object.entries(senses)
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
    .join(', ')
}

function getProfs(monster, kind) {
  // kind: 'Saving Throw' ou 'Skill'
  const list = monster.proficiencies ?? []
  return list
    .filter(p => p?.proficiency?.name?.startsWith(kind + ':'))
    .map(p => {
      const name = p.proficiency.name.replace(`${kind}: `, '')
      const sign = p.value >= 0 ? '+' : ''
      return `${name} ${sign}${p.value}`
    })
    .join(', ')
}

function joinList(arr) {
  if (!arr || arr.length === 0) return ''
  return arr.map(x => typeof x === 'string' ? x : x.name ?? '').filter(Boolean).join(', ')
}

function Section({ label, value }) {
  if (!value) return null
  return (
    <div className="text-sm">
      <span className="font-bold text-amber-300">{label}</span>{' '}
      <span className="text-gray-200">{value}</span>
    </div>
  )
}

function Block({ title, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-widest font-bold text-amber-400 border-b border-amber-700/40 pb-1">{title}</h4>
      {items.map((it, i) => (
        <div key={i} className="text-sm">
          <span className="font-bold italic text-gray-100">{it.name}.</span>{' '}
          <span className="text-gray-300">{it.desc}</span>
        </div>
      ))}
    </div>
  )
}

export function MonsterStatBlock({ monster }) {
  if (!monster) return null
  const cr = formatCR(monster.challenge_rating)
  const xp = monster.xp != null ? ` (${monster.xp.toLocaleString()} XP)` : ''
  const subtypeText = monster.subtype ? ` (${monster.subtype})` : ''

  const savingThrows = getProfs(monster, 'Saving Throw')
  const skills       = getProfs(monster, 'Skill')

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-amber-400">{monster.name}</h2>
        <p className="italic text-sm text-gray-400">
          {monster.size} {monster.type}{subtypeText}, {monster.alignment}
        </p>
      </div>

      <div className="space-y-1 border-y border-amber-700/40 py-3">
        <Section label="Armor Class"  value={joinACs(monster.armor_class)} />
        <Section label="Hit Points"   value={`${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}`} />
        <Section label="Speed"        value={joinSpeed(monster.speed)} />
      </div>

      <div className="grid grid-cols-6 gap-2 text-center border-b border-amber-700/40 pb-3">
        {ABILITY_LABELS.map(({ key, label }) => (
          <div key={key} className="bg-gray-900/60 rounded px-1 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-amber-400">{label}</div>
            <div className="text-sm font-bold text-white">{monster[key]}</div>
            <div className="text-xs text-gray-400">{modOf(monster[key])}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Section label="Saving Throws"           value={savingThrows} />
        <Section label="Skills"                  value={skills} />
        <Section label="Damage Vulnerabilities"  value={joinList(monster.damage_vulnerabilities)} />
        <Section label="Damage Resistances"      value={joinList(monster.damage_resistances)} />
        <Section label="Damage Immunities"       value={joinList(monster.damage_immunities)} />
        <Section label="Condition Immunities"    value={joinList(monster.condition_immunities)} />
        <Section label="Senses"                  value={joinSenses(monster.senses)} />
        <Section label="Languages"               value={monster.languages || '—'} />
        <Section label="Challenge"               value={`${cr}${xp}`} />
      </div>

      <Block title="Special Abilities" items={monster.special_abilities} />
      <Block title="Actions"           items={monster.actions} />
      <Block title="Reactions"         items={monster.reactions} />
      <Block title="Legendary Actions" items={monster.legendary_actions} />
    </div>
  )
}
```

- [ ] **Step 2: Smoke test — rodar lint**

```bash
npm run lint
```
Expected: clean (componente novo, sem warning).

- [ ] **Step 3: Commit**

```bash
git add src/components/Bestiary/MonsterStatBlock.jsx
git commit -m "feat(bestiary): componente MonsterStatBlock estilo PHB

Renderiza nome, tamanho/tipo/alinhamento, AC/HP/Speed, grid de
atributos com modificadores, saves, skills, resistencias/imunidades,
sentidos, idiomas, CR/XP, Special Abilities, Actions, Reactions e
Legendary Actions. Cada secao renderiza apenas se o monstro tem
o campo correspondente.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 4: `BestiaryModal` (lista + filtros + detalhe)

**Files:**
- Create: `src/components/Bestiary/BestiaryModal.jsx`

- [ ] **Step 1: Criar o componente**

```jsx
// src/components/Bestiary/BestiaryModal.jsx
import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  matchesMonsterFilters,
  formatCR,
  countActiveMonsterFilters,
  crBadgeColor,
  EMPTY_MONSTER_FILTERS,
  MONSTER_TYPES,
  MONSTER_SIZES,
  ALIGNMENTS,
} from '../../utils/monsters'
import { MonsterStatBlock } from './MonsterStatBlock'

export function BestiaryModal({ isOpen, onClose }) {
  const [monsters, setMonsters] = useState([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_MONSTER_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isOpen || monsters.length > 0) return
    fetch('/srd-data/5e-SRD-Monsters.json')
      .then(r => r.json())
      .then(data => setMonsters(Array.isArray(data) ? data : []))
      .catch(() => setMonsters([]))
  }, [isOpen, monsters.length])

  // ESC fecha
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return monsters.filter(m => {
      if (!matchesMonsterFilters(m, filters)) return false
      if (q && !(m.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [monsters, search, filters])

  const activeCount = countActiveMonsterFilters(filters)

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-amber-700/50 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/40">
          <h2 className="text-lg font-bold text-amber-400">
            Bestiário SRD
            <span className="ml-2 text-xs text-gray-500 font-normal">
              {filtered.length} de {monsters.length} monstros
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-amber-400 hover:bg-gray-800"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Busca + filtros */}
        <div className="px-4 py-3 border-b border-gray-700 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar monstro..."
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
          </div>

          {panelOpen && (
            <MonsterFilterPanel filters={filters} onChange={setFilters} />
          )}
        </div>

        {/* Corpo: lista + stat block */}
        <div className="flex-1 flex overflow-hidden">
          {/* Lista (esquerda) */}
          <div className={`${selected ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-2/5 sm:border-r border-gray-700 overflow-hidden`}>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
              {filtered.length === 0 && (
                <p className="text-xs text-gray-600 p-4 text-center">Nenhum monstro encontrado.</p>
              )}
              {filtered.map(m => (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                    selected?.index === m.index
                      ? 'bg-amber-900/30 border-l-4 border-amber-500'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{m.name}</div>
                    <div className="text-[11px] text-gray-500 capitalize">{m.size?.toLowerCase()} {m.type}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${crBadgeColor(m.challenge_rating)}`}>
                    CR {formatCR(m.challenge_rating)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stat block (direita) */}
          <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-col w-full sm:w-3/5 overflow-hidden`}>
            {selected ? (
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="sm:hidden mb-3 text-xs text-amber-400 hover:text-amber-300"
                >
                  ← Voltar à lista
                </button>
                <MonsterStatBlock monster={selected} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                Selecione um monstro
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function MonsterFilterPanel({ filters, onChange }) {
  function toggleInSet(key, value) {
    const next = new Set(filters[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [key]: next })
  }
  function setCR(field, raw) {
    const v = Number(raw)
    if (Number.isNaN(v)) return
    const clamped = Math.max(0, Math.min(30, v))
    onChange({ ...filters, cr: { ...filters.cr, [field]: clamped } })
  }
  function reset() {
    onChange({
      cr: { min: 0, max: 30 },
      types: new Set(),
      sizes: new Set(),
      alignments: new Set(),
    })
  }
  const chip = (active) =>
    `text-[11px] px-2 py-1 rounded border transition-colors capitalize ${
      active
        ? 'border-amber-500 bg-amber-900/40 text-amber-200'
        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 space-y-2.5">
      {/* CR */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Challenge Rating</div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span>min</span>
          <input
            type="number" min="0" max="30" step="0.125"
            value={filters.cr.min}
            onChange={e => setCR('min', e.target.value)}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-sm text-white"
          />
          <span>max</span>
          <input
            type="number" min="0" max="30" step="1"
            value={filters.cr.max}
            onChange={e => setCR('max', e.target.value)}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-sm text-white"
          />
        </div>
      </div>

      {/* Tipos */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tipo</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleInSet('types', t)} className={chip(filters.types.has(t))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tamanhos */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Tamanho</div>
        <div className="flex flex-wrap gap-1">
          {MONSTER_SIZES.map(s => (
            <button key={s} type="button" onClick={() => toggleInSet('sizes', s)} className={chip(filters.sizes.has(s))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alinhamentos */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Alinhamento</div>
        <div className="flex flex-wrap gap-1">
          {ALIGNMENTS.map(a => (
            <button key={a} type="button" onClick={() => toggleInSet('alignments', a)} className={chip(filters.alignments.has(a))}>
              {a}
            </button>
          ))}
        </div>
      </div>

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

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add src/components/Bestiary/BestiaryModal.jsx
git commit -m "feat(bestiary): BestiaryModal com lista, filtros e stat block

Modal global em tela cheia (renderizado via portal). Layout
de 2 colunas (lista + stat block), responsivo (mobile mostra
um por vez). Inclui MonsterFilterPanel com CR (min/max), tipos,
tamanhos e alinhamentos. Fecha com ESC, clique no overlay e
botao X.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 5: Trigger global em `App.jsx`

**Files:**
- Create: `src/components/Bestiary/BestiaryButton.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Criar `BestiaryButton`**

```jsx
// src/components/Bestiary/BestiaryButton.jsx
import { useState } from 'react'
import { BestiaryModal } from './BestiaryModal'

export function BestiaryButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Bestiário SRD"
        aria-label="Abrir bestiário"
        style={{
          position: 'fixed', bottom: '1.25rem', right: '5rem', zIndex: 50,
          boxShadow: 'var(--shadow-parchment, 0 4px 16px rgba(0,0,0,0.4))',
        }}
        className="w-12 h-12 rounded-full text-xl flex items-center justify-center transition-all duration-200 border-2 bg-parchment-100 hover:bg-parchment-200 border-ink-300 hover:border-ink-500"
      >
        🐉
      </button>
      <BestiaryModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2: Montar globalmente em `App.jsx`**

Localizar o bloco com `<DiceHistoryPanel />` em `src/App.jsx` e adicionar o `<BestiaryButton />` ao lado:

```jsx
import { DiceHistoryPanel } from './components/DiceRoller/DiceHistoryPanel'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'
```

E dentro do JSX, junto ao `DiceHistoryPanel`:

```jsx
            </Suspense>
            <DiceHistoryPanel />
            <BestiaryButton />
```

- [ ] **Step 3: Build + sanity check**

```bash
npm run lint && npm run build && npx vitest run
```
Expected: tudo verde.

- [ ] **Step 4: Commit**

```bash
git add src/components/Bestiary/BestiaryButton.jsx src/App.jsx
git commit -m "feat(bestiary): botao flutuante global em App.jsx

Posicionado a esquerda do DiceHistoryPanel (right: 5rem). Click
abre BestiaryModal. Acessivel de qualquer tela.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 6: E2E

**Files:**
- Create: `src/test/e2e/bestiary.test.jsx`

- [ ] **Step 1: Criar arquivo de teste**

```jsx
// src/test/e2e/bestiary.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BestiaryModal } from '../../components/Bestiary/BestiaryModal'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Bestiary Modal

   Cobre:
   - Carrega monstros do JSON SRD
   - Busca textual filtra a lista
   - Selecionar monstro renderiza stat block
   - Filtros CR/tipo mudam a contagem
   - ESC e overlay fecham o modal
   ────────────────────────────────────────────────────────────────────*/

describe('Bestiary Modal E2E', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza modal aberto e carrega lista', async () => {
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    expect(screen.getByText(/Bestiári?o SRD/i)).toBeInTheDocument()

    // Espera o fetch resolver e a lista aparecer (pelo menos 1 monstro conhecido)
    await waitFor(() => {
      expect(screen.getByText(/Goblin/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('não renderiza nada quando isOpen=false', () => {
    const { container } = render(<BestiaryModal isOpen={false} onClose={() => {}} />)
    expect(container.textContent).toBe('')
  })

  it('ESC chama onClose', async () => {
    const onClose = vi.fn()
    render(<BestiaryModal isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('busca textual filtra a lista', async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    // Espera carregar
    await waitFor(() => expect(screen.getByText(/Goblin/i)).toBeInTheDocument(), { timeout: 3000 })

    const search = screen.getByPlaceholderText(/Buscar monstro/i)
    await user.clear(search)
    await user.type(search, 'goblin')

    // Após filtrar, o nome Goblin continua visível
    expect(screen.getByText(/^Goblin$/)).toBeInTheDocument()
  })

  it('clicar em monstro mostra stat block', async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/Goblin/i)).toBeInTheDocument(), { timeout: 3000 })

    // Clicar no item da lista (botão com nome do monstro)
    const button = screen.getByRole('button', { name: /Goblin/i })
    await user.click(button)

    // Stat block deve mostrar nome em destaque e ao menos uma seção (Armor Class)
    await waitFor(() => {
      expect(screen.getByText('Armor Class')).toBeInTheDocument()
    })
  })

  it('botão "Limpar filtros" reseta filtros', async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/Goblin/i)).toBeInTheDocument(), { timeout: 3000 })

    // Abre painel de filtros
    await user.click(screen.getByRole('button', { name: /^Filtros/i }))

    // Toggle do tipo 'dragon'
    await user.click(screen.getByRole('button', { name: /^dragon$/i }))
    expect(screen.getByRole('button', { name: /Filtros · 1/i })).toBeInTheDocument()

    // Limpar
    await user.click(screen.getByText(/Limpar filtros/i))
    expect(screen.getByRole('button', { name: /^Filtros$/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar testes E2E**

```bash
npx vitest run src/test/e2e/bestiary.test.jsx
```
Expected: PASS (6 testes). Se algum seletor (texto exato) falhar, ajustar baseado em saída de erro — `screen.debug()` ou seletores mais específicos.

- [ ] **Step 3: Suite completa**

```bash
npx vitest run
```
Expected: 270+ testes verde (252 atuais + 14 unit + 6 e2e).

- [ ] **Step 4: Commit**

```bash
git add src/test/e2e/bestiary.test.jsx
git commit -m "test(bestiary): suite E2E (carrega, busca, seleciona, filtra)

6 testes RTL: modal abre/fecha, ESC, lista carrega via fetch
mockado, busca textual, selecao mostra stat block,
'Limpar filtros' reseta.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Self-Review

**Spec coverage:**
- Engine `matchesMonsterFilters` + `formatCR` + `countActiveMonsterFilters` → Task 1 ✓
- Dataset SRD JSON → Task 2 ✓
- `MonsterStatBlock` estilo PHB (todos os campos) → Task 3 ✓
- `BestiaryModal` com 2 colunas, busca, filtros (CR/tipo/tamanho/alinhamento) → Task 4 ✓
- Trigger global flutuante + montagem em App.jsx → Task 5 ✓
- Layout mobile (esconde coluna direita) → Task 4 (`sm:hidden`/`sm:flex` classes) ✓
- ESC, click overlay, botão X fecham → Task 4 ✓
- Testes unit + E2E → Tasks 1, 6 ✓

**Placeholder scan:** Sem TBD/TODO. Cada step tem código pronto.

**Type consistency:**
- `EMPTY_MONSTER_FILTERS`, `matchesMonsterFilters`, `formatCR`, `countActiveMonsterFilters`, `crBadgeColor`, `MONSTER_TYPES`, `MONSTER_SIZES`, `ALIGNMENTS` definidos na Task 1 e usados nas Tasks 4/6 com mesma assinatura.
- `filters.cr.min`/`max` é número (não string) em todo o fluxo; UI faz parse em `setCR`.
- `filters.types`/`sizes`/`alignments` são Sets; toggleInSet manipula com `new Set([...])`.
- Strings de tipo são lowercase (`'dragon'`); tamanho mantém capitalização (`'Small'`); alinhamento lowercase com casamento case-insensitive na engine.

**Decisões fora do plano (do spec):**
- Tradução PT-BR.
- Lista de encontros / cálculo de dificuldade.
- Favoritar / marcar.
- Integração com a ficha.
- Imagens.
