# Itens Mágicos + Atunement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar sistema de itens mágicos com efeitos estruturais (CA, ataque, dano, saves, atributos, resistências, velocidade) e atunement automático, integrado ao inventário.

**Architecture:** Três camadas — (1) catálogo JSON em `public/srd-data/phb-magic-items-pt.json` com ~50 itens curados PT-BR; (2) engine pura `src/domain/magicItems.js` que filtra itens ativos e agrega efeitos; (3) integração cirúrgica em `equipment.js`, `useCharacterCalculations.js` e `Inventory.jsx`.

**Tech Stack:** React 19 + Vite + TailwindCSS, Vitest + RTL, Zod (já em uso). Sem dependências novas.

---

## Spec de referência

`docs/superpowers/specs/2026-05-13-itens-magicos-atunement-design.md`

## Estrutura de arquivos

**Criar:**
- `public/srd-data/phb-magic-items-pt.json` — catálogo
- `src/domain/magicItems.js` — engine
- `src/test/magicItems.test.js` — testes unitários da engine
- `src/test/e2e/magicItems.test.jsx` — fluxo completo

**Modificar:**
- `src/domain/equipment.js` — `calculateArmorClass` aceita `magicEffects`
- `src/hooks/useCharacterCalculations.js` — calcula efeitos uma vez, propaga
- `src/components/CharacterSheet/Inventory.jsx` — UI (busca mágico, cores raridade, painel efeitos)
- `src/test/equipment.test.js` — cobertura de magicEffects em CA
- `src/test/calculations.test.js` — saves/atributos com efeitos

**Decisões de escopo (do spec):**
- Armas com `effects.attack`/`effects.damage`: NÃO auto-vinculam ao array `combat.attacks`. O usuário continua usando o campo `magicBonus` existente em ataques manualmente. O catálogo serve como referência. (YAGNI: linkar inventário↔ataques é trabalho desproporcional.)
- `armorAc` (Armadura +1/+2/+3 equipada): ESSE sim entra automaticamente no cálculo da CA, porque a armadura equipada já é detectada.
- `resistance` e `advSaves`: aparecem como badges no painel "Efeitos Ativos", sem motor de combate automatizado.

---

## Task 1: Engine — `isItemActive` e `getActiveMagicEffects`

**Files:**
- Create: `src/domain/magicItems.js`
- Create: `src/test/magicItems.test.js`

- [ ] **Step 1: Criar arquivo de teste com casos de `isItemActive`**

```js
// src/test/magicItems.test.js
import { describe, it, expect } from 'vitest'
import { isItemActive, getActiveMagicEffects } from '../domain/magicItems'

describe('isItemActive', () => {
  it('item que requer atunamento é ativo apenas se atunado', () => {
    expect(isItemActive({ requiresAttunement: true, attuned: true })).toBe(true)
    expect(isItemActive({ requiresAttunement: true, attuned: false })).toBe(false)
  })

  it('item sem atunamento é ativo se equipado', () => {
    expect(isItemActive({ requiresAttunement: false, equipped: true })).toBe(true)
    expect(isItemActive({ requiresAttunement: false, equipped: false })).toBe(false)
  })

  it('item sem flags retorna false', () => {
    expect(isItemActive({})).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar com "isItemActive is not defined"**

```bash
npx vitest run src/test/magicItems.test.js
```
Expected: FAIL — `isItemActive is not a function` ou módulo não encontrado.

- [ ] **Step 3: Implementar engine mínima (apenas `isItemActive`)**

```js
// src/domain/magicItems.js

/**
 * Determina se um item mágico está "ativo" — ou seja, contribuindo
 * com seus `effects` para os cálculos da ficha.
 *
 * - Itens que requerem atunamento: ativos quando `attuned === true`.
 * - Itens sem atunamento: ativos quando `equipped === true` (armas/armaduras mágicas).
 *
 * @param {object} item - entrada de inventory.items
 * @returns {boolean}
 */
export function isItemActive(item) {
  if (!item) return false
  if (item.requiresAttunement) return item.attuned === true
  return item.equipped === true
}

const EMPTY_EFFECTS = Object.freeze({
  ac: 0,
  armorAc: 0,
  attack: 0,
  damage: 0,
  saves: 0,
  saveAbility: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
  attrCap: { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 },
  attrBonus: {
    str: { value: 0, max: 20 },
    dex: { value: 0, max: 20 },
    con: { value: 0, max: 20 },
    int: { value: 0, max: 20 },
    wis: { value: 0, max: 20 },
    cha: { value: 0, max: 20 },
  },
  resistances: [],
  advSaves: false,
  speed: 0,
  darkvision: 0,
  sources: [],
})

export function getActiveMagicEffects(_items) {
  return EMPTY_EFFECTS
}
```

- [ ] **Step 4: Rodar teste — `isItemActive` deve passar; `getActiveMagicEffects` ainda mock**

```bash
npx vitest run src/test/magicItems.test.js
```
Expected: PASS nos 3 testes de `isItemActive`.

- [ ] **Step 5: Adicionar testes para `getActiveMagicEffects` — agregação básica**

Acrescentar ao mesmo arquivo de teste:

```js
describe('getActiveMagicEffects — agregação', () => {
  it('lista vazia retorna efeitos zerados', () => {
    const r = getActiveMagicEffects([])
    expect(r.ac).toBe(0)
    expect(r.saves).toBe(0)
    expect(r.resistances).toEqual([])
  })

  it('soma bônus numéricos de AC', () => {
    const items = [
      { name: 'Anel de Proteção', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 1 }] },
      { name: 'Bracelete de Defesa', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 2 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.ac).toBe(3)
    expect(r.sources).toHaveLength(2)
  })

  it('ignora itens inativos', () => {
    const items = [
      { name: 'Anel atunado', requiresAttunement: true, attuned: true,
        effects: [{ type: 'ac', value: 1 }] },
      { name: 'Anel não atunado', requiresAttunement: true, attuned: false,
        effects: [{ type: 'ac', value: 1 }] },
    ]
    expect(getActiveMagicEffects(items).ac).toBe(1)
  })

  it('attrSet — maior valor ganha (não soma)', () => {
    const items = [
      { name: 'Cinto Colina', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrSet', ability: 'str', value: 21 }] },
      { name: 'Cinto Fogo',   requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrSet', ability: 'str', value: 25 }] },
    ]
    expect(getActiveMagicEffects(items).attrSet.str).toBe(25)
  })

  it('attrBonus respeita max', () => {
    const items = [
      { name: 'Amuleto da Saúde', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrBonus', ability: 'con', value: 2, max: 22 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.attrBonus.con.value).toBe(2)
    expect(r.attrBonus.con.max).toBe(22)
  })

  it('save geral e por atributo combinam', () => {
    const items = [
      { name: 'Anel de Proteção', requiresAttunement: true, attuned: true,
        effects: [{ type: 'saves', value: 1 }] },
      { name: 'Manto de Resistência', requiresAttunement: true, attuned: true,
        effects: [{ type: 'saveAbility', ability: 'con', value: 1 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.saves).toBe(1)
    expect(r.saveAbility.con).toBe(1)
  })

  it('resistance acumula sem duplicar', () => {
    const items = [
      { name: 'Anel Fogo 1', requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'fogo' }] },
      { name: 'Anel Fogo 2', requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'fogo' }] },
      { name: 'Anel Frio',   requiresAttunement: true, attuned: true,
        effects: [{ type: 'resistance', damage: 'frio' }] },
    ]
    expect(getActiveMagicEffects(items).resistances.sort()).toEqual(['fogo', 'frio'])
  })

  it('advSaves de um item ativa flag global', () => {
    const items = [
      { name: 'Pedra da Boa Sorte', requiresAttunement: true, attuned: true,
        effects: [{ type: 'advSaves' }] },
    ]
    expect(getActiveMagicEffects(items).advSaves).toBe(true)
  })

  it('speed e darkvision somam', () => {
    const items = [
      { equipped: true, name: 'Botas Aladas',
        effects: [{ type: 'speed', value: 10 }] },
      { equipped: true, name: 'Óculos da Visão Noturna',
        effects: [{ type: 'darkvision', value: 60 }] },
    ]
    const r = getActiveMagicEffects(items)
    expect(r.speed).toBe(10)
    expect(r.darkvision).toBe(60)
  })

  it('attrCap pega o maior teto', () => {
    const items = [
      { name: 'Manto de Carismático', requiresAttunement: true, attuned: true,
        effects: [{ type: 'attrCap', ability: 'cha', value: 21 }] },
    ]
    expect(getActiveMagicEffects(items).attrCap.cha).toBe(21)
  })

  it('item sem effects não quebra', () => {
    const items = [
      { name: 'Item Comum', requiresAttunement: false, equipped: true },
    ]
    expect(getActiveMagicEffects(items).ac).toBe(0)
  })
})
```

- [ ] **Step 6: Rodar testes — devem falhar (engine ainda mock)**

```bash
npx vitest run src/test/magicItems.test.js
```
Expected: FAIL nos testes novos (todos retornam objeto vazio).

- [ ] **Step 7: Implementar `getActiveMagicEffects` completo**

Substituir `EMPTY_EFFECTS` e a stub por implementação real em `src/domain/magicItems.js`:

```js
// src/domain/magicItems.js

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/**
 * Determina se um item mágico está "ativo" — contribuindo com seus
 * `effects` para os cálculos da ficha.
 */
export function isItemActive(item) {
  if (!item) return false
  if (item.requiresAttunement) return item.attuned === true
  return item.equipped === true
}

function emptyEffects() {
  return {
    ac: 0,
    armorAc: 0,
    attack: 0,
    damage: 0,
    saves: 0,
    saveAbility: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    attrSet:     { str: null, dex: null, con: null, int: null, wis: null, cha: null },
    attrCap:     { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 },
    attrBonus:   ABILITIES.reduce((acc, k) => {
      acc[k] = { value: 0, max: 20 }
      return acc
    }, {}),
    resistances: [],
    advSaves: false,
    speed: 0,
    darkvision: 0,
    sources: [],
  }
}

/**
 * Agrega todos os efeitos de itens mágicos ativos.
 *
 * Regras:
 *  - Bônus numéricos somam (ac, armorAc, attack, damage, saves, saveAbility, speed, darkvision).
 *  - `attrSet`: maior valor ganha (não soma).
 *  - `attrCap`: maior teto ganha.
 *  - `attrBonus`: somam `value`s, `max` adota o MAIOR (mais permissivo).
 *  - `resistance` e `advSaves` são sets (sem stack).
 *  - `sources` lista `{ item, type, value, ability?, damage? }` para tooltips.
 *
 * @param {Array} items - inventory.items
 * @returns {object} efeitos agregados
 */
export function getActiveMagicEffects(items) {
  const agg = emptyEffects()
  const resSet = new Set()

  for (const item of items ?? []) {
    if (!isItemActive(item)) continue
    const effects = item.effects
    if (!Array.isArray(effects) || effects.length === 0) continue

    for (const ef of effects) {
      switch (ef.type) {
        case 'ac':
          agg.ac += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'ac', value: ef.value })
          break
        case 'armorAc':
          agg.armorAc += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'armorAc', value: ef.value })
          break
        case 'attack':
          agg.attack += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'attack', value: ef.value })
          break
        case 'damage':
          agg.damage += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'damage', value: ef.value })
          break
        case 'saves':
          agg.saves += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'saves', value: ef.value })
          break
        case 'saveAbility':
          if (ef.ability) {
            agg.saveAbility[ef.ability] = (agg.saveAbility[ef.ability] ?? 0) + (ef.value ?? 0)
            agg.sources.push({ item: item.name, type: 'saveAbility', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrSet':
          if (ef.ability) {
            const current = agg.attrSet[ef.ability]
            if (current == null || (ef.value ?? 0) > current) {
              agg.attrSet[ef.ability] = ef.value
            }
            agg.sources.push({ item: item.name, type: 'attrSet', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrCap':
          if (ef.ability) {
            const current = agg.attrCap[ef.ability] ?? 20
            if ((ef.value ?? 0) > current) agg.attrCap[ef.ability] = ef.value
            agg.sources.push({ item: item.name, type: 'attrCap', ability: ef.ability, value: ef.value })
          }
          break
        case 'attrBonus':
          if (ef.ability) {
            agg.attrBonus[ef.ability].value += ef.value ?? 0
            const maxFromEffect = ef.max ?? 20
            if (maxFromEffect > agg.attrBonus[ef.ability].max) {
              agg.attrBonus[ef.ability].max = maxFromEffect
            }
            agg.sources.push({ item: item.name, type: 'attrBonus', ability: ef.ability, value: ef.value, max: ef.max })
          }
          break
        case 'resistance':
          if (ef.damage) {
            resSet.add(String(ef.damage).toLowerCase())
            agg.sources.push({ item: item.name, type: 'resistance', damage: ef.damage })
          }
          break
        case 'advSaves':
          agg.advSaves = true
          agg.sources.push({ item: item.name, type: 'advSaves' })
          break
        case 'speed':
          agg.speed += ef.value ?? 0
          agg.sources.push({ item: item.name, type: 'speed', value: ef.value })
          break
        case 'darkvision':
          if ((ef.value ?? 0) > agg.darkvision) agg.darkvision = ef.value
          agg.sources.push({ item: item.name, type: 'darkvision', value: ef.value })
          break
        default:
          break // tipo desconhecido: ignora silenciosamente
      }
    }
  }

  agg.resistances = Array.from(resSet)
  return agg
}

/**
 * Aplica `attrSet`, `attrBonus` e `attrCap` ao score bruto de cada atributo.
 *
 *  base → attrSet (sobrescreve) → attrBonus (+value, respeitando max do effect) → attrCap (teto)
 *
 * @param {object} baseAttrs - { str, dex, con, int, wis, cha } já após racial+ASI
 * @param {object} effects   - retorno de getActiveMagicEffects
 * @returns {object} attrs efetivos
 */
export function getEffectiveAttributes(baseAttrs, effects) {
  const out = { ...baseAttrs }
  for (const k of ABILITIES) {
    let score = out[k] ?? 10

    // 1) attrSet sobrescreve, sem cap (Cinto de Força do Gigante "sets" o score absoluto).
    const setVal = effects.attrSet?.[k]
    if (setVal != null && setVal > score) score = setVal

    // 2) attrBonus: soma, respeitando max do effect.
    const bonus = effects.attrBonus?.[k]
    if (bonus && bonus.value > 0) {
      const capped = Math.min(score + bonus.value, bonus.max ?? 20)
      score = Math.max(score, capped) // só sobe, nunca desce
    }

    // 3) attrCap não eleva o score — apenas autoriza o usuário a colocar pontos extras
    //    (consumido pelo wizard/UI). Aqui só passamos adiante o score calculado.

    out[k] = score
  }
  return out
}

/** Raridades suportadas e classes Tailwind associadas. */
export const RARITY_INFO = {
  comum:       { label: 'Comum',       text: 'text-gray-300',    border: 'border-gray-500',    bg: 'bg-gray-700/30'    },
  incomum:     { label: 'Incomum',     text: 'text-green-300',   border: 'border-green-600',   bg: 'bg-green-900/20'   },
  raro:        { label: 'Raro',        text: 'text-blue-300',    border: 'border-blue-600',    bg: 'bg-blue-900/20'    },
  'muito-raro':{ label: 'Muito Raro',  text: 'text-purple-300',  border: 'border-purple-600',  bg: 'bg-purple-900/20'  },
  lendario:    { label: 'Lendário',    text: 'text-orange-300',  border: 'border-orange-600',  bg: 'bg-orange-900/20'  },
  artefato:    { label: 'Artefato',    text: 'text-red-300',     border: 'border-red-600',     bg: 'bg-red-900/20'     },
}

export function getRarityInfo(rarity) {
  return RARITY_INFO[String(rarity ?? '').toLowerCase()] ?? RARITY_INFO.comum
}
```

- [ ] **Step 8: Rodar testes — todos devem passar**

```bash
npx vitest run src/test/magicItems.test.js
```
Expected: PASS em todos os ~11 testes.

- [ ] **Step 9: Commit**

```bash
git add src/domain/magicItems.js src/test/magicItems.test.js
git commit -m "feat(magic-items): engine de efeitos magicos + isItemActive

Adiciona getActiveMagicEffects (funcao pura) que filtra itens
atunados/equipados e agrega effects em objeto consultavel.
Inclui getEffectiveAttributes para pipeline attrSet/attrBonus/attrCap
e RARITY_INFO para colorizacao na UI.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 2: Catálogo de itens mágicos (JSON)

**Files:**
- Create: `public/srd-data/phb-magic-items-pt.json`

- [ ] **Step 1: Criar o arquivo de catálogo**

Conteúdo completo (lista curada de itens DMG essenciais):

```json
[
  {
    "index": "anel-protecao",
    "name": "Anel de Proteção",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você ganha +1 de bônus em CA e em testes de resistência enquanto usar este anel.",
    "effects": [
      { "type": "ac", "value": 1 },
      { "type": "saves", "value": 1 }
    ]
  },
  {
    "index": "anel-resistencia-fogo",
    "name": "Anel de Resistência (Fogo)",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de fogo enquanto usar este anel.",
    "effects": [
      { "type": "resistance", "damage": "fogo" }
    ]
  },
  {
    "index": "anel-resistencia-frio",
    "name": "Anel de Resistência (Frio)",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de frio enquanto usar este anel.",
    "effects": [
      { "type": "resistance", "damage": "frio" }
    ]
  },
  {
    "index": "anel-resistencia-eletricidade",
    "name": "Anel de Resistência (Eletricidade)",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de eletricidade enquanto usar este anel.",
    "effects": [
      { "type": "resistance", "damage": "eletricidade" }
    ]
  },
  {
    "index": "anel-resistencia-acido",
    "name": "Anel de Resistência (Ácido)",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de ácido enquanto usar este anel.",
    "effects": [
      { "type": "resistance", "damage": "acido" }
    ]
  },
  {
    "index": "anel-resistencia-veneno",
    "name": "Anel de Resistência (Veneno)",
    "category": "anel",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de veneno enquanto usar este anel.",
    "effects": [
      { "type": "resistance", "damage": "veneno" }
    ]
  },
  {
    "index": "anel-mente-blindada",
    "name": "Anel da Mente Blindada",
    "category": "anel",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Enquanto usar este anel, você é imune a magia que permita criaturas lerem seus pensamentos.",
    "effects": []
  },
  {
    "index": "manto-protecao",
    "name": "Manto de Proteção",
    "category": "manto",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Você ganha +1 de bônus em CA e em testes de resistência enquanto usar este manto.",
    "effects": [
      { "type": "ac", "value": 1 },
      { "type": "saves", "value": 1 }
    ]
  },
  {
    "index": "manto-resistencia",
    "name": "Manto da Resistência",
    "category": "manto",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Você ganha +1 de bônus em testes de resistência de Constituição enquanto usar este manto.",
    "effects": [
      { "type": "saveAbility", "ability": "con", "value": 1 }
    ]
  },
  {
    "index": "manto-elfico",
    "name": "Capa Élfica",
    "category": "manto",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Você tem vantagem em testes de Furtividade e criaturas têm desvantagem em testes para perceber você enquanto usar esta capa com capuz.",
    "effects": []
  },
  {
    "index": "manto-carismatico",
    "name": "Manto de Carismático",
    "category": "manto",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Seu Carisma é 18 enquanto usar este manto. Se já for 18 ou maior, o item não tem efeito.",
    "effects": [
      { "type": "attrSet", "ability": "cha", "value": 18 }
    ]
  },
  {
    "index": "arma-mais-1",
    "name": "Arma +1",
    "category": "arma",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Você ganha +1 de bônus em rolagens de ataque e dano feitas com esta arma mágica.",
    "effects": [
      { "type": "attack", "value": 1 },
      { "type": "damage", "value": 1 }
    ]
  },
  {
    "index": "arma-mais-2",
    "name": "Arma +2",
    "category": "arma",
    "rarity": "raro",
    "requiresAttunement": false,
    "description": "Você ganha +2 de bônus em rolagens de ataque e dano feitas com esta arma mágica.",
    "effects": [
      { "type": "attack", "value": 2 },
      { "type": "damage", "value": 2 }
    ]
  },
  {
    "index": "arma-mais-3",
    "name": "Arma +3",
    "category": "arma",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Você ganha +3 de bônus em rolagens de ataque e dano feitas com esta arma mágica.",
    "effects": [
      { "type": "attack", "value": 3 },
      { "type": "damage", "value": 3 }
    ]
  },
  {
    "index": "armadura-mais-1",
    "name": "Armadura +1",
    "category": "armadura",
    "rarity": "raro",
    "requiresAttunement": false,
    "description": "Você ganha +1 de bônus em CA enquanto usar esta armadura.",
    "effects": [
      { "type": "armorAc", "value": 1 }
    ]
  },
  {
    "index": "armadura-mais-2",
    "name": "Armadura +2",
    "category": "armadura",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Você ganha +2 de bônus em CA enquanto usar esta armadura.",
    "effects": [
      { "type": "armorAc", "value": 2 }
    ]
  },
  {
    "index": "armadura-mais-3",
    "name": "Armadura +3",
    "category": "armadura",
    "rarity": "lendario",
    "requiresAttunement": false,
    "description": "Você ganha +3 de bônus em CA enquanto usar esta armadura.",
    "effects": [
      { "type": "armorAc", "value": 3 }
    ]
  },
  {
    "index": "escudo-mais-1",
    "name": "Escudo +1",
    "category": "armadura",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Você ganha +1 de bônus em CA enquanto empunhar este escudo.",
    "effects": [
      { "type": "ac", "value": 1 }
    ]
  },
  {
    "index": "escudo-mais-2",
    "name": "Escudo +2",
    "category": "armadura",
    "rarity": "raro",
    "requiresAttunement": false,
    "description": "Você ganha +2 de bônus em CA enquanto empunhar este escudo.",
    "effects": [
      { "type": "ac", "value": 2 }
    ]
  },
  {
    "index": "escudo-mais-3",
    "name": "Escudo +3",
    "category": "armadura",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Você ganha +3 de bônus em CA enquanto empunhar este escudo.",
    "effects": [
      { "type": "ac", "value": 3 }
    ]
  },
  {
    "index": "cinto-forca-gigante-colina",
    "name": "Cinto de Força do Gigante da Colina",
    "category": "cinto",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Enquanto usar este cinto, seu valor de Força é 21. Se sua Força já for igual ou maior, o item não tem efeito.",
    "effects": [
      { "type": "attrSet", "ability": "str", "value": 21 }
    ]
  },
  {
    "index": "cinto-forca-gigante-pedra",
    "name": "Cinto de Força do Gigante da Pedra/Gelo",
    "category": "cinto",
    "rarity": "muito-raro",
    "requiresAttunement": true,
    "description": "Enquanto usar este cinto, seu valor de Força é 23.",
    "effects": [
      { "type": "attrSet", "ability": "str", "value": 23 }
    ]
  },
  {
    "index": "cinto-forca-gigante-fogo",
    "name": "Cinto de Força do Gigante do Fogo",
    "category": "cinto",
    "rarity": "muito-raro",
    "requiresAttunement": true,
    "description": "Enquanto usar este cinto, seu valor de Força é 25.",
    "effects": [
      { "type": "attrSet", "ability": "str", "value": 25 }
    ]
  },
  {
    "index": "cinto-forca-gigante-nuvem",
    "name": "Cinto de Força do Gigante das Nuvens",
    "category": "cinto",
    "rarity": "lendario",
    "requiresAttunement": true,
    "description": "Enquanto usar este cinto, seu valor de Força é 27.",
    "effects": [
      { "type": "attrSet", "ability": "str", "value": 27 }
    ]
  },
  {
    "index": "cinto-forca-gigante-tempestade",
    "name": "Cinto de Força do Gigante da Tempestade",
    "category": "cinto",
    "rarity": "lendario",
    "requiresAttunement": true,
    "description": "Enquanto usar este cinto, seu valor de Força é 29.",
    "effects": [
      { "type": "attrSet", "ability": "str", "value": 29 }
    ]
  },
  {
    "index": "amuleto-saude",
    "name": "Amuleto da Saúde",
    "category": "amuleto",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Sua Constituição é 19 enquanto usar este amuleto. Se sua Constituição já for 19 ou maior, o item não tem efeito.",
    "effects": [
      { "type": "attrSet", "ability": "con", "value": 19 }
    ]
  },
  {
    "index": "manual-saude-corporal",
    "name": "Manual da Saúde Corporal",
    "category": "tomo",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Após estudar o livro por 48 horas em 6 dias, você ganha +2 em Constituição (máx. 22). O livro perde a magia.",
    "effects": [
      { "type": "attrBonus", "ability": "con", "value": 2, "max": 22 }
    ]
  },
  {
    "index": "manual-atletismo-ganho",
    "name": "Manual do Atletismo Ganho",
    "category": "tomo",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Após estudar o livro por 48 horas em 6 dias, você ganha +2 em Força (máx. 22). O livro perde a magia.",
    "effects": [
      { "type": "attrBonus", "ability": "str", "value": 2, "max": 22 }
    ]
  },
  {
    "index": "tomo-compreensao",
    "name": "Tomo da Compreensão",
    "category": "tomo",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Após estudar o livro por 48 horas em 6 dias, você ganha +2 em Sabedoria (máx. 22). O livro perde a magia.",
    "effects": [
      { "type": "attrBonus", "ability": "wis", "value": 2, "max": 22 }
    ]
  },
  {
    "index": "tomo-liderança",
    "name": "Tomo da Liderança e Influência",
    "category": "tomo",
    "rarity": "muito-raro",
    "requiresAttunement": false,
    "description": "Após estudar o livro por 48 horas em 6 dias, você ganha +2 em Carisma (máx. 22). O livro perde a magia.",
    "effects": [
      { "type": "attrBonus", "ability": "cha", "value": 2, "max": 22 }
    ]
  },
  {
    "index": "botas-aladas",
    "name": "Botas Aladas",
    "category": "botas",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Enquanto usar estas botas, você tem velocidade de voo igual à sua velocidade de caminhada (até 4 horas por dia).",
    "effects": [
      { "type": "speed", "value": 0 }
    ]
  },
  {
    "index": "botas-velocidade",
    "name": "Botas da Velocidade",
    "category": "botas",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Enquanto usar estas botas, você pode usar uma ação bônus para clicar os calcanhares. Sua velocidade dobra e ataques contra você têm desvantagem (até 10 minutos por dia).",
    "effects": []
  },
  {
    "index": "botas-elficas",
    "name": "Botas Élficas",
    "category": "botas",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Enquanto usar estas botas, seus passos não fazem som, qualquer que seja a superfície. Você também tem vantagem em testes de Furtividade.",
    "effects": []
  },
  {
    "index": "botas-terras-invernais",
    "name": "Botas das Terras Invernais",
    "category": "botas",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Você tem resistência a dano de frio e ignora terreno difícil de neve/gelo enquanto usar estas botas.",
    "effects": [
      { "type": "resistance", "damage": "frio" }
    ]
  },
  {
    "index": "pedra-boa-sorte",
    "name": "Pedra da Boa Sorte",
    "category": "bugiganga",
    "rarity": "incomum",
    "requiresAttunement": true,
    "description": "Enquanto a pedra estiver com você, você ganha +1 em testes de habilidade e em testes de resistência.",
    "effects": [
      { "type": "saves", "value": 1 }
    ]
  },
  {
    "index": "bracelete-defesa",
    "name": "Bracelete de Defesa",
    "category": "bugiganga",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Enquanto usar estes braceletes (sem armadura/escudo), seu CA = 13 + DES. Não funciona com armadura.",
    "effects": []
  },
  {
    "index": "gema-visao-noturna",
    "name": "Gema da Visão Noturna",
    "category": "bugiganga",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Enquanto segurar esta gema, você tem visão no escuro até 18m.",
    "effects": [
      { "type": "darkvision", "value": 60 }
    ]
  },
  {
    "index": "oculos-visao-noturna",
    "name": "Óculos da Visão Noturna",
    "category": "bugiganga",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Enquanto usar estes óculos, você tem visão no escuro até 18m.",
    "effects": [
      { "type": "darkvision", "value": 60 }
    ]
  },
  {
    "index": "varinha-mageletes",
    "name": "Varinha de Mageletes",
    "category": "varinha",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "A varinha tem 7 cargas. Use 1 carga para lançar mageletes. Recupera 1d6+1 cargas ao amanhecer.",
    "effects": []
  },
  {
    "index": "cajado-cura",
    "name": "Cajado da Cura",
    "category": "cajado",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Conjurador apenas. 10 cargas para lançar Curar Ferimentos, Cura Acelerada Maior e Cura em Massa. Recupera 1d6+4 cargas ao amanhecer.",
    "effects": []
  },
  {
    "index": "pocao-cura",
    "name": "Poção de Cura",
    "category": "pocao",
    "rarity": "comum",
    "requiresAttunement": false,
    "description": "Beba para recuperar 2d4+2 pontos de vida.",
    "effects": []
  },
  {
    "index": "pocao-cura-maior",
    "name": "Poção de Cura Maior",
    "category": "pocao",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Beba para recuperar 4d4+4 pontos de vida.",
    "effects": []
  },
  {
    "index": "pocao-resistencia-fogo",
    "name": "Poção de Resistência (Fogo)",
    "category": "pocao",
    "rarity": "incomum",
    "requiresAttunement": false,
    "description": "Beba para ter resistência a dano de fogo por 1 hora.",
    "effects": []
  },
  {
    "index": "pergaminho-bola-de-fogo",
    "name": "Pergaminho de Bola de Fogo",
    "category": "pergaminho",
    "rarity": "raro",
    "requiresAttunement": false,
    "description": "Conjure Bola de Fogo (3º nível). Pergaminho é consumido no uso.",
    "effects": []
  },
  {
    "index": "bola-cristal",
    "name": "Bola de Cristal",
    "category": "bugiganga",
    "rarity": "muito-raro",
    "requiresAttunement": true,
    "description": "Conjurador apenas. Você pode lançar Escrutínio através da bola.",
    "effects": []
  },
  {
    "index": "ioun-stone-prudencia",
    "name": "Pedra Ioun (Prudência)",
    "category": "bugiganga",
    "rarity": "muito-raro",
    "requiresAttunement": true,
    "description": "Enquanto esta pedra orbita sua cabeça, sua Sabedoria aumenta em 2 (máx. 20).",
    "effects": [
      { "type": "attrBonus", "ability": "wis", "value": 2, "max": 20 }
    ]
  },
  {
    "index": "ioun-stone-fortitude",
    "name": "Pedra Ioun (Fortitude)",
    "category": "bugiganga",
    "rarity": "muito-raro",
    "requiresAttunement": true,
    "description": "Enquanto esta pedra orbita sua cabeça, sua Constituição aumenta em 2 (máx. 20).",
    "effects": [
      { "type": "attrBonus", "ability": "con", "value": 2, "max": 20 }
    ]
  },
  {
    "index": "ioun-stone-protecao",
    "name": "Pedra Ioun (Proteção)",
    "category": "bugiganga",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Enquanto esta pedra orbita sua cabeça, você ganha +1 de bônus em CA.",
    "effects": [
      { "type": "ac", "value": 1 }
    ]
  },
  {
    "index": "talisma-sorte",
    "name": "Talismã da Sorte",
    "category": "bugiganga",
    "rarity": "lendario",
    "requiresAttunement": true,
    "description": "Enquanto usar este talismã, você pode rolar novamente um teste falho 1 vez por dia.",
    "effects": []
  },
  {
    "index": "berserker-axe",
    "name": "Machado do Berserker",
    "category": "arma",
    "rarity": "raro",
    "requiresAttunement": true,
    "description": "Você ganha +1 em ataque/dano com este machado. HP máximo aumenta em 1 por nível enquanto atunado.",
    "effects": [
      { "type": "attack", "value": 1 },
      { "type": "damage", "value": 1 }
    ]
  }
]
```

- [ ] **Step 2: Verificar JSON válido**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('public/srd-data/phb-magic-items-pt.json','utf8')).length)"
```
Expected: imprime `50` (ou número exato de itens).

- [ ] **Step 3: Commit**

```bash
git add public/srd-data/phb-magic-items-pt.json
git commit -m "feat(magic-items): catalogo PT-BR com ~50 itens DMG essenciais

Aneis, mantos, armas/armaduras +1/+2/+3, Cinto de Forca do Gigante
(5 variantes), Amuleto da Saude, Manual/Tomo (+2 atributo), Botas
e bugigangas. Itens descritivos (varinhas, pocoes, pergaminhos)
entram com effects vazios.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 3: Integração com CA — `calculateArmorClass` aceita efeitos

**Files:**
- Modify: `src/domain/equipment.js` (assinatura de `calculateArmorClass`)
- Modify: `src/test/equipment.test.js`

- [ ] **Step 1: Adicionar testes ao `equipment.test.js`**

Abrir `src/test/equipment.test.js` e acrescentar no final (antes do último `})` que fecha o describe-mor, ou em um novo describe):

```js
describe('calculateArmorClass — magicEffects', () => {
  const baseMods = { dex: 2, con: 0, wis: 0 }

  it('soma effects.ac no resultado final', () => {
    const r = calculateArmorClass({
      mods: baseMods,
      classIndex: 'guerreiro',
      armor: null,
      hasShield: false,
      magicEffects: { ac: 1, armorAc: 0 },
    })
    expect(r.ac).toBe(10 + 2 + 1) // sem armadura + DEX + Anel de Proteção
  })

  it('soma effects.armorAc na base da armadura equipada', () => {
    const r = calculateArmorClass({
      mods: baseMods,
      classIndex: 'guerreiro',
      armor: { type: 'armor', category: 'medium', baseAC: 14, maxDex: 2 },
      hasShield: false,
      magicEffects: { ac: 0, armorAc: 1 },
    })
    expect(r.ac).toBe(14 + 1 + 2) // brunea +1 + cappedDex
  })

  it('combina ac e armorAc', () => {
    const r = calculateArmorClass({
      mods: baseMods,
      classIndex: 'guerreiro',
      armor: { type: 'armor', category: 'medium', baseAC: 14, maxDex: 2 },
      hasShield: false,
      magicEffects: { ac: 1, armorAc: 1 },
    })
    expect(r.ac).toBe(14 + 1 + 2 + 1) // armadura +1 + DEX + Anel de Proteção
  })

  it('sem magicEffects (default) — comportamento antigo preservado', () => {
    const r = calculateArmorClass({
      mods: baseMods,
      classIndex: 'guerreiro',
      armor: null,
      hasShield: false,
    })
    expect(r.ac).toBe(12)
  })
})
```

- [ ] **Step 2: Rodar testes — devem falhar**

```bash
npx vitest run src/test/equipment.test.js
```
Expected: 4 testes novos FALHAM porque `magicEffects` não é considerado.

- [ ] **Step 3: Modificar `calculateArmorClass` para aceitar `magicEffects`**

Em `src/domain/equipment.js`, atualizar a assinatura e o cálculo:

```js
export function calculateArmorClass({
  mods,
  attributes = null,
  classIndex,
  classes = null,
  armor,
  hasShield,
  armorProficiencies = [],
  magicEffects = null,          // ← NOVO parâmetro opcional
}) {
  const dexMod = mods?.dex ?? 0
  const conMod = mods?.con ?? 0
  const wisMod = mods?.wis ?? 0
  const warnings = []
  let speedPenalty = 0

  const classSet = new Set(
    classes && classes.length
      ? classes.map(c => c?.class).filter(Boolean)
      : [classIndex].filter(Boolean)
  )

  // Bônus de armadura mágica (Armadura +1/+2/+3): soma ao baseAC quando há armadura.
  const armorAcBonus = magicEffects?.armorAc ?? 0
  const acBonus      = magicEffects?.ac ?? 0  // bônus genérico (Anel, Bracelete, Pedra Ioun)

  let base
  if (!armor) {
    if (classSet.has('barbaro')) {
      base = 10 + dexMod + conMod
    } else if (classSet.has('monge') && !hasShield) {
      base = 10 + dexMod + wisMod
    } else {
      base = 10 + dexMod
    }
  } else if (armor.category === 'light') {
    base = (armor.baseAC + armorAcBonus) + dexMod
  } else if (armor.category === 'medium') {
    const cappedDex = armor.maxDex == null ? dexMod : Math.min(dexMod, armor.maxDex)
    base = (armor.baseAC + armorAcBonus) + cappedDex
  } else if (armor.category === 'heavy') {
    base = armor.baseAC + armorAcBonus
  } else {
    base = 10 + dexMod
  }

  if (hasShield) base += ARMOR_TABLE.shield.baseAC

  base += acBonus                  // ← soma bônus mágico genérico

  // ── Avisos de regra (não modificam CA) ─────────────────────
  let noProficiency = false
  if (armor && !hasArmorProficiency(armorProficiencies, armor.category)) {
    warnings.push(
      `Sem proficiência em armadura ${armor.category} — desvantagem em testes/saves de FOR/DES e ` +
      `não pode conjurar magias (PHB p.144).`
    )
    noProficiency = true
  }
  if (hasShield && !hasArmorProficiency(armorProficiencies, 'shield')) {
    warnings.push('Sem proficiência em escudo — mesmas penalidades acima (PHB p.144).')
    noProficiency = true
  }

  if (armor && armor.strMin > 0 && attributes) {
    const str = attributes.str ?? 10
    if (str < armor.strMin) {
      speedPenalty = 10
      warnings.push(
        `FOR ${str} < ${armor.strMin} requerida pela armadura — velocidade -10 ft (PHB p.144).`
      )
    }
  }

  return { ac: base, warnings, speedPenalty, noProficiency }
}
```

- [ ] **Step 4: Rodar testes — equipamento e regressão**

```bash
npx vitest run src/test/equipment.test.js
```
Expected: PASS em todos (incluindo os 4 novos).

- [ ] **Step 5: Rodar suíte completa de testes para garantir regressão zero**

```bash
npx vitest run
```
Expected: 208+ testes verde (suíte anterior + 4 novos = ~212).

- [ ] **Step 6: Commit**

```bash
git add src/domain/equipment.js src/test/equipment.test.js
git commit -m "feat(magic-items): calculateArmorClass aceita magicEffects

Soma effects.ac (Anel de Protecao, Bracelete) ao CA final.
Soma effects.armorAc (Armadura +1/+2/+3) ao baseAC da armadura
equipada antes do calculo de DEX/maxDex. Default null preserva
o comportamento antigo.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 4: Pipeline de atributos efetivos no hook central

**Files:**
- Modify: `src/hooks/useCharacterCalculations.js`
- Modify: `src/test/calculations.test.js`

- [ ] **Step 1: Adicionar testes para `getEffectiveAttributes`**

Já está coberto pelo `magicItems.test.js` da Task 1, mas adicionar 1 teste de integração em `src/test/calculations.test.js`:

```js
// no topo dos imports do arquivo, adicionar:
import { getEffectiveAttributes } from '../domain/magicItems'

describe('getEffectiveAttributes — integração com pipeline de atributos', () => {
  const baseAttrs = { str: 14, dex: 16, con: 13, int: 10, wis: 12, cha: 8 }

  it('sem efeitos retorna atributos inalterados', () => {
    const r = getEffectiveAttributes(baseAttrs, {
      attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 0, max: 20 }, int: { value: 0, max: 20 },
        wis: { value: 0, max: 20 }, cha: { value: 0, max: 20 },
      },
    })
    expect(r).toEqual(baseAttrs)
  })

  it('Cinto de Força do Gigante das Nuvens: STR vira 27', () => {
    const r = getEffectiveAttributes(baseAttrs, {
      attrSet: { str: 27, dex: null, con: null, int: null, wis: null, cha: null },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 0, max: 20 }, int: { value: 0, max: 20 },
        wis: { value: 0, max: 20 }, cha: { value: 0, max: 20 },
      },
    })
    expect(r.str).toBe(27)
  })

  it('attrSet com value menor que score atual NÃO desce', () => {
    const r = getEffectiveAttributes({ ...baseAttrs, cha: 20 }, {
      attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: 18 },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 0, max: 20 }, int: { value: 0, max: 20 },
        wis: { value: 0, max: 20 }, cha: { value: 0, max: 20 },
      },
    })
    expect(r.cha).toBe(20) // manto não desce
  })

  it('Manual da Saúde: CON 13 + 2 = 15, respeitando max 22', () => {
    const r = getEffectiveAttributes(baseAttrs, {
      attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 2, max: 22 }, int: { value: 0, max: 20 },
        wis: { value: 0, max: 20 }, cha: { value: 0, max: 20 },
      },
    })
    expect(r.con).toBe(15)
  })

  it('attrBonus não estoura max', () => {
    const r = getEffectiveAttributes({ ...baseAttrs, wis: 21 }, {
      attrSet: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      attrBonus: {
        str: { value: 0, max: 20 }, dex: { value: 0, max: 20 },
        con: { value: 0, max: 20 }, int: { value: 0, max: 20 },
        wis: { value: 2, max: 20 }, cha: { value: 0, max: 20 },
      },
    })
    expect(r.wis).toBe(21) // já está acima do max 20; bônus não aplica
  })
})
```

- [ ] **Step 2: Rodar — testes devem passar (lógica já implementada na Task 1)**

```bash
npx vitest run src/test/calculations.test.js
```
Expected: PASS nos 5 testes novos.

- [ ] **Step 3: Integrar `getActiveMagicEffects` + `getEffectiveAttributes` no hook**

Em `src/hooks/useCharacterCalculations.js`, modificar:

**Imports** (após linha 20):
```js
import {
  getSpellSlots,
  clampUsedSlots,
  clampPactSlotsUsed,
  getClassSpellMath,
  getWarlockPactSlots,
} from '../utils/spellcasting'
import { getActiveMagicEffects, getEffectiveAttributes } from '../domain/magicItems'
```

**Dentro do `useMemo`**, logo após a desestruturação de atributos brutos e antes do cálculo de mods, computar efeitos e atributos efetivos:

Substituir o bloco que calcula `mods` (linhas ~57-64 atualmente) por:

```js
    // Efeitos mágicos agregados (itens atunados/equipados).
    const magicEffects = getActiveMagicEffects(items ?? [])

    // Atributos efetivos: base → attrSet → attrBonus (respeita max) → cap.
    // A partir daqui, todos os cálculos derivados usam estes valores.
    const effectiveAttrs = getEffectiveAttributes(
      { str, dex, con, int: intel, wis, cha },
      magicEffects
    )

    const mods = {
      str: getModifier(effectiveAttrs.str),
      dex: getModifier(effectiveAttrs.dex),
      con: getModifier(effectiveAttrs.con),
      int: getModifier(effectiveAttrs.int),
      wis: getModifier(effectiveAttrs.wis),
      cha: getModifier(effectiveAttrs.cha),
    }
```

Em seguida, passar `magicEffects` para `calculateArmorClass`. Localizar o bloco `acResult = calculateArmorClass({...})` e adicionar:

```js
    const acResult = calculateArmorClass({
      mods,
      attributes: effectiveAttrs,        // ← usa atributos efetivos (não os brutos)
      classIndex,
      classes: [
        { class: classIndex, level },
        ...mcs,
      ],
      armor,
      hasShield,
      armorProficiencies: armorProfs ?? [],
      magicEffects,                       // ← passa efeitos para somar ac/armorAc
    })
```

Aplicar saves: substituir o bloco que constrói `savingThrows` por:

```js
    const savingThrows = {}
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const isProficient = saves?.includes(key) ?? false
      const magicGeneral = magicEffects.saves ?? 0
      const magicSpecific = magicEffects.saveAbility?.[key] ?? 0
      savingThrows[key] = mods[key] + (isProficient ? profBonus : 0)
                        + magicGeneral + magicSpecific
    }
```

Adicionar `magicEffects` e `effectiveAttrs` ao retorno do hook:

```js
    return {
      profBonus,
      mods,
      effectiveAttrs,        // ← NOVO
      magicEffects,          // ← NOVO
      suggestedAC,
      acWarnings,
      speedPenalty,
      acNoProficiency: acNoProf,
      suggestedMaxHp,
      featSpeedBonus,
      initiative,
      spellSaveDC,
      spellAttackBonus,
      spellMathByClass,
      maxSlots,
      safeUsedSlots,
      pactSlots,
      safePactUsed,
      savingThrows,
      passivePerception,
      hpPercent,
      hpColor,
      spellAbilityKey,
      fmt: formatModifier,
    }
```

- [ ] **Step 4: Rodar suíte completa — verificar que nada quebrou**

```bash
npx vitest run
```
Expected: PASS em tudo. Se algum teste antigo falhar (componentes consumindo `mods` derivados de atributos brutos), ajustar para usar `effectiveAttrs` quando relevante.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCharacterCalculations.js src/test/calculations.test.js
git commit -m "feat(magic-items): pipeline de atributos efetivos no hook central

useCharacterCalculations agora computa getActiveMagicEffects() uma
vez e propaga via effectiveAttrs (atributos pos attrSet/attrBonus)
e magicEffects (objeto agregado). Saves somam magicEffects.saves +
saveAbility. CA passa magicEffects para somar ac/armorAc.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 5: UI — Botão "Buscar Mágico" no Inventory

**Files:**
- Modify: `src/components/CharacterSheet/Inventory.jsx`

- [ ] **Step 1: Adicionar import do catálogo e da engine**

No topo de `src/components/CharacterSheet/Inventory.jsx`, ajustar imports:

```js
import { useState, useEffect } from 'react'
import { SrdSearchModal } from '../SrdSearchModal'
import { findArmorByName, ARMOR_TABLE } from '../../domain/equipment'
import { getRarityInfo } from '../../domain/magicItems'
```

- [ ] **Step 2: Adicionar state e fetch do catálogo mágico**

No corpo do componente `Inventory`, junto ao bloco que faz fetch de equipment:

```js
  const [magicCatalog, setMagicCatalog] = useState([])
  const [magicSearchOpen, setMagicSearchOpen] = useState(false)

  useEffect(() => {
    fetch('/srd-data/phb-magic-items-pt.json')
      .then(r => r.json())
      .then(setMagicCatalog)
      .catch(() => {})
  }, [])
```

- [ ] **Step 3: Adicionar botão "Buscar Mágico" e o modal**

Localizar o bloco com os botões "Buscar SRD" e "+ Manual" (~linha 146) e acrescentar antes deles:

```jsx
            <button
              onClick={() => setMagicSearchOpen(true)}
              className="text-xs px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-semibold"
            >
              Buscar Mágico
            </button>
```

Depois do `SrdSearchModal` existente de equipment, adicionar um segundo:

```jsx
        {/* Magic item search */}
        <SrdSearchModal
          isOpen={magicSearchOpen}
          onClose={() => setMagicSearchOpen(false)}
          title="Buscar Item Mágico"
          items={magicCatalog}
          categories={[
            { key: 'arma',       label: 'Armas',         match: it => it.category === 'arma' },
            { key: 'armadura',   label: 'Armaduras',     match: it => it.category === 'armadura' },
            { key: 'anel',       label: 'Anéis',         match: it => it.category === 'anel' },
            { key: 'manto',      label: 'Mantos/Capas',  match: it => it.category === 'manto' },
            { key: 'cinto',      label: 'Cintos',        match: it => it.category === 'cinto' },
            { key: 'amuleto',    label: 'Amuletos',      match: it => it.category === 'amuleto' },
            { key: 'botas',      label: 'Botas',         match: it => it.category === 'botas' },
            { key: 'varinha',    label: 'Varinhas/Cajados', match: it => it.category === 'varinha' || it.category === 'cajado' },
            { key: 'tomo',       label: 'Tomos/Manuais', match: it => it.category === 'tomo' },
            { key: 'pocao',      label: 'Poções/Pergaminhos', match: it => it.category === 'pocao' || it.category === 'pergaminho' },
            { key: 'bugiganga',  label: 'Bugigangas',    match: it => it.category === 'bugiganga' },
          ]}
          onSelect={mag => {
            onAddItem({
              name: mag.name,
              qty: 1,
              weight: '',
              notes: mag.description ?? '',
              requiresAttunement: !!mag.requiresAttunement,
              attuned: false,
              magicItemIndex: mag.index,
              rarity: mag.rarity,
              effects: mag.effects ?? [],
            })
            setMagicSearchOpen(false)
          }}
          renderItem={mag => {
            const rar = getRarityInfo(mag.rarity)
            return (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{mag.name}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${rar.text} ${rar.border} ${rar.bg}`}>
                    {rar.label}
                  </span>
                  {mag.requiresAttunement && (
                    <span className="text-[10px] text-purple-300">💎 atunamento</span>
                  )}
                </div>
                {mag.description && (
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{mag.description}</div>
                )}
              </div>
            )
          }}
        />
```

- [ ] **Step 4: Rodar build + dev quickcheck**

```bash
npm run lint && npm run build
```
Expected: build OK sem warnings novos.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSheet/Inventory.jsx
git commit -m "feat(magic-items): botao Buscar Magico no Inventory

Adiciona segundo SrdSearchModal apontando para
phb-magic-items-pt.json com 11 categorias (arma, armadura, anel,
manto, cinto, amuleto, botas, varinha/cajado, tomo, pocao,
bugiganga). Item escolhido entra no inventario com effects,
rarity e magicItemIndex preservados.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 6: UI — Painel "Efeitos Ativos" e cores de raridade

**Files:**
- Modify: `src/components/CharacterSheet/Inventory.jsx`

- [ ] **Step 1: Importar `getActiveMagicEffects`**

Adicionar ao import existente de `magicItems`:

```js
import { getRarityInfo, getActiveMagicEffects } from '../../domain/magicItems'
```

- [ ] **Step 2: Computar efeitos ativos no componente**

Logo após o cálculo de `attunedCount`:

```js
  const magicEffects = getActiveMagicEffects(inventory.items ?? [])

  // Texto resumido p/ painel "Efeitos Ativos"
  const effectSummary = []
  if (magicEffects.ac)        effectSummary.push(`CA +${magicEffects.ac}`)
  if (magicEffects.armorAc)   effectSummary.push(`Armadura +${magicEffects.armorAc}`)
  if (magicEffects.attack)    effectSummary.push(`ATK +${magicEffects.attack}`)
  if (magicEffects.damage)    effectSummary.push(`DAN +${magicEffects.damage}`)
  if (magicEffects.saves)     effectSummary.push(`Saves +${magicEffects.saves}`)
  for (const ab of ['str','dex','con','int','wis','cha']) {
    if (magicEffects.saveAbility[ab])
      effectSummary.push(`Save ${ab.toUpperCase()} +${magicEffects.saveAbility[ab]}`)
    if (magicEffects.attrSet[ab] != null)
      effectSummary.push(`${ab.toUpperCase()} ${magicEffects.attrSet[ab]}`)
    if (magicEffects.attrBonus[ab].value)
      effectSummary.push(`${ab.toUpperCase()} +${magicEffects.attrBonus[ab].value}`)
  }
  if (magicEffects.speed)     effectSummary.push(`Velocidade +${magicEffects.speed} ft`)
  if (magicEffects.darkvision) effectSummary.push(`Visão no Escuro ${magicEffects.darkvision} ft`)
  if (magicEffects.resistances.length)
    effectSummary.push(`Resistência: ${magicEffects.resistances.join(', ')}`)
  if (magicEffects.advSaves)  effectSummary.push('Vantagem em saves')
```

- [ ] **Step 3: Renderizar painel "Efeitos Ativos" antes da lista de itens**

Após o bloco de "Atunamento" (`grid grid-cols-1 sm:grid-cols-2 gap-3`) e antes do bloco "Items":

```jsx
      {effectSummary.length > 0 && (
        <div className="bg-purple-950/30 border border-purple-700/50 rounded-lg p-3">
          <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest mb-2">
            Efeitos Mágicos Ativos
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {effectSummary.map((e, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded bg-purple-900/50 border border-purple-700/40 text-purple-200"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Aplicar borda de raridade nas linhas de item**

Nos dois blocos de render de item (mobile e desktop), localizar a div com `key={item.id}` e adicionar lógica de cor por raridade:

**Antes do return de cada item**, calcular:

```js
                const rarInfo = item.rarity ? getRarityInfo(item.rarity) : null
                const rarityRing = (isAttuned || (item.rarity && item.equipped))
                  ? (rarInfo?.border ?? 'border-gray-700/50')
                  : 'border-gray-700/50'
```

E ajustar o `className` da div externa do item para usar `rarityRing`:

```jsx
                  <div
                    key={item.id}
                    className={`rounded-lg px-3 py-2.5 ${
                      item.source === 'background' ? 'bg-amber-950/30 border border-amber-900/40' : `bg-gray-900 border ${rarityRing}`
                    } ${isEquipped ? 'ring-1 ring-amber-600/50' : ''} ${isAttuned ? 'ring-1 ring-purple-600/50' : ''}`}
                  >
```

(Aplicar a mesma mudança no bloco desktop.)

- [ ] **Step 5: Mostrar badge de raridade na linha do item**

Após o `<span className="text-sm text-white font-medium truncate">{item.name}</span>` em mobile e seu equivalente em desktop, adicionar:

```jsx
                        {rarInfo && (
                          <span className={`text-[9px] uppercase tracking-wider px-1 rounded border ${rarInfo.text} ${rarInfo.border}`}>
                            {rarInfo.label}
                          </span>
                        )}
```

- [ ] **Step 6: Verificar build + lint**

```bash
npm run lint && npm run build
```
Expected: limpo.

- [ ] **Step 7: Commit**

```bash
git add src/components/CharacterSheet/Inventory.jsx
git commit -m "feat(magic-items): painel Efeitos Ativos + cores de raridade

Adiciona bloco roxo no topo do inventario listando efeitos
agregados (CA, ATK, atributos, resistencias, etc.). Cada item
ganha badge de raridade colorida e borda matchada quando
atunado/equipado.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Task 7: E2E — fluxo completo

**Files:**
- Create: `src/test/e2e/magicItems.test.jsx`

- [ ] **Step 1: Criar arquivo de teste E2E**

```jsx
// src/test/e2e/magicItems.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { mockSrdFetch, clearStorage } from './helpers'

describe('Itens Mágicos — E2E', () => {
  beforeEach(() => {
    clearStorage()
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function createBaseCharacter(user) {
    // Atalho: criar ficha sintética via localStorage para chegar rápido no inventário.
    const ficha = {
      id: 'mag-test-1',
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0', schemaVersion: 2 },
      info: { name: 'Tester', race: 'humano', class: 'guerreiro', level: 5,
              alignment: '', multiclasses: [], feats: [] },
      attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 },
      appliedRacialBonuses: {},
      combat: {
        maxHp: 44, currentHp: 44, tempHp: 0, armorClass: 11, speed: 30,
        hitDice: { pool: { d10: { total: 5, used: 0 } } },
        attacks: [], concentrating: { spellIndex: null, spellName: null },
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      },
      proficiencies: {
        savingThrows: ['str', 'con'], skills: [], expertiseSkills: [],
        backgroundSkills: [], armor: ['light', 'medium', 'heavy', 'shield'],
        weapons: [], tools: [], languages: [],
      },
      spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
      inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
      traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    }
    localStorage.setItem('dnd-app-characters', JSON.stringify([ficha]))
  }

  it('atunar Anel de Proteção +1 → CA sobe +1 e contador 1/3', async () => {
    const user = userEvent.setup()
    await createBaseCharacter(user)
    render(<App />)

    // Abrir a ficha
    await user.click(await screen.findByText('Tester'))

    // Ir para aba Inventário
    await user.click(screen.getByRole('button', { name: /Invent[áa]rio/i }))

    // CA inicial: 10 + DEX(+1) = 11 sem armadura
    // Buscar item mágico
    await user.click(screen.getByRole('button', { name: /Buscar M[áa]gico/i }))

    // Selecionar Anel de Proteção
    const anel = await screen.findByText('Anel de Proteção')
    await user.click(anel)

    // Linha do anel aparece na lista; clicar no botão de atunar
    const btnAtunar = await waitFor(() => {
      const btns = document.querySelectorAll('button[title*="Atunar" i]')
      expect(btns.length).toBeGreaterThan(0)
      return btns[0]
    })
    await user.click(btnAtunar)

    // Contador atunamento deve ser 1/3
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    // Painel "Efeitos Mágicos Ativos" mostra CA +1 e Saves +1
    expect(screen.getByText(/Efeitos M[áa]gicos Ativos/)).toBeInTheDocument()
    expect(screen.getByText('CA +1')).toBeInTheDocument()
    expect(screen.getByText('Saves +1')).toBeInTheDocument()
  })

  it('limite de atunamento — 4º item desabilita botão', async () => {
    const user = userEvent.setup()
    const ficha = {
      id: 'mag-test-limit',
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0', schemaVersion: 2 },
      info: { name: 'Limite', race: 'humano', class: 'guerreiro', level: 5,
              alignment: '', multiclasses: [], feats: [] },
      attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 },
      appliedRacialBonuses: {},
      combat: {
        maxHp: 44, currentHp: 44, tempHp: 0, armorClass: 11, speed: 30,
        hitDice: { pool: { d10: { total: 5, used: 0 } } },
        attacks: [], concentrating: { spellIndex: null, spellName: null },
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      },
      proficiencies: {
        savingThrows: ['str','con'], skills: [], expertiseSkills: [], backgroundSkills: [],
        armor: ['light','medium','heavy','shield'], weapons: [], tools: [], languages: [],
      },
      spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
      inventory: {
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        items: [
          { id: 'a', name: 'Anel A', requiresAttunement: true, attuned: true,  qty: 1, effects: [] },
          { id: 'b', name: 'Anel B', requiresAttunement: true, attuned: true,  qty: 1, effects: [] },
          { id: 'c', name: 'Anel C', requiresAttunement: true, attuned: true,  qty: 1, effects: [] },
          { id: 'd', name: 'Anel D', requiresAttunement: true, attuned: false, qty: 1, effects: [] },
        ],
      },
      traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    }
    localStorage.setItem('dnd-app-characters', JSON.stringify([ficha]))

    render(<App />)
    await user.click(await screen.findByText('Limite'))
    await user.click(screen.getByRole('button', { name: /Invent[áa]rio/i }))

    // 3/3 visível
    expect(screen.getByText('3/3')).toBeInTheDocument()

    // Anel D — botão desabilitado
    const linhaD = screen.getByText('Anel D').closest('div[class*="rounded"]')
    const btnD = within(linhaD).getByRole('button', { name: /Limite atingido|Atunar/i })
    expect(btnD).toBeDisabled()
  })

  it('Cinto de Força do Gigante das Nuvens atunado → FOR efetiva 27', async () => {
    const user = userEvent.setup()
    const ficha = {
      id: 'mag-test-cinto',
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0', schemaVersion: 2 },
      info: { name: 'Cintador', race: 'humano', class: 'guerreiro', level: 5,
              alignment: '', multiclasses: [], feats: [] },
      attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 },
      appliedRacialBonuses: {},
      combat: {
        maxHp: 44, currentHp: 44, tempHp: 0, armorClass: 11, speed: 30,
        hitDice: { pool: { d10: { total: 5, used: 0 } } },
        attacks: [], concentrating: { spellIndex: null, spellName: null },
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      },
      proficiencies: {
        savingThrows: ['str','con'], skills: [], expertiseSkills: [], backgroundSkills: [],
        armor: ['light','medium','heavy','shield'], weapons: [], tools: [], languages: [],
      },
      spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
      inventory: {
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        items: [
          {
            id: 'cinto', name: 'Cinto de Força do Gigante das Nuvens',
            requiresAttunement: true, attuned: true, qty: 1,
            magicItemIndex: 'cinto-forca-gigante-nuvem', rarity: 'lendario',
            effects: [{ type: 'attrSet', ability: 'str', value: 27 }],
          },
        ],
      },
      traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    }
    localStorage.setItem('dnd-app-characters', JSON.stringify([ficha]))

    render(<App />)
    await user.click(await screen.findByText('Cintador'))

    // Aba Atributos (ou onde FOR é exibida)
    // O AttributeBox deve mostrar FOR 27 e mod +8.
    await waitFor(() => {
      expect(screen.getByText('27')).toBeInTheDocument()
    })
    // Modificador esperado: (27-10)/2 = 8.5 → floor → 8
    expect(screen.getByText('+8')).toBeInTheDocument()
  })

  it('Desatunar item → efeitos somem do painel', async () => {
    const user = userEvent.setup()
    const ficha = {
      id: 'mag-test-desatunar',
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0', schemaVersion: 2 },
      info: { name: 'Desa', race: 'humano', class: 'guerreiro', level: 1,
              alignment: '', multiclasses: [], feats: [] },
      attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 },
      appliedRacialBonuses: {},
      combat: {
        maxHp: 10, currentHp: 10, tempHp: 0, armorClass: 11, speed: 30,
        hitDice: { pool: { d10: { total: 1, used: 0 } } },
        attacks: [], concentrating: { spellIndex: null, spellName: null },
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      },
      proficiencies: {
        savingThrows: ['str','con'], skills: [], expertiseSkills: [], backgroundSkills: [],
        armor: ['light','medium','heavy','shield'], weapons: [], tools: [], languages: [],
      },
      spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
      inventory: {
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        items: [
          {
            id: 'anel', name: 'Anel de Proteção', requiresAttunement: true, attuned: true, qty: 1,
            magicItemIndex: 'anel-protecao', rarity: 'raro',
            effects: [{ type: 'ac', value: 1 }, { type: 'saves', value: 1 }],
          },
        ],
      },
      traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    }
    localStorage.setItem('dnd-app-characters', JSON.stringify([ficha]))

    render(<App />)
    await user.click(await screen.findByText('Desa'))
    await user.click(screen.getByRole('button', { name: /Invent[áa]rio/i }))

    // Painel ativo mostra CA +1
    expect(screen.getByText('CA +1')).toBeInTheDocument()

    // Desatunar clicando no 💎
    const linha = screen.getByText('Anel de Proteção').closest('div[class*="rounded"]')
    const btnDesatunar = within(linha).getByRole('button', { name: /Remover atunamento/i })
    await user.click(btnDesatunar)

    // Painel some
    await waitFor(() => {
      expect(screen.queryByText('CA +1')).not.toBeInTheDocument()
    })
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes E2E**

```bash
npx vitest run src/test/e2e/magicItems.test.jsx
```
Expected: PASS em 4 testes. Se algum falhar por seletor de aba/botão (texto "Inventário" diferente, etc.), ajustar conforme labels reais no app.

- [ ] **Step 3: Rodar suíte completa final**

```bash
npx vitest run
```
Expected: tudo verde (~216 testes — 208 anteriores + 5 atributos + 4 equipamento + 4 e2e).

- [ ] **Step 4: Rodar Playwright também**

```bash
npm run test:e2e
```
Expected: 7 testes verde (regressão básica preservada).

- [ ] **Step 5: Commit**

```bash
git add src/test/e2e/magicItems.test.jsx
git commit -m "test(magic-items): suite E2E (atunar, limite 3, efeito atributo)

4 testes RTL cobrem o fluxo completo: adicionar do catalogo,
atunar com CA subindo, limite de 3 itens, Cinto da Forca alterando
FOR efetiva, desatunar removendo efeitos do painel.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push origin HEAD:master && git push origin HEAD
```

---

## Self-Review

**Spec coverage:**
- Catálogo curado ~50 itens → Task 2 ✓
- Engine pura `getActiveMagicEffects` → Task 1 ✓
- `isItemActive` → Task 1 ✓
- Integração em CA (ac + armorAc) → Task 3 ✓
- Integração em atributos (`getEffectiveAttributes`) → Task 1 (lógica) + Task 4 (uso) ✓
- Integração em saves (geral + por atributo) → Task 4 ✓
- Botão "Buscar Mágico" + categorias + raridade colorida → Task 5 ✓
- Painel "Efeitos Ativos" → Task 6 ✓
- Borda colorida na linha do item por raridade → Task 6 ✓
- Tooltip com descrição → Task 5 (description em renderItem) e Task 6 (notes do item já mostradas) ✓
- Testes unitários + E2E → Tasks 1, 3, 4, 7 ✓

**Placeholder scan:** Nenhum "TBD/TODO" no plano. Cada step tem código completo.

**Type consistency:** `getActiveMagicEffects` retorna sempre o mesmo shape; `getEffectiveAttributes(attrs, effects)` consistente em todos os usos. `magicEffects` param em `calculateArmorClass` opcional (default `null`) — código trata `null` via `?.` defensivo (`magicEffects?.ac ?? 0`).

**Decisões de escopo fora do plano (mencionadas no spec, deferidas):**
- Auto-vinculação de ataques↔itens mágicos: usuário continua usando `magicBonus` manual nos ataques.
- `resistance`/`advSaves` só aparecem como badges informativas (sem motor de combate).
- Itens com cargas/uses (Varinha de Mageletes, Cajado da Cura): catálogo com `effects: []` e descrição apenas.
