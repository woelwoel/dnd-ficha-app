# Efeitos Ativos de Magia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buffs de magia (Bênção, Velocidade, Escudo da Fé) viram efeitos ativos: chips no header v2, CA/deslocamento efetivos, +1d4/vantagem automáticos nas rolagens por categoria, expiração por concentração e descanso longo.

**Architecture:** Camada pura `domain/activeEffects.js` agrega `combat.activeEffects[]` em (a) pacote de modificadores fixos fundido no `useCharacterCalculations` (derivados `effectiveAC`/`effectiveSpeed`, NUNCA muta a base editável nem o `suggestedAC`) e (b) riders/vantagens consumidos pelo `roll()` via resolver injetado no `DiceRollerProvider` (padrão DiceAccentSync). `parseAndRoll` ganha notação multi-termo (`1d20+1d4+5`) mantendo compat total do grupo principal. Dados de efeito = campo `effect` curado no `spell-mechanics-pt.json`.

**Tech Stack:** React 19, Vite 8, Vitest + Testing Library, Playwright. Spec: `docs/superpowers/specs/2026-07-07-efeitos-ativos-design.md`.

---

## Contexto essencial (leia antes de qualquer task)

- **Convenções:** commit com título SEM acentos + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; `git push` após cada commit. Testes: `npx vitest run <arquivo>`. Shell PowerShell (`;`, não `&&`). Mensagens de commit NÃO podem conter aspas duplas (bug de passagem de argumento do PowerShell 5.1).
- **`roll(notation, label, opts)`** (`src/context/DiceRollerContext.jsx:51`): parseAndRoll síncrono, entry retornada na hora, apresentação (3D/painel) decidida dentro. `opts.mode: 'adv'|'dis'`, `opts.crit`.
- **`parseAndRoll`** (`src/hooks/useDiceRoller.js:23`): HOJE aceita UM termo de dado (`1d20+5`). Entry: `{notation, rolls, modifier, total, sides, count, mode, allRolls?, keptIndex?}`. Consumidores dependem de `sides === 20 && rolls[0]` pra nat 20/1.
- **`useRollInteraction`** (`src/hooks/useRollInteraction.js`): gesto único (click/Shift/Alt/long-press) → `roll(notation, label, opts)`. Usado por `RollableRow` (v2), que é usado por SavesPanel/SkillsPanel/AbilityStrip.
- **`magicEffects`** (`src/systems/dnd5e/domain/magicItems.js`): pacote agregado de itens mágicos com `ac/saves/saveAbility/attrSet/attrBonus/speed/sources`, consumido em `useCharacterCalculations` (`src/systems/dnd5e/hooks/useCharacterCalculations.js`).
- **`setConcentration`** (`src/systems/dnd5e/hooks/useCharacter.js:712`): substitui `combat.concentrating {spellIndex, spellName}`.
- **`performLongRest`** (`src/systems/dnd5e/utils/rest.js:122`): função pura do descanso longo.
- **`spell-mechanics-pt.json`**: curado no sub-projeto A; `_ignore` contém os buffs (bencao, orientacao, resistencia, heroismo, aumentar-reduzir…). Validação em `src/test/spell-mechanics-data.test.js` — HOJE exige `damage|heal` em toda entrada (Task 3 relaxa para `damage|heal|effect`).
- **`Spells.jsx`** `handleCast` (linha ~52): gasta slot/pact e roda `spellRollPlan`+`executeCastPlan`. `SpellRow` tem os padrões transientes `castedAt`/`pendingHeal`.
- **Helper de teste v2:** `src/test/helpers/sheetV2TestContext.jsx` (`renderWithSheetContext`, `makeCharacter`, `makeCalc`, `makeUpdaters`, `makeDice`).
- **Regra de estilo:** componentes v2 usam `.v2-*`/`--v2-*`; utilitário de cor Tailwind novo em tela legada → rodar `node scripts/gen-bridge.mjs` e commitar a ponte. NÃO mutar `ref.current` no render — estado derivado via setState condicional.

### Contratos definidos neste plano (referência cruzada entre tasks)

```js
// domain/activeEffects.js
aggregateSpellEffects(list) → { fx: {ac, saves, saveAbility{}, speed, speedMultiplier},
                                riders: [{dice, categories, oneShot, effectId, effectName}],
                                advantages: [{mode, categories, abilities, effectId}] }
upsertEffect(list, effect) → list'      // substitui por id
removeEffect(list, id) → list'
pruneOnConcentrationChange(list, prevSpellIndex) → list'  // remove cast+concentration com id === prevSpellIndex
buildEffectInstance(spell, effectDef, source) → { id, name, source, concentration, mods, riders, advantages, summary }

// DiceRollerProvider
setRollEffectsResolver(fn | null)
// fn(category, ability) → null | { extraDice: ['1d4'], advantage: 'adv'|'dis'|null,
//                                  labelSuffix: ' · Bênção +1d4', onApplied: () => void }
// roll(notation, label, { category?, ability?, mode?, crit? })

// useCharacter updaters novos
addActiveEffect(effect)   // upsert por id
removeActiveEffect(id)
```

Categorias: `'attack' | 'save' | 'check'`. `ability` = chave canônica (`str|dex|con|int|wis|cha`).

---

### Task 1: Domínio — `activeEffects.js` (puro)

**Files:**
- Create: `src/systems/dnd5e/domain/activeEffects.js`
- Test: `src/test/activeEffects.test.js`

- [ ] **Step 1: Teste (falhando)** — criar `src/test/activeEffects.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  aggregateSpellEffects, upsertEffect, removeEffect,
  pruneOnConcentrationChange, buildEffectInstance, EFFECT_CATEGORIES,
} from '../systems/dnd5e/domain/activeEffects'

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const BENCAO = { id: 'bencao', name: 'Bênção', source: 'cast', concentration: true, riders: [{ dice: '1d4', categories: ['attack', 'save'] }], summary: '+1d4' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, mods: { ac: 2, speedMultiplier: 2 }, advantages: [{ categories: ['save'], abilities: ['dex'] }], summary: 'x2' }
const ORIENT = { id: 'orientacao', name: 'Orientação', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['check'], oneShot: true }], summary: '+1d4 teste' }

describe('aggregateSpellEffects', () => {
  it('vazio → neutro', () => {
    const { fx, riders, advantages } = aggregateSpellEffects([])
    expect(fx).toMatchObject({ ac: 0, saves: 0, speed: 0, speedMultiplier: 1 })
    expect(riders).toEqual([])
    expect(advantages).toEqual([])
  })
  it('soma fixos e multiplica multiplicadores', () => {
    const { fx } = aggregateSpellEffects([ESCUDO, VELOC])
    expect(fx.ac).toBe(4)
    expect(fx.speedMultiplier).toBe(2)
  })
  it('riders e advantages carregam effectId/effectName', () => {
    const { riders, advantages } = aggregateSpellEffects([BENCAO, VELOC, ORIENT])
    expect(riders).toEqual([
      { dice: '1d4', categories: ['attack', 'save'], oneShot: false, effectId: 'bencao', effectName: 'Bênção' },
      { dice: '1d4', categories: ['check'], oneShot: true, effectId: 'orientacao', effectName: 'Orientação' },
    ])
    expect(advantages).toEqual([{ mode: 'adv', categories: ['save'], abilities: ['dex'], effectId: 'velocidade' }])
  })
  it('saveAbility soma por chave', () => {
    const a = { id: 'a', name: 'A', source: 'manual', mods: { saveAbility: { con: 1 } } }
    const b = { id: 'b', name: 'B', source: 'manual', mods: { saveAbility: { con: 2, dex: 1 } } }
    expect(aggregateSpellEffects([a, b]).fx.saveAbility).toMatchObject({ con: 3, dex: 1 })
  })
})

describe('upsert/remove/prune', () => {
  it('upsert substitui por id (mesma magia nao empilha)', () => {
    const list = upsertEffect([ESCUDO], { ...ESCUDO, mods: { ac: 2 } })
    expect(list).toHaveLength(1)
  })
  it('ids distintos coexistem', () => {
    expect(upsertEffect([ESCUDO], BENCAO)).toHaveLength(2)
  })
  it('removeEffect tira por id', () => {
    expect(removeEffect([ESCUDO, BENCAO], 'bencao')).toEqual([ESCUDO])
  })
  it('prune remove cast+concentration da magia que saiu; manual fica', () => {
    const list = [ESCUDO, VELOC] // ESCUDO cast, VELOC manual
    expect(pruneOnConcentrationChange(list, 'escudo-da-fe')).toEqual([VELOC])
    expect(pruneOnConcentrationChange(list, 'outra-magia')).toEqual(list)
    expect(pruneOnConcentrationChange(list, null)).toEqual(list)
  })
})

describe('buildEffectInstance', () => {
  it('monta a instancia a partir da magia + effect curado', () => {
    const def = { concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
    expect(buildEffectInstance({ index: 'escudo-da-fe', name: 'Escudo da Fé' }, def, 'cast')).toEqual({
      id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true,
      mods: { ac: 2 }, riders: [], advantages: [], summary: '+2 CA',
    })
  })
})

describe('EFFECT_CATEGORIES', () => {
  it('exporta as categorias canonicas', () => {
    expect(EFFECT_CATEGORIES).toEqual(['attack', 'save', 'check'])
  })
})
```

- [ ] **Step 2:** `npx vitest run src/test/activeEffects.test.js` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar** `src/systems/dnd5e/domain/activeEffects.js`:

```js
/**
 * Efeitos ativos de magia (buffs) — spec 2026-07-07.
 * Camada PURA: agrega combat.activeEffects[] em (a) modificadores fixos no
 * formato magicEffects (+ speedMultiplier) e (b) riders/vantagens pro
 * pipeline de rolagem. Efeito NUNCA muta a base editável da ficha.
 */

export const EFFECT_CATEGORIES = ['attack', 'save', 'check']

export function aggregateSpellEffects(activeEffects = []) {
  const fx = { ac: 0, saves: 0, saveAbility: {}, speed: 0, speedMultiplier: 1 }
  const riders = []
  const advantages = []
  for (const e of activeEffects) {
    const m = e.mods ?? {}
    fx.ac += m.ac ?? 0
    fx.saves += m.saves ?? 0
    fx.speed += m.speed ?? 0
    fx.speedMultiplier *= m.speedMultiplier ?? 1
    for (const [k, v] of Object.entries(m.saveAbility ?? {})) {
      fx.saveAbility[k] = (fx.saveAbility[k] ?? 0) + (v ?? 0)
    }
    for (const r of e.riders ?? []) {
      riders.push({ dice: r.dice, categories: r.categories, oneShot: !!r.oneShot, effectId: e.id, effectName: e.name })
    }
    for (const a of e.advantages ?? []) {
      advantages.push({ mode: a.mode ?? 'adv', categories: a.categories, abilities: a.abilities ?? null, effectId: e.id })
    }
  }
  return { fx, riders, advantages }
}

/** Adiciona substituindo por id — mesma magia não empilha (PHB p.205). */
export function upsertEffect(list, effect) {
  return [...(list ?? []).filter(e => e.id !== effect.id), effect]
}

export function removeEffect(list, id) {
  return (list ?? []).filter(e => e.id !== id)
}

/**
 * Concentração saiu de `prevSpellIndex` (rompeu/trocou): efeitos criados por
 * conjuração PRÓPRIA daquela magia expiram. Efeitos `manual` (concentração
 * do ALIADO) nunca expiram por aqui.
 */
export function pruneOnConcentrationChange(list, prevSpellIndex) {
  if (!prevSpellIndex) return list ?? []
  return (list ?? []).filter(e =>
    !(e.source === 'cast' && e.concentration && e.id === prevSpellIndex)
  )
}

/** Instancia um efeito a partir da magia da ficha + `effect` curado. */
export function buildEffectInstance(spell, effectDef, source) {
  return {
    id: spell.index,
    name: spell.name,
    source,
    concentration: !!effectDef.concentration,
    mods: effectDef.mods ?? {},
    riders: effectDef.riders ?? [],
    advantages: effectDef.advantages ?? [],
    summary: effectDef.summary ?? '',
  }
}
```

- [ ] **Step 4:** `npx vitest run src/test/activeEffects.test.js` → PASS (10 testes).
- [ ] **Step 5:** Commit `feat(efeitos): dominio activeEffects (agregacao, upsert, prune)` + push.

---

### Task 2: Schema + updaters + expiração (concentração e descanso longo)

**Files:**
- Modify: `src/systems/dnd5e/domain/characterSchema.js` (combat ganha `activeEffects` default `[]` — siga o padrão dos campos v4/v5 existentes, ex.: `classFeatureUses`)
- Modify: `src/systems/dnd5e/hooks/useCharacter.js` (updaters novos + prune no setConcentration)
- Modify: `src/systems/dnd5e/utils/rest.js` (`performLongRest` limpa efeitos)
- Test: `src/test/activeEffects-lifecycle.test.js`

- [ ] **Step 1: Teste (falhando)** — criar `src/test/activeEffects-lifecycle.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'
import { performLongRest } from '../systems/dnd5e/utils/rest'

// Personagem mínimo válido pro hook (siga o shape dos testes existentes de
// useCharacter — se houver helper, use; senão monte inline como abaixo).
function seed() {
  return {
    info: { name: 'T', class: 'clerigo', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
    combat: {
      maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 16, speed: 9, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      activeEffects: [],
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], languages: [] },
    spellcasting: { ability: 'wis', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items: [] },
    traits: {},
  }
}

const FX = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const MANUAL = { id: 'bencao', name: 'Bênção', source: 'manual', concentration: true, riders: [], summary: '+1d4' }

describe('activeEffects — ciclo de vida', () => {
  it('addActiveEffect faz upsert; removeActiveEffect remove', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.updaters.addActiveEffect(FX))
    act(() => result.current.updaters.addActiveEffect({ ...FX }))
    expect(result.current.character.combat.activeEffects).toHaveLength(1)
    act(() => result.current.updaters.removeActiveEffect('escudo-da-fe'))
    expect(result.current.character.combat.activeEffects).toHaveLength(0)
  })

  it('romper concentracao remove efeito cast daquela magia; manual fica', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.updaters.addActiveEffect(FX))
    act(() => result.current.updaters.addActiveEffect(MANUAL))
    act(() => result.current.updaters.setConcentration({ index: 'escudo-da-fe', name: 'Escudo da Fé' }))
    act(() => result.current.updaters.setConcentration(null))
    const ids = result.current.character.combat.activeEffects.map(e => e.id)
    expect(ids).toEqual(['bencao'])
  })

  it('trocar de magia de concentracao expira o efeito da anterior', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.updaters.addActiveEffect(FX))
    act(() => result.current.updaters.setConcentration({ index: 'escudo-da-fe', name: 'Escudo da Fé' }))
    act(() => result.current.updaters.setConcentration({ index: 'bencao', name: 'Bênção' }))
    expect(result.current.character.combat.activeEffects).toHaveLength(0)
  })
})

describe('performLongRest limpa efeitos', () => {
  it('activeEffects vira [] apos descanso longo', () => {
    const char = seed()
    char.combat.activeEffects = [FX, MANUAL]
    const { character: after } = performLongRest(char)
    expect(after.combat.activeEffects).toEqual([])
  })
})
```

NOTA: confira a assinatura de retorno de `performLongRest` (leia `src/utils/rest.js` — pode retornar `{character, ...}` ou o personagem direto) e ajuste o destructuring do teste ANTES de rodar; o assert do `activeEffects` não muda.

- [ ] **Step 2:** `npx vitest run src/test/activeEffects-lifecycle.test.js` → FAIL.

- [ ] **Step 3: Implementar.**

(a) `characterSchema.js`: adicionar `activeEffects` ao objeto combat com default `[]` (mesmo padrão de `classFeatureUses`/`conditions` — localize o shape do combat e o default/migração correspondente).

(b) `useCharacter.js` — novos updaters (perto de `setConcentration`, linha ~712), usando o domínio:

```js
import { upsertEffect, removeEffect, pruneOnConcentrationChange } from '../domain/activeEffects'

  /** Adiciona/substitui um efeito ativo (buff de magia). Upsert por id. */
  const addActiveEffect = useCallback((effect) => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, activeEffects: upsertEffect(prev.combat?.activeEffects, effect) },
    }))
  }, [setCharacter])

  const removeActiveEffect = useCallback((id) => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, activeEffects: removeEffect(prev.combat?.activeEffects, id) },
    }))
  }, [setCharacter])
```

(c) `setConcentration` passa a podar efeitos da magia que SAI:

```js
  const setConcentration = useCallback((spell) => {
    setCharacter(prev => {
      const prevIndex = prev.combat?.concentrating?.spellIndex ?? null
      const nextIndex = spell?.index ?? null
      const activeEffects = prevIndex && prevIndex !== nextIndex
        ? pruneOnConcentrationChange(prev.combat?.activeEffects, prevIndex)
        : (prev.combat?.activeEffects ?? [])
      return {
        ...prev,
        combat: {
          ...prev.combat,
          activeEffects,
          concentrating: spell
            ? { spellIndex: spell.index, spellName: spell.name }
            : { spellIndex: null, spellName: null },
        },
      }
    })
  }, [setCharacter])
```

(d) Exportar `addActiveEffect, removeActiveEffect` no objeto `updaters` (as DUAS listas: retorno e deps do useMemo — siga o padrão dos vizinhos).

(e) `utils/rest.js` `performLongRest`: no personagem resultante, `combat.activeEffects: []` (localize onde o combat é reconstruído e acrescente; comentário: `// Buffs de magia não sobrevivem a 8h de descanso (spec efeitos ativos).`).

- [ ] **Step 4:** `npx vitest run src/test/activeEffects-lifecycle.test.js src/test/activeEffects.test.js` → PASS. Rodar também `npx vitest run src/test/rest.test.js` se existir (grep `rest` em src/test) → sem regressão.
- [ ] **Step 5:** Commit `feat(efeitos): schema activeEffects + updaters + expiracao (concentracao/descanso)` + push.

---

### Task 3: Curadoria do campo `effect` + validação estendida

**Files:**
- Modify: `public/srd-data/spell-mechanics-pt.json`
- Modify: `src/test/spell-mechanics-data.test.js`

- [ ] **Step 1: Estender a validação (falhando).** Em `src/test/spell-mechanics-data.test.js`:

(a) No teste `'todas as entradas curadas sao validas'`, TROCAR a linha:
```js
      expect(Boolean(e.damage?.length || e.heal), `${index}: sem dano nem cura`).toBe(true)
```
por:
```js
      expect(Boolean(e.damage?.length || e.heal || e.effect), `${index}: sem dano, cura nem efeito`).toBe(true)
```
E adicionar `'effect'` ao array `ENTRY_KEYS`.

(b) Adicionar dentro do MESMO loop (após o bloco `if (e.beams) {...}`):

```js
      if (e.effect) {
        const EF_KEYS = ['concentration', 'mods', 'riders', 'advantages', 'summary']
        const MOD_KEYS = ['ac', 'saves', 'saveAbility', 'speed', 'speedMultiplier']
        expect(Object.keys(e.effect).filter(k => !EF_KEYS.includes(k)), `${index}: effect chaves`).toEqual([])
        expect(typeof e.effect.summary === 'string' && e.effect.summary.length > 0, `${index}: effect.summary`).toBe(true)
        for (const k of Object.keys(e.effect.mods ?? {})) {
          expect(MOD_KEYS, `${index}: effect.mods.${k}`).toContain(k)
        }
        if (e.effect.mods?.speedMultiplier != null) {
          expect(e.effect.mods.speedMultiplier, `${index}: speedMultiplier`).toBeGreaterThanOrEqual(1)
        }
        for (const k of Object.keys(e.effect.mods?.saveAbility ?? {})) {
          expect(ABILITY_KEYS, `${index}: effect saveAbility ${k}`).toContain(k)
        }
        for (const r of e.effect.riders ?? []) {
          expect(parseDiceNotation(r.dice), `${index}: rider ${r.dice}`).not.toBeNull()
          expect(r.categories?.length, `${index}: rider sem categoria`).toBeGreaterThan(0)
          for (const c of r.categories) expect(['attack', 'save', 'check'], `${index}: rider cat ${c}`).toContain(c)
        }
        for (const a of e.effect.advantages ?? []) {
          for (const c of a.categories ?? []) expect(['attack', 'save', 'check'], `${index}: adv cat ${c}`).toContain(c)
          for (const ab of a.abilities ?? []) expect(ABILITY_KEYS, `${index}: adv ability ${ab}`).toContain(ab)
        }
      }
```

(c) Teste novo no mesmo describe, garantindo curadoria mínima:
```js
  it('buffs classicos tem effect curado', () => {
    for (const idx of ['bencao', 'escudo-da-fe', 'velocidade', 'orientacao', 'resistencia']) {
      expect(mech[idx]?.effect, `${idx}: sem effect`).toBeTruthy()
    }
  })
```

Rodar → FAIL (`bencao` etc. sem effect).

- [ ] **Step 2: Curadoria.** Fonte da verdade = prosa (`desc`) em `phb-spells-pt.json`/`tasha-spells-pt.json`. SEMPRE ler a prosa antes de gravar. Regras: mods só do subconjunto (`ac/saves/saveAbility/speed/speedMultiplier`); o que não é representável vai APENAS no `summary` (nunca mecânica aproximada); magia que estava no `_ignore` e ganha entrada `effect` DEVE sair do `_ignore` (o teste `_ignore nao duplica entrada` pega). Entradas novas (magia sem dado na prosa, ex. escudo-da-fe) são só `{ "effect": ... }`.

Curar (mínimo obrigatório + candidatos — confirme cada um na prosa):
```jsonc
"bencao":       { "effect": { "concentration": true, "riders": [{ "dice": "1d4", "categories": ["attack", "save"] }], "summary": "+1d4 em ataques e salvaguardas" } },
"escudo-da-fe": { "effect": { "concentration": true, "mods": { "ac": 2 }, "summary": "+2 CA" } },
"velocidade":   { "effect": { "concentration": true, "mods": { "ac": 2, "speedMultiplier": 2 }, "advantages": [{ "categories": ["save"], "abilities": ["dex"] }], "summary": "+2 CA · deslocamento ×2 · vantagem em salv. de DES · 1 ação extra (narre)" } },
"orientacao":   { "effect": { "concentration": true, "riders": [{ "dice": "1d4", "categories": ["check"], "oneShot": true }], "summary": "+1d4 em um teste de habilidade (uso único)" } },
"resistencia":  { "effect": { "concentration": true, "riders": [{ "dice": "1d4", "categories": ["save"], "oneShot": true }], "summary": "+1d4 em uma salvaguarda (uso único)" } }
```
Candidatos adicionais (curar se a prosa confirmar algo representável; senão pular — NÃO force): `escudo-arcano` (+5 CA, sem concentração, dura 1 rodada — chip manual dismiss; summary avisa a duração), `invisibilidade` (vantagem em ataques — `advantages: [{categories:['attack']}]` + summary), `aumentar-reduzir` (vantagem em testes E salvaguardas de FOR + summary do +1d4 no dano da arma), `heroismo` (summary-only: imune a amedrontado + tempHp/turno), `patas-de-aranha`, `pele-de-arvore`, `protecao-contra-veneno` (summary-only). Se a versão "reduzir" de aumentar-reduzir tornaria o efeito enganoso, prefira summary-only — decisão consciente, relatada no commit.

- [ ] **Step 3:** `npx vitest run src/test/spell-mechanics-data.test.js src/test/spell-mechanics-check.test.js` → PASS; `node scripts/gen-spell-mechanics.mjs --check` → OK.
- [ ] **Step 4:** Commit `data(efeitos): campo effect curado (buffs classicos) + validacao` + push.

---

### Task 4: Calc — merge de fixos + `effectiveAC`/`effectiveSpeed`

**Files:**
- Modify: `src/systems/dnd5e/hooks/useCharacterCalculations.js`
- Test: `src/test/useCharacterCalculations-effects.test.js`

REGRA CRÍTICA (spec): `fx.ac` e `fx.speed/speedMultiplier` NÃO entram em `suggestedAC` (o botão Sugerido gravaria o buff na base editável). Só `fx.saves/saveAbility` entram no derivado `savingThrows`.

- [ ] **Step 1: Teste (falhando)** — criar `src/test/useCharacterCalculations-effects.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../systems/dnd5e/hooks/useCharacterCalculations'

function baseChar(activeEffects = []) {
  return {
    info: { name: 'T', class: 'clerigo', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 10, dex: 14, con: 10, int: 10, wis: 16, cha: 10 },
    combat: { maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 16, speed: 9, activeEffects,
      concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 } },
    proficiencies: { savingThrows: ['wis'], skills: [], expertiseSkills: [], armor: [] },
    spellcasting: { ability: 'wis', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items: [] },
    traits: {},
  }
}

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, mods: { ac: 2, speedMultiplier: 2 }, summary: 'x2' }
const AURA   = { id: 'x', name: 'X', source: 'manual', mods: { saves: 1, saveAbility: { dex: 2 } }, summary: 's' }

describe('calc com efeitos ativos', () => {
  it('sem efeitos: effectiveAC = base, effectiveSpeed = base', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar()))
    expect(result.current.effectiveAC).toBe(16)
    expect(result.current.effectiveSpeed).toBe(9)
    expect(result.current.effectBreakdown).toEqual([])
  })
  it('Escudo da Fe: effectiveAC = 18; suggestedAC NAO muda', () => {
    const plain = renderHook(() => useCharacterCalculations(baseChar())).result.current
    const buffed = renderHook(() => useCharacterCalculations(baseChar([ESCUDO]))).result.current
    expect(buffed.effectiveAC).toBe(18)
    expect(buffed.suggestedAC).toBe(plain.suggestedAC)
  })
  it('Velocidade: speed (9) x2 = 18 e CA +2 (com Escudo: 16+4=20)', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar([ESCUDO, VELOC])))
    expect(result.current.effectiveSpeed).toBe(18)
    expect(result.current.effectiveAC).toBe(20)
  })
  it('saves de efeito entram no savingThrows (geral + por atributo)', () => {
    const plain = renderHook(() => useCharacterCalculations(baseChar())).result.current
    const buffed = renderHook(() => useCharacterCalculations(baseChar([AURA]))).result.current
    expect(buffed.savingThrows.dex).toBe(plain.savingThrows.dex + 3)  // +1 geral +2 dex
    expect(buffed.savingThrows.wis).toBe(plain.savingThrows.wis + 1)
  })
  it('effectBreakdown lista nome e resumo dos efeitos', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar([ESCUDO])))
    expect(result.current.effectBreakdown).toEqual([{ id: 'escudo-da-fe', name: 'Escudo da Fé', summary: '+2 CA' }])
  })
})
```

- [ ] **Step 2:** rodar → FAIL.

- [ ] **Step 3: Implementar** em `useCharacterCalculations.js`:

(a) Import: `import { aggregateSpellEffects } from '../domain/activeEffects'`.
(b) Ler `const activeEffects = combat?.activeEffects` junto dos outros destructurings do topo, e incluir `activeEffects` nas deps do useMemo.
(c) Dentro do useMemo, logo após `magicEffects`:

```js
    // Efeitos ativos de magia (buffs). fx.ac/speed NÃO entram no suggestedAC
    // (Sugerido grava na base editável) — só nos derivados effective*.
    const spellFx = aggregateSpellEffects(activeEffects ?? [])
```

(d) No loop de `savingThrows`, somar os efeitos (mesma linha dos itens mágicos):

```js
      savingThrows[key] = mods[key] + (isProficient ? profBonus : 0)
                        + magicGeneral + magicSpecific
                        + (spellFx.fx.saves ?? 0) + (spellFx.fx.saveAbility?.[key] ?? 0)
```

(e) Antes do `return`, os derivados novos:

```js
    const baseAC = combat?.armorClass ?? 10
    const effectiveAC = baseAC + (spellFx.fx.ac ?? 0)
    const baseSpeed = combat?.speed ?? 9
    const effectiveSpeed = Math.round((baseSpeed + (spellFx.fx.speed ?? 0)) * (spellFx.fx.speedMultiplier ?? 1) * 2) / 2
    const effectBreakdown = (activeEffects ?? []).map(e => ({ id: e.id, name: e.name, summary: e.summary }))
```

(f) No objeto retornado, acrescentar `effectiveAC, effectiveSpeed, effectBreakdown, spellFx`.

- [ ] **Step 4:** `npx vitest run src/test/useCharacterCalculations-effects.test.js` → PASS. Regressão: `npx vitest run src/test/integration/spells.test.jsx src/test/sheetV2-roll-rows.test.jsx` → PASS.
- [ ] **Step 5:** Commit `feat(efeitos): merge de fixos no calc (effectiveAC/effectiveSpeed, saves)` + push.

---

### Task 5: Parser multi-termo em `parseAndRoll`

**Files:**
- Modify: `src/hooks/useDiceRoller.js:23-67`
- Test: `src/test/parseAndRoll-multi.test.js`

CONTRATO DE COMPATIBILIDADE (inegociável): pra notação de UM termo, o retorno é IDÊNTICO ao atual. Multi-termo: `sides/rolls/count/allRolls/keptIndex` refletem o PRIMEIRO grupo (d20); `groups` lista todos; `modifier` soma os flats; `total` soma tudo. adv/dis só no primeiro grupo quando for 1d20. `crit` dobra todos os grupos (na prática nunca coexiste com riders — riders são só d20).

- [ ] **Step 1: Teste (falhando)** — criar `src/test/parseAndRoll-multi.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { parseAndRoll } from '../hooks/useDiceRoller'

describe('parseAndRoll — compat de um termo', () => {
  it('mantem o shape atual (sem groups obrigatorio pros consumidores)', () => {
    const r = parseAndRoll('2d6+3')
    expect(r.rolls).toHaveLength(2)
    expect(r.sides).toBe(6)
    expect(r.modifier).toBe(3)
    expect(r.total).toBe(r.rolls[0] + r.rolls[1] + 3)
  })
  it('modificador puro continua igual', () => {
    expect(parseAndRoll('5')).toMatchObject({ rolls: [], modifier: 5, total: 5, sides: null })
  })
  it('notacao invalida → null', () => {
    expect(parseAndRoll('banana')).toBeNull()
    expect(parseAndRoll('1d20+abc')).toBeNull()
  })
})

describe('parseAndRoll — multi-termo (riders)', () => {
  it('1d20+1d4+5: grupo principal = d20; groups tem os dois; total soma tudo', () => {
    const r = parseAndRoll('1d20+1d4+5')
    expect(r.sides).toBe(20)
    expect(r.rolls).toHaveLength(1)
    expect(r.groups).toHaveLength(2)
    expect(r.groups[0]).toMatchObject({ sides: 20 })
    expect(r.groups[1]).toMatchObject({ sides: 4 })
    expect(r.groups[1].rolls[0]).toBeGreaterThanOrEqual(1)
    expect(r.groups[1].rolls[0]).toBeLessThanOrEqual(4)
    expect(r.modifier).toBe(5)
    expect(r.total).toBe(r.rolls[0] + r.groups[1].rolls[0] + 5)
  })
  it('vantagem aplica SO no primeiro grupo 1d20', () => {
    const r = parseAndRoll('1d20+1d4', { mode: 'adv' })
    expect(r.allRolls).toHaveLength(2)          // dois d20 candidatos
    expect(r.rolls).toHaveLength(1)             // mantido
    expect(r.groups[1].rolls).toHaveLength(1)   // rider unico, sem adv
    expect(r.total).toBe(r.rolls[0] + r.groups[1].rolls[0])
  })
  it('nat 20 continua detectavel por sides/rolls[0]', () => {
    for (let i = 0; i < 50; i++) {
      const r = parseAndRoll('1d20+1d4+2')
      expect(r.rolls[0]).toBeGreaterThanOrEqual(1)
      expect(r.rolls[0]).toBeLessThanOrEqual(20)
    }
  })
  it('multiplos riders: 1d20+1d4+1d4', () => {
    const r = parseAndRoll('1d20+1d4+1d4')
    expect(r.groups).toHaveLength(3)
  })
})
```

- [ ] **Step 2:** rodar → FAIL (groups undefined / null pra multi-termo).

- [ ] **Step 3: Reescrever `parseAndRoll`** em `src/hooks/useDiceRoller.js` (substituir a função inteira, MANTENDO o comentário-doc adaptado):

```js
export function parseAndRoll(notation, opts = {}) {
  const { mode = 'normal', crit = false } = opts
  const n = String(notation).replace(/\s+/g, '').toLowerCase()

  // Número puro (ex: "+3", "5") — comportamento idêntico ao histórico.
  const flat = n.match(/^([+-]?\d+)$/)
  if (flat) {
    const num = parseInt(flat[1], 10)
    return { notation: n, rolls: [], modifier: num, total: num, sides: null, count: 0, mode: 'normal' }
  }

  // Multi-termo: primeiro termo é dado; termos seguintes são +dado ou ±flat.
  // Ex.: "1d20+1d4+5", "2d6+3", "d8-1". (Riders são sempre positivos.)
  if (!/^\d*d\d+(?:[+-]\d+|\+\d*d\d+)*$/.test(n)) return null
  const terms = n.match(/^\d*d\d+|[+-]\d*d\d+|[+-]\d+/g)

  const groups = []
  let modifier = 0
  for (const t of terms) {
    const dice = t.match(/^([+-]?)(\d*)d(\d+)$/)
    if (dice) {
      groups.push({
        count: Math.max(1, parseInt(dice[2] || '1', 10)),
        sides: parseInt(dice[3], 10),
      })
    } else {
      modifier += parseInt(t, 10)
    }
  }

  const primary = groups[0]
  const isAdvEligible = (mode === 'adv' || mode === 'dis')
    && primary.sides === 20 && primary.count === 1 && !crit

  let allRolls = null
  let keptIndex = null
  if (isAdvEligible) {
    // Vantagem/Desvantagem: APENAS o d20 principal rola duplo (PHB p.173).
    const a = rollDie(20)
    const b = rollDie(20)
    const kept = mode === 'adv' ? Math.max(a, b) : Math.min(a, b)
    primary.rolls = [kept]
    allRolls = [a, b]
    keptIndex = kept === a ? 0 : 1
  } else {
    const effCount = crit ? primary.count * 2 : primary.count
    primary.rolls = Array.from({ length: effCount }, () => rollDie(primary.sides))
    primary.count = effCount
  }

  for (const g of groups.slice(1)) {
    const effCount = crit ? g.count * 2 : g.count
    g.rolls = Array.from({ length: effCount }, () => rollDie(g.sides))
    g.count = effCount
  }

  const total = groups.reduce((s, g) => s + g.rolls.reduce((a, b) => a + b, 0), 0) + modifier

  return {
    notation,
    // Compat: o shape histórico espelha o PRIMEIRO grupo (nat 20/1, painel, 3D).
    rolls: primary.rolls,
    sides: primary.sides,
    count: primary.count,
    ...(allRolls ? { allRolls, keptIndex } : {}),
    groups: groups.map(g => ({ sides: g.sides, rolls: g.rolls })),
    modifier,
    total,
    mode: isAdvEligible ? mode : 'normal',
    ...(crit ? { crit } : {}),
  }
}
```

ATENÇÃO a dois detalhes de compat: (i) o retorno de um termo agora TAMBÉM carrega `groups` — ok, é aditivo; (ii) o campo `crit` era retornado sempre (`crit: false`) no caminho antigo — verifique com `grep -rn "\.crit" src/` se algum consumidor lê `entry.crit` e ajuste o spread pra `crit` incondicional se necessário (`crit,` em vez do spread condicional).

- [ ] **Step 4:** `npx vitest run src/test/parseAndRoll-multi.test.js` → PASS. REGRESSÃO AMPLA (o parser é usado por tudo): `npx vitest run src/test` filtrado não existe — rode `npx vitest run` completo → PASS (~1670).
- [ ] **Step 5:** Commit `feat(efeitos): parseAndRoll multi-termo (groups, compat total do grupo principal)` + push.

---

### Task 6: Provider — `setRollEffectsResolver` + matriz de vantagem

**Files:**
- Modify: `src/context/DiceRollerContext.jsx`
- Test: `src/test/diceRoller-effects.test.jsx`

- [ ] **Step 1: Teste (falhando)** — criar `src/test/diceRoller-effects.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DiceRollerProvider } from '../context/DiceRollerContext'
import { useDiceRoller } from '../hooks/useDiceRoller'

const wrapper = ({ children }) => <DiceRollerProvider>{children}</DiceRollerProvider>

function makeResolver(overrides = {}) {
  return vi.fn(() => ({ extraDice: ['1d4'], advantage: null, labelSuffix: ' · Bênção +1d4', onApplied: vi.fn(), ...overrides }))
}

describe('roll() com resolver de efeitos', () => {
  it('sem category: resolver NAO e consultado', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const resolver = makeResolver()
    act(() => result.current.setRollEffectsResolver(resolver))
    act(() => { result.current.roll('1d20+5', 'X') })
    expect(resolver).not.toHaveBeenCalled()
  })

  it('com category: estende notacao, sufixa label e chama onApplied', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const onApplied = vi.fn()
    const resolver = makeResolver({ onApplied })
    act(() => result.current.setRollEffectsResolver(resolver))
    let entry
    act(() => { entry = result.current.roll('1d20+5', 'Salvaguarda — SAB', { category: 'save', ability: 'wis' }) })
    expect(resolver).toHaveBeenCalledWith('save', 'wis')
    expect(entry.notation).toBe('1d20+5+1d4')
    expect(entry.groups).toHaveLength(2)
    expect(entry.label).toBe('Salvaguarda — SAB · Bênção +1d4')
    expect(onApplied).toHaveBeenCalledTimes(1)
  })

  it('resolver retorna null → rolagem normal', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => null))
    let entry
    act(() => { entry = result.current.roll('1d20+5', 'X', { category: 'attack' }) })
    expect(entry.notation).toBe('1d20+5')
  })

  it('matriz de vantagem: efeito adv sem gesto → adv; efeito adv + Alt(dis) → normal', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ extraDice: [], advantage: 'adv', labelSuffix: '', onApplied: () => {} })))
    let a, b
    act(() => { a = result.current.roll('1d20+5', 'X', { category: 'save' }) })
    expect(a.mode).toBe('adv')
    act(() => { b = result.current.roll('1d20+5', 'X', { category: 'save', mode: 'dis' }) })
    expect(b.mode).toBe('normal')       // cancelamento PHB p.173
  })

  it('gesto adv + efeito adv → adv (nao empilha)', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ extraDice: [], advantage: 'adv', labelSuffix: '', onApplied: () => {} })))
    let e
    act(() => { e = result.current.roll('1d20+5', 'X', { category: 'save', mode: 'adv' }) })
    expect(e.mode).toBe('adv')
    expect(e.allRolls).toHaveLength(2)
  })

  it('setRollEffectsResolver(null) desliga', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const resolver = makeResolver()
    act(() => result.current.setRollEffectsResolver(resolver))
    act(() => result.current.setRollEffectsResolver(null))
    act(() => { result.current.roll('1d20', 'X', { category: 'attack' }) })
    expect(resolver).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2:** rodar → FAIL.

- [ ] **Step 3: Implementar** em `DiceRollerContext.jsx`:

(a) Ref do resolver (não estado — não deve re-renderizar):
```js
import { useCallback, useEffect, useReducer, useRef } from 'react'
...
  const effectsResolverRef = useRef(null)
  const setRollEffectsResolver = useCallback(fn => { effectsResolverRef.current = fn }, [])
```

(b) Matriz de vantagem (função módulo, fora do componente):
```js
/** Combina gesto do usuário com vantagem de efeito (PHB p.173: par oposto = normal; nunca empilha). */
function combineMode(userMode, fxMode) {
  const u = userMode === 'adv' || userMode === 'dis' ? userMode : null
  if (!fxMode) return userMode ?? 'normal'
  if (!u) return fxMode
  return u === fxMode ? u : 'normal'
}
```

(c) No `roll` (linha ~51), ANTES do `parseAndRoll`:
```js
  const roll = useCallback((notation, label = '', opts = {}) => {
    let effNotation = notation
    let effLabel = label
    let onApplied = null
    let userMode = opts.mode ?? state.mode ?? 'normal'
    // Efeitos ativos (buffs): só quando o call site anota a categoria.
    if (opts.category && effectsResolverRef.current) {
      const eff = effectsResolverRef.current(opts.category, opts.ability ?? null)
      if (eff) {
        for (const d of eff.extraDice ?? []) effNotation += `+${d}`
        if (eff.labelSuffix) effLabel += eff.labelSuffix
        userMode = combineMode(opts.mode ?? state.mode ?? null, eff.advantage)
        onApplied = eff.onApplied ?? null
      }
    }
    const effectiveMode = userMode
    const result = parseAndRoll(effNotation, { mode: effectiveMode, crit: !!opts.crit })
    if (!result) return null
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label: effLabel, timestamp: Date.now(), ...result }
    onApplied?.()
    ...resto igual (SET_MODE reset, use3d etc.)...
```
No reset de mode, manter a condição atual (`state.mode !== 'normal' && !opts.mode`). No bloco 3D, `values`/`sides` continuam vindo do shape principal (`result.allRolls ?? result.rolls`, `result.sides`) — o rider NÃO anima (fallback aprovado no spec: d20 anima, total no toast já soma tudo).

(d) Expor no value do Provider: `setRollEffectsResolver`.

- [ ] **Step 4:** `npx vitest run src/test/diceRoller-effects.test.jsx` → PASS. Regressão: `npx vitest run src/test/castSpell.test.js src/test/integration/spell-cast.test.jsx` → PASS.
- [ ] **Step 5:** Commit `feat(efeitos): resolver de efeitos no roll() + matriz de vantagem` + push.

---

### Task 7: `EffectsSync` + categorias nos call sites

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/EffectsSync.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx` (render `<EffectsSync />` junto do `<DiceAccentSync />`)
- Modify: `src/hooks/useRollInteraction.js` (props `category`/`ability` → opts)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/RollableRow.jsx` (passthrough)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SidePanels.jsx` (SavesPanel: `category="save"` + `ability={key}`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SkillsPanel.jsx` (`category="check"` + ability da perícia se disponível no map local)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx` (testes de atributo `category="check"` + `ability={key}`; iniciativa `category="check"` + `ability="dex"`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/AttackRollButton.jsx` (`category: 'attack'` no roll de ataque)
- Modify: `src/systems/dnd5e/components/CharacterSheet/castSpell.js` (passos `attack` → `{ ...(mode ? { mode } : {}), category: 'attack' }`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2.jsx` (`category: 'save', ability: 'con'`)
- Test: `src/test/effectsSync.test.jsx` + ajuste em `src/test/castSpell.test.js`

- [ ] **Step 1: Teste do EffectsSync (falhando)** — criar `src/test/effectsSync.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { EffectsSync } from '../systems/dnd5e/components/CharacterSheet/v2/EffectsSync'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

const BENCAO = { id: 'bencao', name: 'Bênção', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['attack', 'save'] }], summary: '+1d4' }
const ORIENT = { id: 'orientacao', name: 'Orientação', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['check'], oneShot: true }], summary: 'x' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, advantages: [{ categories: ['save'], abilities: ['dex'] }], summary: 'x' }

function setup(effects, updaters = {}) {
  let captured = null
  const dice = { setRollEffectsResolver: vi.fn(fn => { captured = fn }) }
  const base = makeCharacter()
  renderWithSheetContext(<EffectsSync />, {
    character: { ...base, combat: { ...base.combat, activeEffects: effects } },
    dice,
    updaters: makeUpdaters(updaters),
  })
  return { resolver: () => captured, dice }
}

describe('EffectsSync', () => {
  it('registra resolver que filtra por categoria', () => {
    const { resolver } = setup([BENCAO])
    const r = resolver()
    expect(r('attack', null)).toMatchObject({ extraDice: ['1d4'] })
    expect(r('check', null)).toBeNull()
  })
  it('advantage filtra por ability (Velocidade: so salvaguarda de DES)', () => {
    const { resolver } = setup([VELOC])
    const r = resolver()
    expect(r('save', 'dex')).toMatchObject({ advantage: 'adv' })
    expect(r('save', 'con')).toBeNull()
    expect(r('save', null)).toBeNull()   // abilities especificadas exigem ability na rolagem
  })
  it('oneShot: onApplied remove o efeito', () => {
    const removeActiveEffect = vi.fn()
    const { resolver } = setup([ORIENT], { removeActiveEffect })
    const r = resolver()('check', 'wis')
    r.onApplied()
    expect(removeActiveEffect).toHaveBeenCalledWith('orientacao')
  })
  it('labelSuffix identifica a origem', () => {
    const { resolver } = setup([BENCAO])
    expect(resolver()('save', 'wis').labelSuffix).toBe(' · Bênção +1d4')
  })
  it('sem efeitos aplicaveis registra resolver que devolve null', () => {
    const { resolver } = setup([])
    expect(resolver() == null || resolver()('attack', null) == null).toBe(true)
  })
})
```

- [ ] **Step 2:** rodar → FAIL.

- [ ] **Step 3: Implementar `EffectsSync.jsx`:**

```jsx
import { useEffect } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'
import { aggregateSpellEffects } from '../../../domain/activeEffects'

/**
 * Registra no DiceRollerProvider o resolver de efeitos ativos da ficha
 * (padrão DiceAccentSync): riders (+1d4 da Bênção) e vantagens entram nas
 * rolagens anotadas com category/ability. v2-only — o v1 não monta isto.
 */
export function EffectsSync() {
  const { character, updaters } = useCharacterContext()
  const { setRollEffectsResolver } = useDiceRoller()
  const activeEffects = character.combat?.activeEffects

  useEffect(() => {
    const { riders, advantages } = aggregateSpellEffects(activeEffects ?? [])
    if (riders.length === 0 && advantages.length === 0) {
      setRollEffectsResolver(null)
      return () => setRollEffectsResolver(null)
    }
    setRollEffectsResolver((category, ability) => {
      const applicable = riders.filter(r => r.categories.includes(category))
      const adv = advantages.find(a =>
        a.categories.includes(category) &&
        (a.abilities ? (ability != null && a.abilities.includes(ability)) : true)
      )
      if (applicable.length === 0 && !adv) return null
      return {
        extraDice: applicable.map(r => r.dice),
        advantage: adv ? adv.mode : null,
        labelSuffix: applicable.map(r => ` · ${r.effectName} +${r.dice}`).join(''),
        onApplied: () => {
          for (const r of applicable) {
            if (r.oneShot) updaters.removeActiveEffect?.(r.effectId)
          }
        },
      }
    })
    return () => setRollEffectsResolver(null)
  }, [activeEffects, setRollEffectsResolver, updaters])

  return null
}
```

Em `SheetV2.jsx`, junto ao `<DiceAccentSync />`: `<EffectsSync />` (+ import).

NOTA: `makeDice` do helper de teste tem `setRollEffectsResolver`? Verifique `src/test/helpers/sheetV2TestContext.jsx` — se o `makeDice` default não tiver a chave, ADICIONE `setRollEffectsResolver: noop,` ao objeto default (senão testes existentes que montam SheetV2 quebram).

- [ ] **Step 4: Categorias nos call sites** (mudanças pequenas e mecânicas):

(a) `useRollInteraction.js`: assinatura vira `({ notation, label, crit = false, category = null, ability = null, onAfterRoll })`; em `handleClick`, `const opts = { crit }` ganha em seguida:
```js
    if (category) { opts.category = category; if (ability) opts.ability = ability }
```

(b) `RollableRow.jsx`: aceitar e repassar `category`/`ability` pro `useRollInteraction` (leia o arquivo; é passthrough de props).

(c) `SidePanels.jsx` SavesPanel: no `<RollableRow ...>` acrescentar `category="save" ability={key}`.

(d) `SkillsPanel.jsx`: acrescentar `category="check"` e, se o componente tiver o atributo da perícia à mão (map local de skills → ability), `ability={...}`; senão só `category` (Orientação não filtra por ability).

(e) `AbilityStrip.jsx`: cards de teste de atributo → `category="check" ability={key}`; linha de iniciativa → `category="check" ability="dex"`.

(f) `AttackRollButton.jsx`: na rolagem de ATAQUE (`roll(attackNotation, attackLabel, opts)`), acrescentar `opts.category = 'attack'` antes do roll. A rolagem de DANO fica sem categoria.

(g) `castSpell.js`: no passo attack, trocar `roll(step.notation, step.label, mode ? { mode } : {})` por `roll(step.notation, step.label, { ...(mode ? { mode } : {}), category: 'attack' })`. Ajustar em `src/test/castSpell.test.js` os asserts de `opts` dos passos de ataque: `expect(calls[0].opts).toEqual({ category: 'attack' })` e no caso adv `{ mode: 'adv', category: 'attack' }` (o teste `'mode adv propaga so pros ataques'` e o primeiro caso mudam).

(h) `ConcentrationPromptV2.jsx`: no `roll(...)`, o terceiro arg vira `{ ...(mode ? { mode } : {}), category: 'save', ability: 'con' }`. Ajustar o assert do teste `concentrationPromptV2.test.jsx` (`toHaveBeenCalledWith('1d20+9', expect.stringContaining('CD 12'), { category: 'save', ability: 'con' })`).

- [ ] **Step 5:** `npx vitest run src/test/effectsSync.test.jsx src/test/castSpell.test.js src/test/concentrationPromptV2.test.jsx src/test/sheetV2-roll-rows.test.jsx src/test/sheetV2-RollableRow.test.jsx src/test/integration/spell-cast.test.jsx` → PASS.
- [ ] **Step 6:** Commit `feat(efeitos): EffectsSync + categorias de rolagem nos call sites` + push.

---

### Task 8: UI — chips, catálogo, prompt pós-cast, valores efetivos

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/ActiveEffectsChips.jsx` (chips + catálogo)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/HeaderV2.jsx` (render junto às condições)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/AbilityStrip.jsx` (CA/deslocamento efetivos)
- Modify: `src/systems/dnd5e/components/CharacterSheet/Spells.jsx` + shells (prompt pós-cast; props novas `onAddActiveEffect`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` e `SheetContent.jsx` (wiring `onAddActiveEffect={addActiveEffect}` + `onSetConcentration` já existe como `setConcentration`)
- Test: `src/test/activeEffectsChips.test.jsx` + casos novos em `src/test/integration/spell-cast.test.jsx`

- [ ] **Step 1: Teste dos chips/catálogo (falhando)** — criar `src/test/activeEffectsChips.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveEffectsChips } from '../systems/dnd5e/components/CharacterSheet/v2/ActiveEffectsChips'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }

function setup({ effects = [], updaters = {}, readOnly = false, catalog } = {}) {
  const base = makeCharacter()
  renderWithSheetContext(
    <ActiveEffectsChips catalog={catalog ?? { 'bencao': { effect: { concentration: true, riders: [], summary: '+1d4 em ataques e salvaguardas' } } }}
      spellNames={{ 'bencao': 'Bênção' }} />,
    {
      character: { ...base, combat: { ...base.combat, activeEffects: effects } },
      updaters: makeUpdaters(updaters),
      readOnly,
    }
  )
}

describe('ActiveEffectsChips', () => {
  it('renderiza chip com nome e summary no title', () => {
    setup({ effects: [ESCUDO] })
    expect(screen.getByText('Escudo da Fé')).toBeInTheDocument()
  })
  it('dispensa pelo x', async () => {
    const user = userEvent.setup()
    const removeActiveEffect = vi.fn()
    setup({ effects: [ESCUDO], updaters: { removeActiveEffect } })
    await user.click(screen.getByRole('button', { name: /Remover Escudo da Fé/ }))
    expect(removeActiveEffect).toHaveBeenCalledWith('escudo-da-fe')
  })
  it('catalogo adiciona efeito manual', async () => {
    const user = userEvent.setup()
    const addActiveEffect = vi.fn()
    setup({ updaters: { addActiveEffect } })
    await user.click(screen.getByRole('button', { name: /\+ Efeito/ }))
    await user.click(await screen.findByRole('button', { name: /Bênção/ }))
    expect(addActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'bencao', source: 'manual' }))
  })
  it('readOnly: chips sem x nem catalogo', () => {
    setup({ effects: [ESCUDO], readOnly: true })
    expect(screen.getByText('Escudo da Fé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Efeito/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** rodar → FAIL.

- [ ] **Step 3: Implementar `ActiveEffectsChips.jsx`:**

```jsx
import { useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { buildEffectInstance } from '../../../domain/activeEffects'
import { EditDialog } from './EditDialog'

/**
 * Chips de efeitos ativos (buffs de magia) + catálogo "+ Efeito" pra buffs
 * recebidos de aliados (source: manual). Spec 2026-07-07.
 * `catalog` = spellMechanics (index → entry com .effect); `spellNames` =
 * index → nome exibível (derivado das fontes SRD pelo caller).
 */
export function ActiveEffectsChips({ catalog = {}, spellNames = {} }) {
  const { character, updaters, readOnly } = useCharacterContext()
  const [pickerOpen, setPickerOpen] = useState(false)
  const effects = character.combat?.activeEffects ?? []

  const catalogEntries = Object.entries(catalog)
    .filter(([, entry]) => entry?.effect)
    .map(([index, entry]) => ({ index, name: spellNames[index] ?? index, effect: entry.effect }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      {effects.map(e => (
        <span key={e.id} className="v2-chip" style={{ color: 'var(--v2-accent)' }} title={e.summary}>
          {e.name}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remover ${e.name}`}
              onClick={() => updaters.removeActiveEffect?.(e.id)}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', marginLeft: 4 }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <button type="button" className="v2-chip" style={{ cursor: 'pointer', border: 0 }} onClick={() => setPickerOpen(true)}>
          + Efeito
        </button>
      )}
      <EditDialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Efeitos de magia (recebidos de aliados)" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {catalogEntries.length === 0 && <span className="v2-mut">Nenhum efeito catalogado.</span>}
          {catalogEntries.map(({ index, name, effect }) => (
            <button
              key={index}
              type="button"
              className="v2-btn"
              style={{ textAlign: 'left' }}
              onClick={() => {
                updaters.addActiveEffect?.(buildEffectInstance({ index, name }, effect, 'manual'))
                setPickerOpen(false)
              }}
            >
              <strong>{name}</strong> <span className="v2-mut">— {effect.summary}</span>
            </button>
          ))}
        </div>
      </EditDialog>
    </>
  )
}
```

- [ ] **Step 4: HeaderV2.** No bloco de chips (após o map de `conditions`, antes do botão "+ Condição"), renderizar `<ActiveEffectsChips catalog={spellMechanics} spellNames={spellNames} />` onde:
```js
import { useLazySrdDataset, useSrd } from '../../../data/SrdProvider'
import { ActiveEffectsChips } from './ActiveEffectsChips'
...
  const spellMechanics = useLazySrdDataset('spellMechanics')
  const { spells: allSpells } = useSrd()
  const spellNames = Object.fromEntries((allSpells ?? []).map(s => [s.index, s.name]))
```
(Confira o import path de `SrdProvider` a partir de `v2/`: `../../../data/SrdProvider`.)

- [ ] **Step 5: AbilityStrip — valores efetivos.** Onde exibe `character.combat?.armorClass ?? 10` (DUAS ocorrências, ~linhas 36 e 48), trocar por componente/expressão que usa `calc.effectiveAC` com destaque quando difere da base:
```jsx
          <span className="v2-ability-mod" style={calc.effectiveAC !== (character.combat?.armorClass ?? 10) ? { color: 'var(--v2-accent)' } : undefined}
            title={calc.effectiveAC !== (character.combat?.armorClass ?? 10)
              ? `${calc.effectiveAC} = ${character.combat?.armorClass ?? 10} base + efeitos: ${calc.effectBreakdown.map(e => e.name).join(', ')}`
              : undefined}>
            {calc.effectiveAC}
          </span>
```
Idem pro deslocamento (localize onde `combat.speed` é exibido no AbilityStrip/HeaderV2 — grep `speed` no v2 — e use `calc.effectiveSpeed` com o mesmo padrão de destaque/title). O `calc` vem do `useCharacterContext()` (já disponível nesses componentes).

- [ ] **Step 6: Prompt pós-cast no Spells.jsx.**

(a) Props novas em `Spells`: `onAddActiveEffect` e usar o `onSetConcentration` já existente. Em `handleCast`, após montar `mech`:
```js
    const effectDef = mech?.effect
    let effectOffer = null
    if (effectDef) {
      const instance = buildEffectInstance(spell, effectDef, 'cast')
      const isSelf = /^pessoal/i.test(String(spell.range ?? ''))
      if (isSelf) applyEffect(instance, spell, effectDef)
      else effectOffer = { instance, spell, effectDef }
    }
```
com o helper no escopo de `Spells()`:
```js
  // Criar efeito de conjuração PRÓPRIA também marca a concentração — é a
  // âncora da expiração automática (spec 2026-07-07).
  function applyEffect(instance, spell, effectDef) {
    onAddActiveEffect?.(instance)
    if (effectDef.concentration) onSetConcentration?.(spell)
  }
```
`handleCast` retorna `{ ...(resultado do executeCastPlan ?? {}), effectOffer }` — CUIDADO: hoje ele retorna `null` cedo quando não há `mech`/plan; reorganize para SEMPRE retornar `{ healTotal: 0, effectOffer }` quando houver `effectDef` (magia só-buff, ex. Escudo da Fé, não tem plan de rolagem). Imports novos: `buildEffectInstance` de `'../../domain/activeEffects'`.

(b) `SpellRow`: prop nova `onApplyEffect` (recebe `effectOffer`); estado `const [pendingEffect, setPendingEffect] = useState(null)`; em `castAt`, após o trato do `healTotal`:
```js
    if (result?.effectOffer) {
      setPendingEffect(result.effectOffer)
      setTimeout(() => setPendingEffect(null), 10000)
    }
```
Botão transiente (após o bloco do `pendingHeal`):
```jsx
      {pendingEffect != null && (
        <button
          onClick={() => { onApplyEffect?.(pendingEffect); setPendingEffect(null) }}
          className="flex-shrink-0 text-xs px-2 py-0.5 rounded border font-bold transition-colors border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40"
        >
          ✦ Aplicar em você?
        </button>
      )}
```
Na renderização do `<SpellRow>`: `onApplyEffect={({ instance, spell: sp, effectDef }) => applyEffect(instance, sp, effectDef)}`.

(c) Wiring: `MainBox.jsx` (destructurar `addActiveEffect` de updaters, passar `onAddActiveEffect={addActiveEffect}`) e `SheetContent.jsx` (idem — `addActiveEffect` vem de `updaters` linha ~90-106; adicione ao destructuring e à prop).

- [ ] **Step 7: Testes de integração** — adicionar em `src/test/integration/spell-cast.test.jsx` (no Harness, prop `onAddActiveEffect={spies.onAddActiveEffect ?? (() => {})}` e `onSetConcentration={spies.onSetConcentration ?? (() => {})}` — atenção: o Harness já passa `onSetConcentration={() => {}}`; troque pela versão espiável):

```jsx
describe('efeitos ativos no cast', () => {
  it('magia de buff com alcance nao-Pessoal mostra o botao Aplicar em voce', async () => {
    const user = userEvent.setup()
    const onAddActiveEffect = vi.fn()
    const onSetConcentration = vi.fn()
    const ESCUDO_SPELL = { id: 's5', index: 'escudo-da-fe', name: 'Escudo da Fé', level: 1, school: 'Abjuração', prepared: true, range: '18 metros' }
    render(<Harness initial={makeChar('clerigo', 'wis', [ESCUDO_SPELL])} classData={CLERIGO} spies={{ onAddActiveEffect, onSetConcentration }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onAddActiveEffect).not.toHaveBeenCalled()          // nao aplicou sozinho
    await user.click(await screen.findByRole('button', { name: /Aplicar em você/ }))
    expect(onAddActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'escudo-da-fe', source: 'cast' }))
    expect(onSetConcentration).toHaveBeenCalled()              // ancora da expiracao
  })

  it('alcance Pessoal aplica o efeito direto, sem prompt', async () => {
    const user = userEvent.setup()
    const onAddActiveEffect = vi.fn()
    // range forjado como Pessoal pra exercitar o caminho auto (o isSelf lê o
    // objeto da ficha, não a fonte SRD)
    const BUFF_SELF = { id: 's6', index: 'bencao', name: 'Bênção', level: 1, school: 'Encantamento', prepared: true, range: 'Pessoal' }
    render(<Harness initial={makeChar('clerigo', 'wis', [BUFF_SELF])} classData={CLERIGO} spies={{ onAddActiveEffect }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onAddActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'bencao', source: 'cast' }))
    expect(screen.queryByRole('button', { name: /Aplicar em você/ })).not.toBeInTheDocument()
  })
})
```
(Passe os spies pelo Harness: acrescente `onAddActiveEffect` e troque o `onSetConcentration` fixo por `spies.onSetConcentration ?? (() => {})`.)

- [ ] **Step 8:** `npx vitest run src/test/activeEffectsChips.test.jsx src/test/integration/spell-cast.test.jsx` → PASS. `node scripts/gen-bridge.mjs` (o botão novo reusa classes amber já cobertas — se a ponte mudar, commitar junto). Regressão: `npx vitest run src/test/sheetV2-RollableRow.test.jsx src/test/concentrationPromptV2.test.jsx` → PASS.
- [ ] **Step 9:** Commit `feat(efeitos): chips + catalogo + prompt pos-cast + valores efetivos` + push.

---

### Task 9: E2E + bump SW + gates finais

**Files:**
- Create: `e2e-pw/active-effects.spec.js`
- Modify: `vite.config.js` (changelog + `srd-data-v22` → `srd-data-v23`)

- [ ] **Step 1: Bump.** No comentário-changelog do bloco `/srd-data/` em `vite.config.js`, acrescentar (imitando o estilo local): `//    v22 → v23 (2026-07-07): campo effect no spell-mechanics (efeitos ativos)`. Trocar `cacheName: 'srd-data-v22'` por `'srd-data-v23'`.

- [ ] **Step 2: E2E** — criar `e2e-pw/active-effects.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Escudo da Fé (alcance 18m → prompt): conjurar, aplicar em você → chip
// aparece e a CA efetiva sobe (16 → 18); romper concentração → tudo volta.
test('efeito ativo: conjurar Escudo da Fe, aplicar, CA sobe e expira ao romper', async ({ context, page }) => {
  const id = '66666666-6666-4666-8666-666666666666'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Clerigo Buffado', {
      shortId: 'BUFFCLERBC',
      info: { name: 'Clerigo Buffado', race: 'humano', class: 'clerigo', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'sabio' },
      attributes: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
      combat: {
        maxHp: 21, currentHp: 21, tempHp: 0, armorClass: 16, speed: 9,
        hitDice: { pool: { d8: { total: 3, used: 0 } } }, attacks: [],
        concentrating: { spellIndex: null, spellName: null }, activeEffects: [],
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
        conditions: [], inspiration: false, exhaustion: 0,
      },
      spellcasting: {
        ability: 'wis', usedSlots: {}, pactSlotsUsed: 0,
        spells: [{ id: 'sp1', index: 'escudo-da-fe', name: 'Escudo da Fé', level: 1, school: 'Abjuração', prepared: true, range: '18 metros', concentration: true }],
      },
    })],
  })
  await page.goto('/c/BUFFCLERBC')
  await expect(page.getByText('Clerigo Buffado').first()).toBeVisible()

  // CA base visível
  await expect(page.getByText('16').first()).toBeVisible()

  // Conjura no Nv 1 e aplica o efeito em si
  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await page.getByRole('button', { name: 'Conjurar' }).first().click()
  await page.getByRole('button', { name: /^Nv 1/ }).first().click()
  await page.getByRole('button', { name: /Aplicar em você/ }).first().click()

  // Chip aparece e CA efetiva sobe pra 18
  await expect(page.getByText('Escudo da Fé').first()).toBeVisible()
  await expect(page.getByText('18').first()).toBeVisible()

  // Romper concentração (chip/banner da aba Magias) → efeito expira
  await page.getByRole('button', { name: 'Romper' }).first().click()
  await expect(page.getByText('18')).toHaveCount(0)
})
```
NOTA: os seletores de texto de CA podem colidir com outros números na página; se `getByText('18')` for ambíguo, restrinja ao container da CA (ex.: `page.locator('.v2-ability-mod', { hasText: '18' })`) mantendo as MESMAS asserções semânticas (CA 16 → 18 → 16). O botão "Romper" existe no banner de concentração da aba Magias (Spells.jsx) — se o nome colidir com o do ConcentrationPromptV2, use `.first()`.

- [ ] **Step 3:** `npx playwright test e2e-pw/active-effects.spec.js` → PASS (ajuste seletores conforme a NOTA, sem trocar asserções).
- [ ] **Step 4: Gates.** `npx vitest run` (~1690+, flake conhecido LoginScreen/ResetPassword — se falhar só isso, re-rode isolado); `npm run build` (conferir `srd-data-v23` no `dist/sw.js`); `npx playwright test` (25 specs).
- [ ] **Step 5:** Commit `test(efeitos): e2e do Escudo da Fe + bump srd-data-v23` + push.

---

## Fora de escopo (NÃO implementar)

Timer de rodadas; debuffs/alvos externos; poções; ação extra da Velocidade como mecânica; chips no shell v1; efeitos custom free-form; `attrSet`/`attrBonus` em efeitos; composição 3D do rider (d4 não anima — fallback aprovado).

## Verificação final (depois da Task 9)

Gates verdes → merge na master com `--no-ff` + push (deploy automático, preferência registrada do dono) + deletar branch. Rodar `node scripts/gen-spell-mechanics.mjs --check` uma última vez antes do merge.
