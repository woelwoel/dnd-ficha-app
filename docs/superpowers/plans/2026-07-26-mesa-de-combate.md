# Mesa de Combate — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Mestre uma tela de combate dentro da mesa — iniciativa, HP dos monstros, condições e dano aplicados na ficha real do jogador, e descanso da companhia em lote.

**Architecture:** Domínio puro novo (`domain/encounter.js`) guarda o estado do encontro; a persistência é uma tabela `encounters` só do Mestre; a escrita nas fichas dos jogadores passa por duas RPCs `security definer` (patch estreito de combate e save de doc completo), com a aritmética de regra ficando nas funções puras que a ficha do jogador já usa (`applyDamage`, `performLongRest`).

**Tech Stack:** React 19 + Vite, Supabase (Postgres + RLS + Realtime), Zod, Vitest + Testing Library, Playwright.

**Spec:** [`docs/superpowers/specs/2026-07-26-mesa-de-combate-design.md`](../specs/2026-07-26-mesa-de-combate-design.md)

---

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `src/systems/dnd5e/domain/encounter.js` | estado do encontro: combatentes, iniciativa, turnos, HP de monstro |
| `src/systems/dnd5e/domain/dmPatch.js` | extrai o patch de combate (lista fechada) de um doc de ficha |
| `src/lib/encounters.js` | CRUD + realtime da tabela `encounters` (agnóstico do shape do state) |
| `src/lib/dmWrites.js` | as duas RPCs do Mestre + tradução de erro |
| `src/systems/dnd5e/components/Encounter/useEncounter.js` | hook: carrega/cria encontro, salva com lock, realtime |
| `src/systems/dnd5e/components/Encounter/EncounterScreen.jsx` | orquestra: companhia + encontro + fases |
| `src/systems/dnd5e/components/Encounter/SetupPanel.jsx` | quem entra na cena, adicionar monstros, rolar iniciativa |
| `src/systems/dnd5e/components/Encounter/CombatantRow.jsx` | uma linha + ações de HP/condição/remover |
| `src/systems/dnd5e/components/Encounter/PartyRestPanel.jsx` | descanso longo/curto em lote |
| `src/systems/dnd5e/components/Encounter/index.js` | barrel |
| `supabase/migrations/0015_encounters.sql` | tabela + RLS + trigger + duas RPCs |

**Modificados:**

| Arquivo | Mudança |
|---|---|
| `src/utils/storage.js:29` | `rowToCharacter` passa a ser exportado |
| `src/lib/campaigns.js:182` | `loadCampaignCharacters` passa a trazer `version` |
| `src/systems/dnd5e/components/Bestiary/BestiaryModal.jsx` | prop opcional `onPick` |
| `src/systems/dnd5e/ui.jsx` | export `Encounter` |
| `src/systems/ui-registry.js` | `getLazyEncounter` |
| `src/App.jsx` | rota `/campaigns/:id/combate` |
| `src/components/Campaigns/CampaignDetail.jsx` | botão "Rodar combate" (só DM) |
| `scripts/test-rls-isolation.mjs` | bloco de perímetro das duas RPCs |
| `e2e-pw/support/supabase-stub.js` | stub de `campaigns`/`encounters` + RPCs |

**Desvios do spec (deliberados, para o plano ficar implementável):**
- o spec listava `AddMonstersPanel.jsx` e `InitiativeRollPanel.jsx`; viraram `SetupPanel.jsx` (as duas coisas acontecem na mesma fase e compartilham estado) mais `useEncounter.js` para isolar a conversa com o banco;
- `domain/dmPatch.js` não estava na lista do spec — é o pedaço puro que monta o patch da RPC;
- o `state` do encontro ganha `nextSeq` (contador para ids estáveis de combatente).

---

## Task 1: Domínio — statblock → combatante

**Files:**
- Create: `src/systems/dnd5e/domain/encounter.js`
- Test: `src/test/encounter.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter.test.js
import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, npcStatsFromMonster, addPc, addNpc,
} from '../systems/dnd5e/domain/encounter'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6',
  dexterity: 14, xp: 50,
  armor_class: [{ type: 'armor', value: 15 }],
}

describe('npcStatsFromMonster', () => {
  it('lê CA do primeiro item de armor_class e HP médio do statblock', () => {
    expect(npcStatsFromMonster(GOBLIN)).toEqual({ ac: 15, maxHp: 7, initiativeBonus: 2, xp: 50 })
  })

  it('rola hit_points_roll quando rollHp=true', () => {
    // rng fixo em 0.99 → cada d6 sai 6 → 2d6 = 12
    const stats = npcStatsFromMonster(GOBLIN, { rollHp: true, rng: () => 0.99 })
    expect(stats.maxHp).toBe(12)
  })

  it('cai em defaults seguros com statblock incompleto', () => {
    expect(npcStatsFromMonster({ index: 'x', name: 'X' })).toEqual({ ac: 10, maxHp: 1, initiativeBonus: 0, xp: 0 })
  })
})

describe('addPc / addNpc', () => {
  it('adiciona PJ referenciando a ficha, sem HP próprio', () => {
    const s = addPc(emptyEncounterState(), { characterId: 'uuid-1', name: 'Thalior', initiativeBonus: 3 })
    expect(s.combatants).toHaveLength(1)
    expect(s.combatants[0]).toMatchObject({
      id: 'k1', kind: 'pc', characterId: 'uuid-1', name: 'Thalior',
      initiative: null, initiativeBonus: 3, orphaned: false,
    })
    expect(s.combatants[0].currentHp).toBeUndefined()
  })

  it('numera monstros repetidos e dá ids únicos', () => {
    let s = addNpc(emptyEncounterState(), GOBLIN)
    s = addNpc(s, GOBLIN)
    s = addNpc(s, GOBLIN)
    expect(s.combatants.map(c => c.name)).toEqual(['Goblin', 'Goblin 2', 'Goblin 3'])
    expect(s.combatants.map(c => c.id)).toEqual(['k1', 'k2', 'k3'])
    expect(s.combatants[0]).toMatchObject({ kind: 'npc', monsterIndex: 'goblin', currentHp: 7, maxHp: 7, tempHp: 0, conditions: [], defeated: false })
  })

  it('não reusa ordinal de monstro removido da lista', () => {
    let s = addNpc(addNpc(emptyEncounterState(), GOBLIN), GOBLIN) // Goblin, Goblin 2
    s = { ...s, combatants: s.combatants.filter(c => c.id !== 'k1') } // sobra Goblin 2
    s = addNpc(s, GOBLIN)
    expect(s.combatants.map(c => c.name)).toEqual(['Goblin 2', 'Goblin 3'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter.test.js`
Expected: FAIL — `Failed to resolve import ".../domain/encounter"`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/domain/encounter.js
/**
 * Domínio puro do encontro de combate (spec 2026-07-26 Mesa de Combate).
 *
 * Sem React e sem Supabase: recebe e devolve o `state` do encontro, que é o
 * jsonb da tabela `encounters`. Regra do PJ NÃO mora aqui — combatente `pc` só
 * referencia a ficha (`characterId`), porque HP duplicado é HP dessincronizado.
 */
import { getModifier } from '../utils/calculations'
import { parseDiceNotation } from './spellMechanics'

export function emptyEncounterState() {
  return { round: 0, activeId: null, started: false, combatants: [], nextSeq: 1 }
}

function rollNotation({ count, sides, mod }, rng) {
  let total = mod
  for (let i = 0; i < count; i++) total += Math.floor(rng() * sides) + 1
  return Math.max(1, total)
}

/** Campos do combatente `npc` derivados do statblock SRD. */
export function npcStatsFromMonster(monster, { rollHp = false, rng = Math.random } = {}) {
  const notation = parseDiceNotation(monster?.hit_points_roll ?? '')
  const maxHp = rollHp && notation
    ? rollNotation(notation, rng)
    : Math.max(1, monster?.hit_points ?? 1)
  return {
    // armor_class é ARRAY de objetos no SRD, não número.
    ac: monster?.armor_class?.[0]?.value ?? 10,
    maxHp,
    initiativeBonus: getModifier(monster?.dexterity ?? 10),
    xp: monster?.xp ?? 0,
  }
}

export function addPc(state, { characterId, name, initiativeBonus = 0 }) {
  return {
    ...state,
    nextSeq: state.nextSeq + 1,
    combatants: [...state.combatants, {
      id: `k${state.nextSeq}`,
      kind: 'pc',
      characterId,
      name,
      initiative: null,
      initiativeBonus,
      orphaned: false,
    }],
  }
}

export function addNpc(state, monster, opts = {}) {
  const stats = npcStatsFromMonster(monster, opts)
  // Ordinal = maior já usado + 1. Contar os presentes reusaria o número de um
  // monstro removido e colidiria com quem sobrou.
  const ordinal = state.combatants.reduce(
    (max, c) => (c.monsterIndex === monster.index ? Math.max(max, c.ordinal ?? 1) : max),
    0,
  ) + 1
  return {
    ...state,
    nextSeq: state.nextSeq + 1,
    combatants: [...state.combatants, {
      id: `k${state.nextSeq}`,
      kind: 'npc',
      monsterIndex: monster.index,
      ordinal,
      name: ordinal === 1 ? monster.name : `${monster.name} ${ordinal}`,
      initiative: null,
      initiativeBonus: stats.initiativeBonus,
      ac: stats.ac,
      maxHp: stats.maxHp,
      currentHp: stats.maxHp,
      tempHp: 0,
      xp: stats.xp,
      conditions: [],
      defeated: false,
    }],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter.test.js`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/encounter.js src/test/encounter.test.js
git commit -m "feat(mesa-de-combate): dominio do encontro - combatentes de ficha e statblock"
```

---

## Task 2: Domínio — iniciativa e turnos

**Files:**
- Modify: `src/systems/dnd5e/domain/encounter.js`
- Test: `src/test/encounter-turns.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter-turns.test.js
import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, addPc, rollInitiative, setInitiative,
  sortByInitiative, startEncounter, nextTurn, previousTurn,
} from '../systems/dnd5e/domain/encounter'

function party() {
  let s = emptyEncounterState()
  s = addPc(s, { characterId: 'a', name: 'Ana',   initiativeBonus: 2 })
  s = addPc(s, { characterId: 'b', name: 'Bruno', initiativeBonus: 0 })
  s = addPc(s, { characterId: 'c', name: 'Caio',  initiativeBonus: 5 })
  return s
}

describe('sortByInitiative', () => {
  it('ordena desc, desempata por bônus e depois por nome', () => {
    const list = [
      { id: '1', name: 'Zed',  initiative: 12, initiativeBonus: 1 },
      { id: '2', name: 'Alba', initiative: 12, initiativeBonus: 1 },
      { id: '3', name: 'Cid',  initiative: 12, initiativeBonus: 4 },
      { id: '4', name: 'Duna', initiative: 20, initiativeBonus: 0 },
    ]
    expect(sortByInitiative(list).map(c => c.name)).toEqual(['Duna', 'Cid', 'Alba', 'Zed'])
  })

  it('joga quem não rolou pro fim', () => {
    const list = [
      { id: '1', name: 'Sem', initiative: null, initiativeBonus: 9 },
      { id: '2', name: 'Com', initiative: 3, initiativeBonus: 0 },
    ]
    expect(sortByInitiative(list).map(c => c.name)).toEqual(['Com', 'Sem'])
  })
})

describe('rollInitiative', () => {
  it('rola d20 + bônus pra todos e devolve o detalhe do dado', () => {
    const { state, rolls } = rollInitiative(party(), () => 0.5) // d20 = 11
    expect(rolls).toEqual([
      { id: 'k1', die: 11, bonus: 2, total: 13 },
      { id: 'k2', die: 11, bonus: 0, total: 11 },
      { id: 'k3', die: 11, bonus: 5, total: 16 },
    ])
    expect(state.combatants.map(c => c.name)).toEqual(['Caio', 'Ana', 'Bruno'])
  })
})

describe('setInitiative', () => {
  it('sobrescreve o valor e reordena', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    const next = setInitiative(state, 'k2', 30)
    expect(next.combatants.map(c => c.name)).toEqual(['Bruno', 'Caio', 'Ana'])
  })

  it('valor não numérico volta pra null', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    expect(setInitiative(state, 'k1', '').combatants.find(c => c.id === 'k1').initiative).toBeNull()
  })
})

describe('startEncounter / nextTurn / previousTurn', () => {
  it('começa na rodada 1 com o primeiro da ordem', () => {
    const { state } = rollInitiative(party(), () => 0.5)
    const s = startEncounter(state)
    expect(s).toMatchObject({ started: true, round: 1, activeId: 'k3' })
  })

  it('avança e vira a rodada ao passar do último', () => {
    let s = startEncounter(rollInitiative(party(), () => 0.5).state)
    s = nextTurn(s); expect(s.activeId).toBe('k1'); expect(s.round).toBe(1)
    s = nextTurn(s); expect(s.activeId).toBe('k2'); expect(s.round).toBe(1)
    s = nextTurn(s); expect(s.activeId).toBe('k3'); expect(s.round).toBe(2)
  })

  it('volta a rodada ao recuar do primeiro', () => {
    let s = startEncounter(rollInitiative(party(), () => 0.5).state)
    s = nextTurn(s)          // Ana, rodada 1
    s = previousTurn(s)
    expect(s).toMatchObject({ activeId: 'k3', round: 1 })
    s = previousTurn(s)      // já na rodada 1: não desce
    expect(s).toMatchObject({ activeId: 'k3', round: 1 })
    s = nextTurn(nextTurn(nextTurn(s))) // rodada 2, Caio
    expect(s.round).toBe(2)
    s = previousTurn(s)
    expect(s).toMatchObject({ activeId: 'k2', round: 1 })
  })

  it('não faz nada antes de começar', () => {
    const s = party()
    expect(nextTurn(s)).toBe(s)
    expect(previousTurn(s)).toBe(s)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter-turns.test.js`
Expected: FAIL — `rollInitiative is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/systems/dnd5e/domain/encounter.js`:

```js
/** Ordena por iniciativa desc; empate por bônus desc; depois nome (determinístico). */
export function sortByInitiative(combatants) {
  return [...combatants].sort((a, b) =>
    (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity)
    || (b.initiativeBonus ?? 0) - (a.initiativeBonus ?? 0)
    || String(a.name).localeCompare(String(b.name), 'pt-BR'),
  )
}

/**
 * Rola d20+bônus pra todo mundo. `rng` injetável (mesma convenção do
 * rollDeathSave em rules.js: teste fixa o dado).
 * @returns {{ state: object, rolls: Array<{id,die,bonus,total}> }}
 */
export function rollInitiative(state, rng = Math.random) {
  const rolls = []
  const combatants = state.combatants.map(c => {
    const die = Math.floor(rng() * 20) + 1
    const bonus = c.initiativeBonus ?? 0
    rolls.push({ id: c.id, die, bonus, total: die + bonus })
    return { ...c, initiative: die + bonus }
  })
  return { state: { ...state, combatants: sortByInitiative(combatants) }, rolls }
}

/** Correção manual (o jogador rolou o dado físico dele e falou o número). */
export function setInitiative(state, id, value) {
  const n = Number(value)
  const valid = value !== '' && value !== null && Number.isFinite(n)
  const combatants = state.combatants.map(c =>
    c.id === id ? { ...c, initiative: valid ? n : null } : c)
  return { ...state, combatants: sortByInitiative(combatants) }
}

export function startEncounter(state) {
  const combatants = sortByInitiative(state.combatants)
  return { ...state, combatants, started: true, round: 1, activeId: combatants[0]?.id ?? null }
}

export function nextTurn(state) {
  if (!state.started || state.combatants.length === 0) return state
  const i = state.combatants.findIndex(c => c.id === state.activeId)
  const next = i + 1
  if (next >= state.combatants.length) {
    return { ...state, round: state.round + 1, activeId: state.combatants[0].id }
  }
  return { ...state, activeId: state.combatants[next].id }
}

export function previousTurn(state) {
  if (!state.started || state.combatants.length === 0) return state
  const i = state.combatants.findIndex(c => c.id === state.activeId)
  if (i <= 0) {
    if (state.round <= 1) return { ...state, activeId: state.combatants[0].id }
    return { ...state, round: state.round - 1, activeId: state.combatants[state.combatants.length - 1].id }
  }
  return { ...state, activeId: state.combatants[i - 1].id }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter-turns.test.js`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/encounter.js src/test/encounter-turns.test.js
git commit -m "feat(mesa-de-combate): iniciativa em lote, correcao manual e fluxo de turnos"
```

---

## Task 3: Domínio — HP de monstro, condições, remover, XP

**Files:**
- Modify: `src/systems/dnd5e/domain/encounter.js`
- Test: `src/test/encounter-npc.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounter-npc.test.js
import { describe, it, expect } from 'vitest'
import {
  emptyEncounterState, addPc, addNpc, startEncounter, rollInitiative,
  applyNpcDamage, applyNpcHealing, setNpcTempHp, toggleNpcCondition,
  removeCombatant, markOrphans, totalXp,
} from '../systems/dnd5e/domain/encounter'

const GOBLIN = { index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6', dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }
const OGRE   = { index: 'ogre',   name: 'Ogro',   hit_points: 59, hit_points_roll: '7d10', dexterity: 8, xp: 450, armor_class: [{ value: 11 }] }

const one = () => addNpc(emptyEncounterState(), GOBLIN)
const npc = (s) => s.combatants[0]

describe('HP de monstro', () => {
  it('desconta dano e marca defeated ao chegar a 0', () => {
    let s = applyNpcDamage(one(), 'k1', 3)
    expect(npc(s)).toMatchObject({ currentHp: 4, defeated: false })
    s = applyNpcDamage(s, 'k1', 99)
    expect(npc(s)).toMatchObject({ currentHp: 0, defeated: true })
  })

  it('HP temporário absorve primeiro (PHB p.198)', () => {
    let s = setNpcTempHp(one(), 'k1', 5)
    s = applyNpcDamage(s, 'k1', 3)
    expect(npc(s)).toMatchObject({ tempHp: 2, currentHp: 7 })
    s = applyNpcDamage(s, 'k1', 4)
    expect(npc(s)).toMatchObject({ tempHp: 0, currentHp: 5 })
  })

  it('HP temporário não empilha: fica o maior (PHB p.198)', () => {
    let s = setNpcTempHp(one(), 'k1', 5)
    s = setNpcTempHp(s, 'k1', 3)
    expect(npc(s).tempHp).toBe(5)
  })

  it('cura respeita o teto e desfaz defeated', () => {
    let s = applyNpcDamage(one(), 'k1', 99)
    s = applyNpcHealing(s, 'k1', 3)
    expect(npc(s)).toMatchObject({ currentHp: 3, defeated: false })
    s = applyNpcHealing(s, 'k1', 999)
    expect(npc(s).currentHp).toBe(7)
  })

  it('ignora valores negativos e lixo', () => {
    expect(npc(applyNpcDamage(one(), 'k1', -5)).currentHp).toBe(7)
    expect(npc(applyNpcHealing(one(), 'k1', 'abc')).currentHp).toBe(7)
  })

  it('não toca em combatente PJ (HP dele vive na ficha)', () => {
    const s = addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' })
    expect(applyNpcDamage(s, 'k1', 5).combatants[0].currentHp).toBeUndefined()
  })
})

describe('condições de monstro', () => {
  it('liga e desliga', () => {
    let s = toggleNpcCondition(one(), 'k1', 'prone')
    expect(npc(s).conditions).toEqual(['prone'])
    s = toggleNpcCondition(s, 'k1', 'poisoned')
    expect(npc(s).conditions).toEqual(['prone', 'poisoned'])
    s = toggleNpcCondition(s, 'k1', 'prone')
    expect(npc(s).conditions).toEqual(['poisoned'])
  })
})

describe('removeCombatant', () => {
  it('remove o ativo do MEIO da ordem: turno vai pro seguinte, rodada intacta', () => {
    let s = addNpc(addNpc(one(), OGRE), GOBLIN)
    s = startEncounter(rollInitiative(s, () => 0.5).state)
    s = nextTurn(s) // ativo agora é o segundo da ordem
    const meio = s.activeId
    const seguinte = s.combatants[2].id
    const round = s.round
    s = removeCombatant(s, meio)
    expect(s.activeId).toBe(seguinte)
    expect(s.round).toBe(round)
  })

  it('remove o ativo que é o ÚLTIMO da ordem: dá a volta e vira a rodada', () => {
    let s = addNpc(addNpc(one(), OGRE), GOBLIN)
    s = startEncounter(rollInitiative(s, () => 0.5).state)
    s = nextTurn(nextTurn(s)) // ativo é o último da ordem
    const ultimo = s.activeId
    const primeiro = s.combatants[0].id
    const round = s.round
    s = removeCombatant(s, ultimo)
    expect(s.activeId).toBe(primeiro)
    expect(s.round).toBe(round + 1)
  })

  it('remover quem NÃO é o ativo não mexe no turno nem na rodada', () => {
    let s = addNpc(addNpc(one(), OGRE), GOBLIN)
    s = startEncounter(rollInitiative(s, () => 0.5).state)
    const ativo = s.activeId
    const outro = s.combatants.find(c => c.id !== ativo).id
    s = removeCombatant(s, outro)
    expect(s).toMatchObject({ activeId: ativo, round: 1 })
  })

  it('passa o turno pro seguinte quando remove o ativo', () => {
    let s = addNpc(addNpc(one(), OGRE), GOBLIN)
    s = startEncounter(rollInitiative(s, () => 0.5).state)
    const activeAntes = s.activeId
    s = removeCombatant(s, activeAntes)
    expect(s.combatants.some(c => c.id === activeAntes)).toBe(false)
    expect(s.activeId).not.toBe(activeAntes)
    expect(s.combatants.some(c => c.id === s.activeId)).toBe(true)
  })

  it('remover o último ativo deixa activeId null', () => {
    let s = startEncounter(rollInitiative(one(), () => 0.5).state)
    s = removeCombatant(s, 'k1')
    expect(s).toMatchObject({ combatants: [], activeId: null })
  })

  it('id inexistente devolve o mesmo state', () => {
    const s = one()
    expect(removeCombatant(s, 'nope')).toBe(s)
  })
})

describe('markOrphans', () => {
  it('marca PJ cuja ficha saiu da mesa e desmarca quando volta', () => {
    let s = addPc(addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' }), { characterId: 'b', name: 'Bruno' })
    s = markOrphans(s, ['a'])
    expect(s.combatants.map(c => c.orphaned)).toEqual([false, true])
    s = markOrphans(s, ['a', 'b'])
    expect(s.combatants.map(c => c.orphaned)).toEqual([false, false])
  })
})

describe('totalXp', () => {
  it('soma só os monstros', () => {
    let s = addPc(emptyEncounterState(), { characterId: 'a', name: 'Ana' })
    s = addNpc(addNpc(s, GOBLIN), OGRE)
    expect(totalXp(s)).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounter-npc.test.js`
Expected: FAIL — `applyNpcDamage is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/systems/dnd5e/domain/encounter.js`:

```js
/** Aplica `fn` só no combatente `npc` de id dado (PJ passa pela RPC, não aqui). */
function mapNpc(state, id, fn) {
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === id && c.kind === 'npc' ? fn(c) : c)),
  }
}

function toAmount(v) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function applyNpcDamage(state, id, amount) {
  const dmg = toAmount(amount)
  if (dmg === 0) return state
  return mapNpc(state, id, c => {
    const absorbed = Math.min(c.tempHp ?? 0, dmg)
    const currentHp = Math.max(0, (c.currentHp ?? 0) - (dmg - absorbed))
    return { ...c, tempHp: (c.tempHp ?? 0) - absorbed, currentHp, defeated: currentHp === 0 }
  })
}

export function applyNpcHealing(state, id, amount) {
  const heal = toAmount(amount)
  if (heal === 0) return state
  return mapNpc(state, id, c => {
    const currentHp = Math.min(c.maxHp ?? 0, (c.currentHp ?? 0) + heal)
    return { ...c, currentHp, defeated: currentHp === 0 }
  })
}

/** PHB p.198: HP temporário não empilha — fica o maior. */
export function setNpcTempHp(state, id, amount) {
  const t = toAmount(amount)
  return mapNpc(state, id, c => ({ ...c, tempHp: Math.max(t, c.tempHp ?? 0) }))
}

export function toggleNpcCondition(state, id, conditionId) {
  return mapNpc(state, id, c => {
    const list = c.conditions ?? []
    return {
      ...c,
      conditions: list.includes(conditionId)
        ? list.filter(x => x !== conditionId)
        : [...list, conditionId],
    }
  })
}

export function removeCombatant(state, id) {
  const i = state.combatants.findIndex(c => c.id === id)
  if (i === -1) return state
  const rest = state.combatants.filter(c => c.id !== id)
  if (state.activeId !== id) return { ...state, combatants: rest }
  if (rest.length === 0) return { ...state, combatants: rest, activeId: null }
  // O turno passa pro sucessor natural. Se o removido era o ÚLTIMO da ordem, dá
  // a volta pro primeiro e vira a rodada — mesmo wraparound do nextTurn (senão
  // o turno voltaria pra quem já jogou nesta rodada).
  if (i >= rest.length) return { ...state, combatants: rest, activeId: rest[0].id, round: state.round + 1 }
  return { ...state, combatants: rest, activeId: rest[i].id }
}

/**
 * Marca PJ cuja ficha não está mais legível na mesa (o trigger de 0007
 * desvincula a ficha quando o membro sai). Combatente órfão CONTINUA na ordem
 * de iniciativa — só perde as ações de escrita.
 */
export function markOrphans(state, liveCharacterIds) {
  const live = new Set(liveCharacterIds)
  return {
    ...state,
    combatants: state.combatants.map(c =>
      c.kind === 'pc' ? { ...c, orphaned: !live.has(c.characterId) } : c),
  }
}

export function totalXp(state) {
  return state.combatants.reduce((s, c) => s + (c.kind === 'npc' ? (c.xp ?? 0) : 0), 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounter-npc.test.js`
Expected: PASS — 15 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/encounter.js src/test/encounter-npc.test.js
git commit -m "feat(mesa-de-combate): HP de monstro, condicoes, remocao e XP no dominio"
```

---

## Task 4: Migration 0015 — tabela, RLS e as duas RPCs

**Files:**
- Create: `supabase/migrations/0015_encounters.sql`

Sem teste automatizado nesta task: SQL só roda contra o Postgres real, e o
perímetro é verificado na Task 5 (`npm run test:rls`).

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0015_encounters.sql
-- Mesa de Combate (spec 2026-07-26).
--   1. tabela `encounters` — estado do combate, visível SÓ pro Mestre da mesa;
--   2. dm_apply_combat_state — patch estreito em data->'combat' de uma ficha;
--   3. dm_save_character     — doc completo (só o descanso em lote usa).
--
-- Aplique no SQL Editor do Supabase, NÃO via cliente.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Tabela
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.encounters (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  version     int not null default 1,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um encontro ATIVO por mesa. Índice parcial (constraint de tabela não aceita
-- WHERE). Encerrar = active=false, então o histórico não colide.
create unique index if not exists encounters_one_active_per_campaign
  on public.encounters (campaign_id) where active;

create index if not exists encounters_campaign_idx
  on public.encounters (campaign_id);

alter table public.encounters enable row level security;

-- Só o Mestre da mesa. Sem policy pra jogador = bloqueado por padrão (não
-- existe Player View no escopo desta entrega).
drop policy if exists "encounters_all_dm" on public.encounters;
create policy "encounters_all_dm"
  on public.encounters for all
  to authenticated
  using (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

-- version + updated_at automáticos (mesmo padrão de characters em 0009).
create or replace function public.bump_encounter_version()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.state is distinct from old.state then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists encounters_bump_version on public.encounters;
create trigger encounters_bump_version
  before update on public.encounters
  for each row execute function public.bump_encounter_version();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Guarda comum: quem chama é o Mestre da mesa DESTA ficha?
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.assert_dm_of_character(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cid uuid;
begin
  -- security definer: lê campaign_id sem passar pela RLS. Não devolve dado
  -- nenhum — só levanta exceção ou retorna void.
  select campaign_id into v_cid from public.characters where id = p_character_id;
  if v_cid is null or not public.is_campaign_dm(v_cid) then
    raise exception 'not_dm_of_campaign' using errcode = '42501';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC estreita do combate ao vivo
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.dm_apply_combat_state(
  p_character_id uuid,
  p_patch jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Lista FECHADA: exatamente o que applyDamage/applyHealing mexem, mais
  -- conditions. Qualquer coisa fora daqui é recusada.
  v_allowed text[] := array['currentHp','tempHp','deathSaves','isStable','isDead','conditions'];
  v_key text;
  v_new int;
begin
  perform public.assert_dm_of_character(p_character_id);

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_patch' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then
      raise exception 'illegal_patch_key: %', v_key using errcode = '22023';
    end if;
  end loop;

  update public.characters
     set data = jsonb_set(
           data, '{combat}',
           coalesce(data->'combat', '{}'::jsonb) || p_patch,
           true)
   where id = p_character_id
     and version = p_expected_version
  returning version into v_new;  -- trigger characters_bump_version já subiu

  if v_new is null then
    raise exception 'version_conflict' using errcode = 'P0010';
  end if;

  return v_new;
end;
$$;

grant execute on function public.dm_apply_combat_state(uuid, jsonb, int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RPC de doc completo — ÚNICO consumidor: descanso em lote
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.dm_save_character(
  p_character_id uuid,
  p_data jsonb,
  p_expected_version int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new int;
begin
  perform public.assert_dm_of_character(p_character_id);

  update public.characters
     set data = p_data
   where id = p_character_id
     and version = p_expected_version
  returning version into v_new;

  if v_new is null then
    raise exception 'version_conflict' using errcode = 'P0010';
  end if;

  return v_new;
end;
$$;

grant execute on function public.dm_save_character(uuid, jsonb, int) to authenticated;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Aplicar no Supabase**

Cole o arquivo inteiro no SQL Editor do projeto Supabase e rode.
Expected: `Success. No rows returned`.

- [ ] **Step 3: Conferir que o PostgREST vê as funções novas**

No SQL Editor, rode:

```sql
select proname from pg_proc
 where proname in ('dm_apply_combat_state','dm_save_character','assert_dm_of_character','bump_encounter_version')
 order by proname;
```

Expected: as 4 linhas. Se `dm_apply_combat_state` não aparecer no cliente depois
disso, rode `NOTIFY pgrst, 'reload schema';` de novo — sem o reload o
PostgREST responde `PGRST202`. A validação de comportamento é a Task 5.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0015_encounters.sql
git commit -m "feat(mesa-de-combate): migration 0015 - tabela encounters e RPCs do Mestre"
```

---

## Task 5: Perímetro das RPCs no harness de RLS

**Files:**
- Modify: `scripts/test-rls-isolation.mjs` (inserir bloco antes do `▶ Rate limit`, por volta da linha 247)

- [ ] **Step 1: Adicionar o bloco de testes**

Insira este bloco imediatamente antes de
`console.log('\n▶ Rate limit: 11 tentativas em sequência → última falha com rate_limited')`:

```js
    console.log('\n▶ [#5] Mesa de Combate: perímetro das RPCs do Mestre (0015)')
    {
      // O bloco #2 tirou o player da mesa de propósito e o trigger
      // detach_characters_on_member_removal desvinculou a ficha. As RPCs do
      // Mestre só fazem sentido no estado real: player MEMBRO e ficha
      // VINCULADA. Este bloco restaura isso em vez de herdar estado do #2.
      // (O código de convite foi rotacionado antes, então `inviteCode` está
      // velho — relemos o atual.)
      const { data: camp } = await dm.from('campaigns')
        .select('invite_code').eq('id', campaignId).maybeSingle()
      const { error: rejoinErr } = await player.rpc('join_campaign', { p_code: camp?.invite_code })
      assert(!rejoinErr, `player volta pra mesa (err=${rejoinErr?.message})`)
      const { error: relinkErr } = await player.from('characters')
        .update({ campaign_id: campaignId }).eq('id', charId)
      assert(!relinkErr, `ficha revinculada à mesa (err=${relinkErr?.message})`)

      const { data: row } = await dm.from('characters')
        .select('data, version').eq('id', charId).maybeSingle()
      const v = row?.version

      // 5.1 DM aplica patch estreito na ficha do player → OK.
      const { data: v1, error: e1 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 3, conditions: ['prone'] },
        p_expected_version: v,
      })
      assert(!e1 && Number.isInteger(v1), `DM aplica patch de combate (err=${e1?.message})`)

      // 5.2 o patch entrou e NÃO apagou o resto de data.combat.
      const { data: after } = await dm.from('characters')
        .select('data, version').eq('id', charId).maybeSingle()
      assert(after?.data?.combat?.currentHp === 3, `currentHp gravado (got ${after?.data?.combat?.currentHp})`)
      assert(Array.isArray(after?.data?.combat?.conditions) && after.data.combat.conditions[0] === 'prone',
        'conditions gravado')
      assert(after?.data?.info?.name === row?.data?.info?.name, 'resto da ficha preservado (merge, não replace)')

      // 5.3 chave fora da lista → recusa.
      const { error: e2 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { maxHp: 999 },
        p_expected_version: after?.version,
      })
      assert(!!e2 && /illegal_patch_key/.test(e2.message), `chave ilegal recusada (got "${e2?.message}")`)

      // 5.4 versão errada → conflito, sem escrever.
      const { error: e3 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 1 },
        p_expected_version: 999999,
      })
      assert(!!e3 && /version_conflict/.test(e3.message), `versão divergente recusada (got "${e3?.message}")`)

      // 5.5 o próprio player NÃO é DM da mesa → recusa (a RPC é do Mestre).
      const { error: e4 } = await player.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 7 },
        p_expected_version: after?.version,
      })
      assert(!!e4 && /not_dm_of_campaign/.test(e4.message), `player bloqueado na RPC do DM (got "${e4?.message}")`)

      // 5.6 doc completo pelo DM (caminho do descanso) → OK.
      // Guarda antes de espalhar: `after.data` cru derrubaria o processo com
      // TypeError se a leitura viesse vazia, abortando os testes seguintes.
      assert(!!after?.data, 'DM relê a ficha após o patch')
      const restored = {
        ...(after?.data ?? {}),
        combat: { ...(after?.data?.combat ?? {}), currentHp: after?.data?.combat?.maxHp ?? 10, conditions: [] },
      }
      const { error: e5 } = await dm.rpc('dm_save_character', {
        p_character_id: charId, p_data: restored, p_expected_version: after?.version,
      })
      assert(!e5, `DM salva doc completo da ficha da mesa (err=${e5?.message})`)

      // 5.7 encounters: DM cria e lê; player não vê nada.
      const { data: enc, error: e6 } = await dm.from('encounters')
        .insert({ campaign_id: campaignId, state: { round: 1, combatants: [] } })
        .select('id, version').single()
      assert(!e6 && !!enc?.id, `DM cria encontro (err=${e6?.message})`)

      const { data: pRows } = await player.from('encounters').select('id').eq('campaign_id', campaignId)
      assert((pRows ?? []).length === 0, `player não enxerga encontro da mesa (got ${(pRows ?? []).length})`)

      const { error: e7 } = await player.from('encounters')
        .insert({ campaign_id: campaignId, state: {} })
      assert(!!e7, `player bloqueado ao criar encontro (err=${e7?.message})`)

      // 5.8 lock otimista do encontro: update com version antiga não pega linha.
      // Só roda se o insert acima deu certo — `enc` cru aqui derrubaria o
      // processo com TypeError e pularia o teste de rate limit.
      if (enc?.id) {
        await dm.from('encounters').update({ state: { round: 2 } }).eq('id', enc.id)
        const { data: stale } = await dm.from('encounters')
          .update({ state: { round: 3 } }).eq('id', enc.id).eq('version', enc.version).select('version')
        assert((stale ?? []).length === 0, 'update com version velha não afeta linha (lock otimista)')

        await dm.from('encounters').delete().eq('id', enc.id)
      }
    }
```

- [ ] **Step 2: Rodar contra o Supabase real**

Run: `npm run test:rls`
Expected: todos os `✓`, incluindo os asserts novos do bloco `[#5]`; exit code 0.

Este passo é **ação do dono** — o script roda contra o Supabase real, exige as
credenciais de `.env.local` e cria/apaga dados de verdade.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-rls-isolation.mjs
git commit -m "test(mesa-de-combate): perimetro das RPCs do Mestre e da tabela encounters"
```

---

## Task 6: `lib/encounters.js`

Camada de acesso **agnóstica do shape do state** — a casca não pode conhecer o
domínio de D&D. O estado inicial vem de quem chama.

**Files:**
- Create: `src/lib/encounters.js`
- Test: `src/test/encounters-lib.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/encounters-lib.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], insertErr: null, updateErr: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const ctx = { filter: () => true, single: false, patch: null }
    const b = {
      select() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = r => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      insert(payload) {
        ctx.inserted = { id: `enc-${store.rows.length + 1}`, version: 1, active: true, ...payload }
        return b
      },
      update(patch) { ctx.patch = patch; return b },
      then(resolve) {
        if (store.insertErr && ctx.inserted) return resolve({ data: null, error: store.insertErr })
        if (ctx.inserted) { store.rows.push(ctx.inserted); return resolve({ data: ctx.inserted, error: null }) }
        if (ctx.patch) {
          if (store.updateErr) return resolve({ data: null, error: store.updateErr })
          const hit = store.rows.filter(ctx.filter)
          for (const r of hit) { Object.assign(r, ctx.patch); r.version += 1 }
          const out = hit.map(r => ({ version: r.version }))
          return resolve({ data: ctx.single ? (out[0] ?? null) : out, error: null })
        }
        const rows = store.rows.filter(ctx.filter)
        return resolve({ data: ctx.single ? (rows[0] ?? null) : rows, error: null })
      },
    }
    return b
  }
  const channel = { on() { return channel }, subscribe() { return channel } }
  return { supabase: { from, channel: () => channel, removeChannel: vi.fn() } }
})

const {
  getActiveEncounter, createEncounter, saveEncounterState, closeEncounter,
} = await import('../lib/encounters')

beforeEach(() => { store.rows = []; store.insertErr = null; store.updateErr = null })

describe('lib/encounters', () => {
  it('sem encontro ativo devolve null', async () => {
    expect(await getActiveEncounter('camp-1')).toBeNull()
  })

  it('cria e depois encontra o ativo da mesa', async () => {
    const res = await createEncounter('camp-1', { round: 0, combatants: [] })
    expect(res.ok).toBe(true)
    expect(res.row).toMatchObject({ campaign_id: 'camp-1', version: 1 })
    const found = await getActiveEncounter('camp-1')
    expect(found?.id).toBe(res.row.id)
  })

  it('salva state com a versão esperada e devolve a nova', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    const res = await saveEncounterState(row.id, { round: 1 }, row.version)
    expect(res).toEqual({ ok: true, version: 2 })
  })

  it('versão divergente = conflito, sem escrever', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    const res = await saveEncounterState(row.id, { round: 9 }, 42)
    expect(res).toEqual({ ok: false, reason: 'conflict' })
    expect(store.rows[0].state).toEqual({ round: 0 })
  })

  it('erro de rede vira reason unknown', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    store.updateErr = { message: 'boom' }
    expect(await saveEncounterState(row.id, {}, row.version)).toEqual({ ok: false, reason: 'unknown' })
  })

  it('encerrar marca active=false', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    expect(await closeEncounter(row.id)).toEqual({ ok: true })
    expect(store.rows[0].active).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/encounters-lib.test.js`
Expected: FAIL — `Cannot find module '../lib/encounters'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/encounters.js
import { supabase } from './supabase'

/**
 * Acesso à tabela `encounters` (migration 0015). Camada da CASCA: não conhece
 * o shape do `state` — quem monta e interpreta é o sistema (dnd5e). RLS já
 * garante que só o Mestre da mesa lê e escreve.
 */
const T = 'encounters'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[encounters] ${label}:`, payload)
  }
}

/** Encontro ativo da mesa, ou null. */
export async function getActiveEncounter(campaignId) {
  const { data, error } = await supabase
    .from(T)
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('active', true)
    .maybeSingle()
  if (error) { logDev('getActiveEncounter', error); return null }
  return data ?? null
}

export async function createEncounter(campaignId, state) {
  const { data, error } = await supabase
    .from(T)
    .insert({ campaign_id: campaignId, state })
    .select('*')
    .single()
  if (error) {
    logDev('createEncounter', error)
    return { ok: false, reason: 'unknown', message: error.message }
  }
  return { ok: true, row: data }
}

/**
 * Lock otimista sem RPC: o UPDATE só pega a linha se a `version` casar, e o
 * trigger de 0015 devolve a versão já incrementada.
 */
export async function saveEncounterState(id, state, expectedVersion) {
  const { data, error } = await supabase
    .from(T)
    .update({ state })
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('version')
    .maybeSingle()
  if (error) { logDev('saveEncounterState', error); return { ok: false, reason: 'unknown' } }
  if (!data) return { ok: false, reason: 'conflict' }
  return { ok: true, version: data.version }
}

export async function closeEncounter(id) {
  const { error } = await supabase.from(T).update({ active: false }).eq('id', id)
  if (error) { logDev('closeEncounter', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

/**
 * Realtime do encontro — o Mestre pode ter duas telas abertas (celular na mesa
 * e notebook). Devolve a função de unsubscribe.
 */
export function subscribeEncounter(id, onRow) {
  const channel = supabase
    .channel(`encounter:${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${id}` },
      payload => onRow(payload.new),
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/encounters-lib.test.js`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/encounters.js src/test/encounters-lib.test.js
git commit -m "feat(mesa-de-combate): camada de acesso da tabela encounters"
```

---

## Task 7: `lib/dmWrites.js` + `domain/dmPatch.js`

**Files:**
- Create: `src/lib/dmWrites.js`, `src/systems/dnd5e/domain/dmPatch.js`
- Test: `src/test/dmWrites.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dmWrites.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { combatPatchFrom, DM_COMBAT_KEYS } from '../systems/dnd5e/domain/dmPatch'

const calls = vi.hoisted(() => ({ list: [], nextError: null, nextData: 7 }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (name, args) => {
      calls.list.push({ name, args })
      return Promise.resolve(
        calls.nextError ? { data: null, error: calls.nextError } : { data: calls.nextData, error: null },
      )
    },
  },
}))

const { dmApplyCombatState, dmSaveCharacter } = await import('../lib/dmWrites')

beforeEach(() => { calls.list = []; calls.nextError = null; calls.nextData = 7 })

describe('combatPatchFrom', () => {
  it('extrai só as chaves da lista fechada, com defaults', () => {
    const patch = combatPatchFrom({ combat: { currentHp: 4, maxHp: 20, tempHp: 2, attacks: [1] } })
    expect(Object.keys(patch).sort()).toEqual([...DM_COMBAT_KEYS].sort())
    expect(patch).toMatchObject({ currentHp: 4, tempHp: 2, isStable: false, isDead: false, conditions: [] })
    expect(patch.maxHp).toBeUndefined()
    expect(patch.attacks).toBeUndefined()
  })

  it('ficha sem bloco combat não explode', () => {
    expect(combatPatchFrom({})).toMatchObject({ currentHp: 0, tempHp: 0, conditions: [] })
  })
})

describe('dmApplyCombatState', () => {
  it('chama a RPC com os nomes de parâmetro do Postgres', async () => {
    const res = await dmApplyCombatState('char-1', { currentHp: 3 }, 5)
    expect(res).toEqual({ ok: true, version: 7 })
    expect(calls.list[0]).toEqual({
      name: 'dm_apply_combat_state',
      args: { p_character_id: 'char-1', p_patch: { currentHp: 3 }, p_expected_version: 5 },
    })
  })

  it('traduz version_conflict', async () => {
    calls.nextError = { code: 'P0010', message: 'version_conflict' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('conflict')
  })

  it('traduz not_dm_of_campaign', async () => {
    calls.nextError = { code: '42501', message: 'not_dm_of_campaign' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('forbidden')
  })

  it('traduz illegal_patch_key', async () => {
    calls.nextError = { code: '22023', message: 'illegal_patch_key: maxHp' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('illegal-patch')
  })

  it('traduz RPC ausente (migration não aplicada)', async () => {
    calls.nextError = { code: 'PGRST202', message: 'not found' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('rpc-missing')
  })
})

describe('dmSaveCharacter', () => {
  it('manda o doc completo', async () => {
    const doc = { id: 'char-1', combat: { currentHp: 10 } }
    const res = await dmSaveCharacter('char-1', doc, 3)
    expect(res).toEqual({ ok: true, version: 7 })
    expect(calls.list[0].name).toBe('dm_save_character')
    expect(calls.list[0].args).toEqual({ p_character_id: 'char-1', p_data: doc, p_expected_version: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/dmWrites.test.js`
Expected: FAIL — `Cannot find module '../systems/dnd5e/domain/dmPatch'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/domain/dmPatch.js
/**
 * Ponte entre as funções puras da ficha e a RPC estreita do Mestre.
 *
 * O fluxo é sempre: rodar a regra em JS (applyDamage/applyHealing de rules.js),
 * e mandar pro banco APENAS estas chaves. A lista aqui espelha
 * `v_allowed` em supabase/migrations/0015_encounters.sql — mudar uma exige
 * mudar a outra, senão a RPC recusa com illegal_patch_key.
 */
export const DM_COMBAT_KEYS = ['currentHp', 'tempHp', 'deathSaves', 'isStable', 'isDead', 'conditions']

export function combatPatchFrom(character) {
  const c = character?.combat ?? {}
  return {
    currentHp: c.currentHp ?? 0,
    tempHp: c.tempHp ?? 0,
    deathSaves: c.deathSaves ?? { successes: 0, failures: 0 },
    isStable: !!c.isStable,
    isDead: !!c.isDead,
    conditions: c.conditions ?? [],
  }
}
```

```js
// src/lib/dmWrites.js
import { supabase } from './supabase'

/**
 * Escritas do MESTRE em fichas de jogadores da própria mesa (migration 0015).
 * A RLS de `characters` é owner-only no UPDATE (0007) — estas duas RPCs
 * `security definer` são o único caminho, e cada uma checa is_campaign_dm.
 */
function reasonFor(error) {
  const msg = error?.message ?? ''
  if (error?.code === 'P0010' || /version_conflict/.test(msg)) return 'conflict'
  if (/not_dm_of_campaign/.test(msg)) return 'forbidden'
  if (/illegal_patch_key|invalid_patch/.test(msg)) return 'illegal-patch'
  // PGRST202 = função fora do schema cache; 42883 = undefined_function.
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'rpc-missing'
  return 'unknown'
}

/** Patch estreito em data->'combat'. Ver DM_COMBAT_KEYS. */
export async function dmApplyCombatState(characterId, patch, expectedVersion) {
  const { data, error } = await supabase.rpc('dm_apply_combat_state', {
    p_character_id: characterId,
    p_patch: patch,
    p_expected_version: expectedVersion,
  })
  if (error) return { ok: false, reason: reasonFor(error), message: error.message }
  return { ok: true, version: data }
}

/** Doc completo. ÚNICO uso legítimo: descanso em lote. */
export async function dmSaveCharacter(characterId, data, expectedVersion) {
  const { data: version, error } = await supabase.rpc('dm_save_character', {
    p_character_id: characterId,
    p_data: data,
    p_expected_version: expectedVersion,
  })
  if (error) return { ok: false, reason: reasonFor(error), message: error.message }
  return { ok: true, version }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dmWrites.test.js`
Expected: PASS — 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dmWrites.js src/systems/dnd5e/domain/dmPatch.js src/test/dmWrites.test.js
git commit -m "feat(mesa-de-combate): RPCs de escrita do Mestre e patch estreito de combate"
```

---

## Task 8: Carregar a companhia com `version`

O Mestre precisa do doc completo **e** da `version` de cada ficha (lock
otimista). Hoje `loadCampaignCharacters` não traz `version`, e o conversor de
linha→doc é privado em `storage.js`.

**Files:**
- Modify: `src/utils/storage.js:29`, `src/lib/campaigns.js:182`
- Test: `src/test/campaign-party.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/campaign-party.test.js
import { describe, it, expect, vi } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], selected: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const b = {
      select(cols) { store.selected = cols; return b },
      eq() { return b },
      order() { return b },
      then(resolve) { return resolve({ data: store.rows, error: null }) },
    }
    return b
  }
  return { supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }
})

const { loadCampaignCharacters } = await import('../lib/campaigns')
const { rowToCharacter } = await import('../utils/storage')

describe('companhia da mesa para o Mestre', () => {
  it('rowToCharacter é exportado e devolve doc + version', () => {
    const doc = rowToCharacter({
      id: 'x', owner_id: 'u2', campaign_id: 'camp-1', short_id: 'ABCDEFGHJK',
      version: 4, data: { id: 'x', info: { name: 'Thalior' }, combat: { currentHp: 9 } },
    })
    expect(doc).toMatchObject({
      id: 'x', ownerId: 'u2', campaignId: 'camp-1', version: 4,
      info: { name: 'Thalior' }, combat: { currentHp: 9 },
    })
  })

  it('loadCampaignCharacters pede version na query', async () => {
    store.rows = [{ id: 'x', owner_id: 'u2', campaign_id: 'camp-1', version: 4, data: { id: 'x' } }]
    const rows = await loadCampaignCharacters('camp-1')
    expect(rows).toHaveLength(1)
    expect(store.selected).toMatch(/version/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/campaign-party.test.js`
Expected: FAIL — `rowToCharacter is not a function` (não é exportado).

- [ ] **Step 3: Write minimal implementation**

Em `src/utils/storage.js`, torne o conversor público (a assinatura e o corpo não
mudam):

```js
export function rowToCharacter(row) {
```

Em `src/lib/campaigns.js:185`, inclua `version` no select:

```js
    .select('id, owner_id, data, last_opened_at, short_id, campaign_id, version')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/campaign-party.test.js`
Expected: PASS — 2 testes.

- [ ] **Step 5: Rodar a suíte tocada pra garantir que nada regrediu**

Run: `npx vitest run src/test/campaigns.test.js src/test/storage.test.js src/test/campaign-roster.test.js`
Expected: PASS (se `src/test/storage.test.js` não existir, rode só os outros dois).

- [ ] **Step 6: Commit**

```bash
git add src/utils/storage.js src/lib/campaigns.js src/test/campaign-party.test.js
git commit -m "feat(mesa-de-combate): expor rowToCharacter e trazer version na companhia da mesa"
```

---

## Task 9: `BestiaryModal` com `onPick`

**Files:**
- Modify: `src/systems/dnd5e/components/Bestiary/BestiaryModal.jsx:16` e o painel do stat block (~linha 195)
- Test: `src/test/BestiaryModal-onPick.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/BestiaryModal-onPick.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BestiaryModal } from '../systems/dnd5e/components/Bestiary/BestiaryModal'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', size: 'Small', type: 'humanoid',
  challenge_rating: 0.25, hit_points: 7, hit_points_roll: '2d6',
  dexterity: 14, xp: 50, armor_class: [{ value: 15 }],
  speed: { walk: '30 ft.' }, strength: 8, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8,
}

beforeEach(() => {
  global.fetch = vi.fn((url) =>
    Promise.resolve({ json: () => Promise.resolve(String(url).includes('-pt') ? [] : [GOBLIN]) }))
})

describe('BestiaryModal onPick', () => {
  it('sem onPick não mostra botão de adicionar', async () => {
    render(<BestiaryModal isOpen onClose={() => {}} />)
    await userEvent.click(await screen.findByText('Goblin'))
    expect(screen.queryByRole('button', { name: /adicionar ao combate/i })).toBeNull()
  })

  it('com onPick, o botão chama de volta com o monstro e o modal fica aberto', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<BestiaryModal isOpen onClose={onClose} onPick={onPick} />)
    await userEvent.click(await screen.findByText('Goblin'))
    const btn = await screen.findByRole('button', { name: /adicionar ao combate/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(2))
    expect(onPick.mock.calls[0][0]).toMatchObject({ index: 'goblin' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/BestiaryModal-onPick.test.jsx`
Expected: FAIL — o botão "Adicionar ao combate" não existe.

- [ ] **Step 3: Write minimal implementation**

Assinatura (linha 16):

```jsx
/**
 * Bestiário SRD. `onPick` é OPCIONAL: quando presente, o painel do stat block
 * ganha um botão de adicionar (usado pela Mesa de Combate) e o modal NÃO fecha
 * ao adicionar — o Mestre costuma pôr 3 goblins de uma vez.
 */
export function BestiaryModal({ isOpen, onClose, onPick = null }) {
```

No painel do stat block, logo antes de `<MonsterStatBlock monster={selected} lang={lang} />`:

```jsx
                {onPick && (
                  <button
                    type="button"
                    onClick={() => onPick(selected)}
                    className="w-full mb-3 px-3 py-2 rounded-sm border-2 border-ink-600 bg-ink-500 text-parchment-50 text-sm font-display tracking-wide uppercase hover:bg-ink-600"
                  >
                    Adicionar ao combate
                  </button>
                )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/BestiaryModal-onPick.test.jsx`
Expected: PASS — 2 testes.

- [ ] **Step 5: Garantir que o bestiário atual não regrediu**

Run: `npx vitest run src/test/bestiary.test.jsx src/test/KnownBeastsPanel.test.jsx`
Expected: PASS (pule o primeiro se não existir; o e2e `bestiary.spec.js` cobre o resto na Task 15).

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/Bestiary/BestiaryModal.jsx src/test/BestiaryModal-onPick.test.jsx
git commit -m "feat(mesa-de-combate): bestiario aceita onPick para adicionar combatente"
```

---

## Task 10: `useEncounter` — carregar, salvar, realtime

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/useEncounter.js`
- Test: `src/test/useEncounter.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/useEncounter.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const api = vi.hoisted(() => ({
  active: null, created: null, saveResult: { ok: true, version: 2 },
  saveCalls: [], onRow: null,
}))

vi.mock('../lib/encounters', () => ({
  getActiveEncounter: vi.fn(async () => api.active),
  createEncounter: vi.fn(async (campaignId, state) => {
    api.created = { id: 'enc-1', campaign_id: campaignId, state, version: 1, active: true }
    api.active = api.created
    return { ok: true, row: api.created }
  }),
  saveEncounterState: vi.fn(async (id, state, v) => {
    api.saveCalls.push({ id, state, v })
    return api.saveResult
  }),
  closeEncounter: vi.fn(async () => ({ ok: true })),
  subscribeEncounter: vi.fn((id, onRow) => { api.onRow = onRow; return () => { api.onRow = null } }),
}))

const { useEncounter } = await import('../systems/dnd5e/components/Encounter/useEncounter')

beforeEach(() => {
  api.active = null; api.created = null
  api.saveResult = { ok: true, version: 2 }; api.saveCalls = []; api.onRow = null
})

describe('useEncounter', () => {
  it('cria um encontro vazio quando a mesa não tem nenhum ativo', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).toMatchObject({ round: 0, started: false, combatants: [] })
    expect(api.created).not.toBeNull()
  })

  it('retoma o encontro existente sem criar outro', async () => {
    api.active = { id: 'enc-9', state: { round: 3, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 5 }
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state.round).toBe(3)
    expect(api.created).toBeNull()
  })

  it('update manda o state novo com a versão conhecida e guarda a nova', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.update(s => ({ ...s, round: 7 })) })
    expect(api.saveCalls[0]).toMatchObject({ id: 'enc-1', v: 1 })
    expect(api.saveCalls[0].state.round).toBe(7)
    expect(result.current.state.round).toBe(7)

    api.saveResult = { ok: true, version: 3 }
    await act(async () => { await result.current.update(s => ({ ...s, round: 8 })) })
    expect(api.saveCalls[1].v).toBe(2)
  })

  it('conflito recarrega do servidor e sinaliza', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    api.saveResult = { ok: false, reason: 'conflict' }
    api.active = { id: 'enc-1', state: { round: 42, started: false, combatants: [], nextSeq: 1, activeId: null }, version: 9 }
    await act(async () => { await result.current.update(s => ({ ...s, round: 7 })) })
    expect(result.current.conflict).toBe(true)
    expect(result.current.state.round).toBe(42)
  })

  it('realtime de outra tela do Mestre atualiza o state local', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { api.onRow({ id: 'enc-1', state: { round: 5, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 4 }) })
    expect(result.current.state.round).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/useEncounter.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/useEncounter'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/components/Encounter/useEncounter.js
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getActiveEncounter, createEncounter, saveEncounterState,
  closeEncounter, subscribeEncounter,
} from '../../../../lib/encounters'
import { emptyEncounterState } from '../../domain/encounter'

/**
 * Dona da conversa com a tabela `encounters`: retoma (ou cria) o encontro ativo
 * da mesa, salva com lock otimista e escuta realtime — o Mestre pode ter o
 * celular na mesa e o notebook aberto.
 *
 * `update(fn)` recebe o state atual e devolve o novo (estilo setState).
 * Conflito de versão não sobrescreve: recarrega do servidor e liga `conflict`.
 */
export function useEncounter(campaignId) {
  const [row, setRow] = useState(null)
  const [state, setState] = useState(emptyEncounterState)
  const [loading, setLoading] = useState(true)
  const [conflict, setConflict] = useState(false)
  const versionRef = useRef(null)
  // Espelho do state para o `update` compor sem depender da closure.
  const stateRef = useRef(state)

  const adopt = useCallback((r) => {
    setRow(r)
    versionRef.current = r?.version ?? null
    const next = r?.state && Array.isArray(r.state.combatants) ? r.state : emptyEncounterState()
    setState(next)
    stateRef.current = next
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      const existing = await getActiveEncounter(campaignId)
      if (!alive) return
      if (existing) { adopt(existing); setLoading(false); return }
      const created = await createEncounter(campaignId, emptyEncounterState())
      if (!alive) return
      if (created.ok) { adopt(created.row); setLoading(false); return }
      // getActiveEncounter devolve null também quando a LEITURA falhou. Nesse
      // caso a criação bate no índice único parcial da 0015 (um ativo por
      // mesa) — relemos e adotamos o encontro que já existia.
      const retry = await getActiveEncounter(campaignId)
      if (!alive) return
      if (retry) adopt(retry)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [campaignId, adopt])

  useEffect(() => {
    if (!row?.id) return
    return subscribeEncounter(row.id, (fresh) => {
      // Ignora o eco do próprio save E qualquer evento atrasado: só adotamos
      // versão MAIOR que a conhecida. Com `===`, um evento fora de ordem
      // (v5 chegando depois de já sabermos v6) faria o estado regredir.
      if (!(fresh.version > versionRef.current)) return
      adopt(fresh)
    })
  }, [row?.id, adopt])

  const update = useCallback(async (fn) => {
    if (!row?.id) return { ok: false, reason: 'no-encounter' }
    // `fn` parte do REF, não da closure: dois toques rápidos (o Mestre batendo
    // "dano" duas vezes) precisam compor, senão o segundo descarta o primeiro.
    const next = fn(stateRef.current)
    setState(next) // otimista: a mesa não pode travar esperando a rede
    stateRef.current = next
    const res = await saveEncounterState(row.id, next, versionRef.current)
    if (res.ok) { versionRef.current = res.version; setConflict(false); return res }
    if (res.reason === 'conflict') {
      const fresh = await getActiveEncounter(campaignId)
      if (fresh) adopt(fresh)
      setConflict(true)
    }
    return res
  }, [row?.id, campaignId, adopt])

  const close = useCallback(async () => {
    if (!row?.id) return { ok: true }
    const res = await closeEncounter(row.id)
    if (res.ok) {
      setRow(null)
      versionRef.current = null
      setState(emptyEncounterState())
      setConflict(false) // encontro novo não herda o aviso do anterior
    }
    return res
  }, [row?.id])

  return { state, update, close, loading, conflict, encounterId: row?.id ?? null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/useEncounter.test.jsx`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/useEncounter.js src/test/useEncounter.test.jsx
git commit -m "feat(mesa-de-combate): hook do encontro com lock otimista e realtime"
```

---

## Task 11: `SetupPanel` — quem entra, monstros, iniciativa

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/SetupPanel.jsx`
- Test: `src/test/EncounterSetupPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/EncounterSetupPanel.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupPanel } from '../systems/dnd5e/components/Encounter/SetupPanel'

vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick({ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] })}>stub-add-goblin</button>
    : null,
}))

const party = [
  { characterId: 'a', name: 'Ana',   initiativeBonus: 2 },
  { characterId: 'b', name: 'Bruno', initiativeBonus: 0 },
]

function setup(props = {}) {
  const onStart = vi.fn()
  const utils = render(
    <SetupPanel party={party} onStart={onStart} rng={() => 0.5} {...props} />,
  )
  return { onStart, ...utils }
}

describe('SetupPanel', () => {
  it('lista a companhia com todos marcados', () => {
    setup()
    expect(screen.getByLabelText('Ana')).toBeChecked()
    expect(screen.getByLabelText('Bruno')).toBeChecked()
  })

  it('desmarcar tira o PJ do combate montado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByLabelText('Bruno'))
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.combatants.map(c => c.name)).toEqual(['Ana'])
  })

  it('adiciona monstro pelo bestiário e mostra na lista da cena', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Goblin 2')).toBeInTheDocument()
  })

  it('rolar iniciativa entrega o state já iniciado e ordenado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.started).toBe(true)
    expect(state.round).toBe(1)
    // d20 = 11 pra todos → Ana (+2) na frente de Bruno (+0)
    expect(state.combatants.map(c => c.name)).toEqual(['Ana', 'Bruno'])
    expect(state.activeId).toBe(state.combatants[0].id)
  })

  it('sem ninguém na cena o botão fica desabilitado', async () => {
    setup({ party: [] })
    expect(screen.getByRole('button', { name: /rolar iniciativa/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/SetupPanel'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/SetupPanel.jsx
import { useMemo, useState } from 'react'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { Button } from '../../../../components/ui/Button'
import {
  emptyEncounterState, addPc, addNpc, removeCombatant,
  rollInitiative, startEncounter, totalXp,
} from '../../domain/encounter'

/**
 * Fase de montagem: quem da companhia está na cena, quais monstros entram, e a
 * rolagem de iniciativa que inicia o combate.
 *
 * @param {Array<{characterId,name,initiativeBonus}>} party — companhia da mesa
 * @param {(state:object) => void} onStart — recebe o state já iniciado
 * @param {() => number} [rng] — injetável pro teste fixar o dado
 */
export function SetupPanel({ party, onStart, rng = Math.random }) {
  const [excluded, setExcluded] = useState(() => new Set())
  const [monsters, setMonsters] = useState(emptyEncounterState)
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [rollHp, setRollHp] = useState(false)

  const chosen = party.filter(p => !excluded.has(p.characterId))
  const xp = useMemo(() => totalXp(monsters), [monsters])
  const canStart = chosen.length + monsters.combatants.length > 0

  function toggle(characterId) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(characterId)) next.delete(characterId)
      else next.add(characterId)
      return next
    })
  }

  function start() {
    let s = emptyEncounterState()
    for (const p of chosen) {
      s = addPc(s, { characterId: p.characterId, name: p.name, initiativeBonus: p.initiativeBonus ?? 0 })
    }
    for (const m of monsters.combatants) {
      // Reusa o combatente já montado, só renumerando o id na sequência nova.
      s = { ...s, nextSeq: s.nextSeq + 1, combatants: [...s.combatants, { ...m, id: `k${s.nextSeq}` }] }
    }
    onStart(startEncounter(rollInitiative(s, rng).state))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
        <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
          Quem está na cena ({chosen.length})
        </h2>
        {party.length === 0 ? (
          <p className="p-4 text-sm ink-italic text-ink-300">Nenhuma ficha vinculada à mesa.</p>
        ) : (
          <ul className="divide-y divide-parchment-600/50">
            {party.map(p => (
              <li key={p.characterId} className="px-4 py-2 flex items-center gap-3">
                <input
                  id={`cena-${p.characterId}`}
                  type="checkbox"
                  checked={!excluded.has(p.characterId)}
                  onChange={() => toggle(p.characterId)}
                  className="w-4 h-4"
                />
                <label htmlFor={`cena-${p.characterId}`} className="flex-1 text-sm text-ink-500">
                  {p.name}
                </label>
                <span className="text-xs ink-italic text-ink-300">
                  inic. {(p.initiativeBonus ?? 0) >= 0 ? '+' : ''}{p.initiativeBonus ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
        <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100 flex items-center justify-between">
          <span>Monstros ({monsters.combatants.length})</span>
          {xp > 0 && <span className="ink-italic normal-case tracking-normal">{xp} XP</span>}
        </h2>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setBestiaryOpen(true)}>
              Adicionar monstros
            </Button>
            <label className="flex items-center gap-2 text-xs ink-italic text-ink-300">
              <input type="checkbox" checked={rollHp} onChange={e => setRollHp(e.target.checked)} className="w-4 h-4" />
              rolar HP em vez da média
            </label>
          </div>
          {monsters.combatants.length > 0 && (
            <ul className="divide-y divide-parchment-600/50">
              {monsters.combatants.map(m => (
                <li key={m.id} className="py-2 flex items-center gap-3 text-sm text-ink-500">
                  <span className="flex-1">{m.name}</span>
                  <span className="text-xs ink-italic text-ink-300">{m.currentHp} PV · CA {m.ac}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${m.name}`}
                    onClick={() => setMonsters(s => removeCombatant(s, m.id))}
                    className="text-xs text-red-700 hover:underline"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div>
        <Button onClick={start} disabled={!canStart}>Rolar iniciativa</Button>
      </div>

      <BestiaryModal
        isOpen={bestiaryOpen}
        onClose={() => setBestiaryOpen(false)}
        onPick={(monster) => setMonsters(s => addNpc(s, monster, { rollHp }))}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterSetupPanel.test.jsx`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/SetupPanel.jsx src/test/EncounterSetupPanel.test.jsx
git commit -m "feat(mesa-de-combate): painel de montagem da cena com monstros e iniciativa"
```

---

## Task 12: `CombatantRow` — a linha e suas ações

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/CombatantRow.jsx`
- Test: `src/test/CombatantRow.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/CombatantRow.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CombatantRow } from '../systems/dnd5e/components/Encounter/CombatantRow'

const npc = {
  id: 'k1', kind: 'npc', name: 'Goblin', monsterIndex: 'goblin',
  initiative: 16, initiativeBonus: 2, ac: 15,
  maxHp: 7, currentHp: 7, tempHp: 0, conditions: [], defeated: false,
}
const pc = {
  id: 'k2', kind: 'pc', name: 'Ana', characterId: 'a',
  initiative: 13, initiativeBonus: 2, orphaned: false,
}
const anaDoc = { id: 'a', combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [] } }

function setup(combatant, extra = {}) {
  const handlers = {
    onDamage: vi.fn(), onHeal: vi.fn(), onTempHp: vi.fn(),
    onToggleCondition: vi.fn(), onRemove: vi.fn(), onInitiativeChange: vi.fn(),
  }
  render(<CombatantRow combatant={combatant} doc={combatant.kind === 'pc' ? anaDoc : null} active={false} {...handlers} {...extra} />)
  return handlers
}

describe('CombatantRow — monstro', () => {
  it('mostra HP, CA e iniciativa', () => {
    setup(npc)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('7/7')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('16')).toBeInTheDocument()
  })

  it('aplicar dano manda o número digitado', async () => {
    const h = setup(npc)
    await userEvent.type(screen.getByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(h.onDamage).toHaveBeenCalledWith('k1', 5)
  })

  it('cura e HP temporário usam o mesmo campo', async () => {
    const h = setup(npc)
    await userEvent.type(screen.getByLabelText(/valor de dano ou cura/i), '4')
    await userEvent.click(screen.getByRole('button', { name: /^cura$/i }))
    expect(h.onHeal).toHaveBeenCalledWith('k1', 4)
    await userEvent.click(screen.getByRole('button', { name: /tempor/i }))
    expect(h.onTempHp).toHaveBeenCalledWith('k1', 4)
  })

  it('editar iniciativa avisa o pai', async () => {
    const h = setup(npc)
    const input = screen.getByDisplayValue('16')
    await userEvent.clear(input)
    await userEvent.type(input, '3')
    expect(h.onInitiativeChange).toHaveBeenLastCalledWith('k1', '3')
  })

  it('condição liga pelo id do catálogo do PHB', async () => {
    const h = setup(npc)
    await userEvent.click(screen.getByRole('button', { name: /condi/i }))
    await userEvent.click(screen.getByRole('button', { name: /prostrado/i }))
    expect(h.onToggleCondition).toHaveBeenCalledWith('k1', 'prone')
  })

  it('monstro derrotado aparece riscado', () => {
    setup({ ...npc, currentHp: 0, defeated: true })
    expect(screen.getByText('Goblin').className).toMatch(/line-through/)
  })
})

describe('CombatantRow — PJ', () => {
  it('lê HP da ficha, não do combatente', () => {
    setup(pc)
    expect(screen.getByText('18/20')).toBeInTheDocument()
  })

  it('PJ órfão desabilita as ações de escrita', () => {
    setup({ ...pc, orphaned: true })
    expect(screen.getByRole('button', { name: /^dano$/i })).toBeDisabled()
    expect(screen.getByText(/fora da mesa/i)).toBeInTheDocument()
  })

  it('mostra aviso de concentração quando o pai passa', () => {
    setup(pc, { warning: 'CD 12 de concentração' })
    expect(screen.getByText(/CD 12 de concentração/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/CombatantRow.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/CombatantRow'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/CombatantRow.jsx
import { useState } from 'react'
import { CONDITIONS, CONDITIONS_BY_ID } from '../../domain/conditions'

/**
 * Uma linha do combate. Não sabe persistir nada: chama de volta o pai, que
 * decide se a mudança vai pro `state` do encontro (monstro) ou pra RPC do
 * Mestre (PJ).
 *
 * @param {object} combatant
 * @param {object|null} doc — doc da ficha, obrigatório pro `pc` (HP vem dela)
 * @param {boolean} active — é o turno dele
 * @param {string} [warning] — aviso transitório (ex.: CD de concentração)
 */
export function CombatantRow({
  combatant, doc, active, warning,
  onDamage, onHeal, onTempHp, onToggleCondition, onRemove, onInitiativeChange,
}) {
  const [amount, setAmount] = useState('')
  const [condOpen, setCondOpen] = useState(false)

  const isPc = combatant.kind === 'pc'
  const locked = isPc && (combatant.orphaned || !doc)
  const hp = isPc
    ? { current: doc?.combat?.currentHp ?? 0, max: doc?.combat?.maxHp ?? 0, temp: doc?.combat?.tempHp ?? 0 }
    : { current: combatant.currentHp ?? 0, max: combatant.maxHp ?? 0, temp: combatant.tempHp ?? 0 }
  const conditions = isPc ? (doc?.combat?.conditions ?? []) : (combatant.conditions ?? [])
  const ac = isPc ? doc?.combat?.armorClass : combatant.ac
  const dead = isPc ? !!doc?.combat?.isDead : !!combatant.defeated

  const n = () => Math.max(0, Math.floor(Number(amount) || 0))

  return (
    <li className={`px-3 py-2 flex flex-col gap-2 ${active ? 'bg-amber-100 border-l-4 border-amber-700' : 'border-l-4 border-transparent'}`}>
      <div className="flex items-center gap-3">
        <input
          type="number"
          aria-label={`Iniciativa de ${combatant.name}`}
          value={combatant.initiative ?? ''}
          onChange={e => onInitiativeChange(combatant.id, e.target.value)}
          className="w-14 px-1 py-0.5 text-center text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <span className={`flex-1 text-sm font-display tracking-wide text-ink-500 ${dead ? 'line-through opacity-60' : ''}`}>
          {combatant.name}
          {isPc && combatant.orphaned && (
            <span className="ml-2 text-xs ink-italic text-red-700">fora da mesa</span>
          )}
        </span>
        <span className="text-sm text-ink-500">
          {hp.current}/{hp.max}
          {hp.temp > 0 && <span className="text-xs ink-italic text-ink-300"> (+{hp.temp})</span>}
        </span>
        {ac != null && (
          <span className="text-xs px-2 py-0.5 border-2 border-parchment-600 rounded-sm text-ink-500">{ac}</span>
        )}
        <button
          type="button"
          aria-label={`Remover ${combatant.name} do combate`}
          onClick={() => onRemove(combatant.id)}
          className="text-xs text-red-700 hover:underline"
        >
          ✕
        </button>
      </div>

      {conditions.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {conditions.map(id => (
            <li key={id} className="text-xs px-2 py-0.5 rounded-sm border border-parchment-600 bg-parchment-100 text-ink-500">
              {CONDITIONS_BY_ID[id]?.icon} {CONDITIONS_BY_ID[id]?.label ?? id}
            </li>
          ))}
        </ul>
      )}

      {warning && <p className="text-xs text-amber-800 ink-italic">{warning}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          aria-label={`Valor de dano ou cura para ${combatant.name}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-16 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <button type="button" disabled={locked} onClick={() => onDamage(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-red-700 text-red-700 rounded-sm disabled:opacity-40">Dano</button>
        <button type="button" disabled={locked} onClick={() => onHeal(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-green-800 text-green-800 rounded-sm disabled:opacity-40">Cura</button>
        <button type="button" disabled={locked} onClick={() => onTempHp(combatant.id, n())}
          className="text-xs px-2 py-1 border-2 border-parchment-600 text-ink-500 rounded-sm disabled:opacity-40">Temporário</button>
        <button type="button" disabled={locked} onClick={() => setCondOpen(o => !o)}
          className="text-xs px-2 py-1 border-2 border-parchment-600 text-ink-500 rounded-sm disabled:opacity-40">Condição</button>
      </div>

      {condOpen && (
        <ul className="flex flex-wrap gap-1">
          {CONDITIONS.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onToggleCondition(combatant.id, c.id)}
                title={c.rule}
                className={`text-xs px-2 py-1 rounded-sm border-2 ${
                  conditions.includes(c.id)
                    ? 'border-ink-600 bg-ink-500 text-parchment-50'
                    : 'border-parchment-600 text-ink-500 hover:bg-parchment-200'
                }`}
              >
                {c.icon} {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/CombatantRow.test.jsx`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/CombatantRow.jsx src/test/CombatantRow.test.jsx
git commit -m "feat(mesa-de-combate): linha de combatente com HP, condicoes do PHB e acoes"
```

---

## Task 13: `EncounterScreen` — orquestra e escreve na ficha

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/EncounterScreen.jsx`, `src/systems/dnd5e/components/Encounter/index.js`
- Test: `src/test/EncounterScreen.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/EncounterScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({ party: [], writes: [], writeResult: { ok: true, version: 2 } }))

vi.mock('../lib/campaigns', () => ({
  loadCampaignCharacters: vi.fn(async () => api.party),
}))
vi.mock('../lib/dmWrites', () => ({
  dmApplyCombatState: vi.fn(async (id, patch, v) => { api.writes.push({ id, patch, v }); return api.writeResult }),
  dmSaveCharacter: vi.fn(async () => ({ ok: true, version: 2 })),
}))
vi.mock('../lib/encounters', () => {
  let row = null
  return {
    getActiveEncounter: vi.fn(async () => row),
    createEncounter: vi.fn(async (campaignId, state) => { row = { id: 'enc-1', campaign_id: campaignId, state, version: 1 }; return { ok: true, row } }),
    saveEncounterState: vi.fn(async (id, state) => { row = { ...row, state, version: row.version + 1 }; return { ok: true, version: row.version } }),
    closeEncounter: vi.fn(async () => { row = null; return { ok: true } }),
    subscribeEncounter: vi.fn(() => () => {}),
  }
})
vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({ BestiaryModal: () => null }))

const { EncounterScreen } = await import('../systems/dnd5e/components/Encounter/EncounterScreen')

function anaRow(overrides = {}) {
  return {
    id: 'a', owner_id: 'u2', campaign_id: 'camp-1', short_id: 'ABCDEFGHJK', version: 4,
    data: {
      id: 'a', info: { name: 'Ana', level: 3 },
      attributes: { dex: 14 },
      combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 } },
      ...overrides,
    },
  }
}

beforeEach(() => { api.party = [anaRow()]; api.writes = []; api.writeResult = { ok: true, version: 5 } })

describe('EncounterScreen', () => {
  it('mostra a companhia da mesa na montagem', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    expect(await screen.findByLabelText('Ana')).toBeChecked()
  })

  it('rolar iniciativa entra na fase de combate com rodada 1', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    expect(await screen.findByText(/rodada 1/i)).toBeInTheDocument()
  })

  it('dano num PJ vai pela RPC com o patch estreito e a versão da ficha', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    await waitFor(() => expect(api.writes).toHaveLength(1))
    expect(api.writes[0]).toMatchObject({ id: 'a', v: 4 })
    expect(api.writes[0].patch).toMatchObject({ currentHp: 13, tempHp: 0, isDead: false })
    expect(api.writes[0].patch.maxHp).toBeUndefined()
    expect(await screen.findByText('13/20')).toBeInTheDocument()
  })

  it('avisa a CD de concentração quando o PJ estava concentrando', async () => {
    api.party = [anaRow({
      combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [], deathSaves: { successes: 0, failures: 0 }, concentrating: { spellIndex: 'bless', spellName: 'Bênção' } },
    })]
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByText(/CD 10 de concentração/i)).toBeInTheDocument()
  })

  it('conflito de versão avisa sem sobrescrever', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    api.writeResult = { ok: false, reason: 'conflict' }
    await userEvent.type(await screen.findByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(await screen.findByText(/ficha mudou/i)).toBeInTheDocument()
  })

  it('próximo turno avança e vira a rodada', async () => {
    render(<EncounterScreen campaignId="camp-1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /rolar iniciativa/i }))
    await userEvent.click(screen.getByRole('button', { name: /pr[óo]ximo/i }))
    expect(await screen.findByText(/rodada 2/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterScreen.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/EncounterScreen'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/EncounterScreen.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadCampaignCharacters } from '../../../../lib/campaigns'
import { rowToCharacter } from '../../../../utils/storage'
import { dmApplyCombatState } from '../../../../lib/dmWrites'
import { Button } from '../../../../components/ui/Button'
import { applyDamage, applyHealing, gainTempHp } from '../../domain/rules'
import { calculateInitiative } from '../../utils/calculations'
import { combatPatchFrom } from '../../domain/dmPatch'
import {
  applyNpcDamage, applyNpcHealing, setNpcTempHp, toggleNpcCondition,
  removeCombatant, setInitiative, nextTurn, previousTurn, markOrphans, totalXp,
} from '../../domain/encounter'
import { useEncounter } from './useEncounter'
import { SetupPanel } from './SetupPanel'
import { CombatantRow } from './CombatantRow'
import { PartyRestPanel } from './PartyRestPanel'

/**
 * Tela do Mestre pra rodar o combate da mesa (spec 2026-07-26).
 *
 * Duas fases: montagem (SetupPanel) e combate. O HP do PJ NUNCA é copiado pro
 * encontro — vem do doc da ficha, que esta tela mantém em `docs` e reescreve
 * pela RPC estreita do Mestre.
 */
export function EncounterScreen({ campaignId, onBack }) {
  const { state, update, close, loading, conflict: encConflict } = useEncounter(campaignId)
  const [docs, setDocs] = useState({})       // characterId → doc da ficha
  const [notes, setNotes] = useState({})     // combatantId → aviso transitório
  const [loadingParty, setLoadingParty] = useState(true)

  const reloadParty = useCallback(async () => {
    const rows = await loadCampaignCharacters(campaignId)
    const map = {}
    for (const r of rows) {
      const doc = rowToCharacter(r)
      if (doc) map[r.id] = doc
    }
    setDocs(map)
    setLoadingParty(false)
    return map
  }, [campaignId])

  useEffect(() => { reloadParty() }, [reloadParty])

  // Fichas que saíram da mesa continuam na ordem de iniciativa, só travadas.
  useEffect(() => {
    if (loadingParty || !state.started) return
    const live = Object.keys(docs)
    const stale = state.combatants.some(c => c.kind === 'pc' && c.orphaned !== !live.includes(c.characterId))
    if (stale) update(s => markOrphans(s, live))
  }, [docs, loadingParty, state.started, state.combatants, update])

  const party = useMemo(() => Object.values(docs).map(doc => ({
    characterId: doc.id,
    name: doc.info?.name ?? 'Sem nome',
    initiativeBonus: calculateInitiative(doc.attributes?.dex ?? 10, { feats: doc.info?.feats ?? [] }),
  })), [docs])

  function note(combatantId, text) {
    setNotes(prev => ({ ...prev, [combatantId]: text }))
  }

  /** Roda a regra em JS e manda só o patch estreito pro banco. */
  async function writePc(combatant, mutate) {
    const doc = docs[combatant.characterId]
    if (!doc) return
    const { character: next, sideEffects } = mutate(doc)
    setDocs(prev => ({ ...prev, [doc.id]: next }))       // otimista
    const res = await dmApplyCombatState(doc.id, combatPatchFrom(next), doc.version)
    if (res.ok) {
      setDocs(prev => ({ ...prev, [doc.id]: { ...next, version: res.version } }))
      const msgs = []
      if (sideEffects?.concentrationCheckDC) msgs.push(`CD ${sideEffects.concentrationCheckDC} de concentração`)
      if (sideEffects?.instakill) msgs.push('morte instantânea por dano massivo')
      else if (sideEffects?.died) msgs.push('morreu (3 falhas)')
      else if (sideEffects?.droppedTo0) msgs.push('caiu a 0 PV')
      note(combatant.id, msgs.join(' · '))
      return
    }
    const fresh = await reloadParty()
    note(combatant.id, res.reason === 'conflict'
      ? 'a ficha mudou no meio — recarregada, tente de novo'
      : `falha ao escrever na ficha (${res.reason})`)
    void fresh
  }

  const byId = (id) => state.combatants.find(c => c.id === id)

  const onDamage = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => applyNpcDamage(s, id, amount))
    return writePc(c, doc => applyDamage(doc, amount))
  }
  const onHeal = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => applyNpcHealing(s, id, amount))
    // applyHealing já devolve { character, sideEffects } (rules.js:1145).
    return writePc(c, doc => applyHealing(doc, amount))
  }
  const onTempHp = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => setNpcTempHp(s, id, amount))
    // gainTempHp devolve { character } sem sideEffects (rules.js:1179).
    return writePc(c, doc => gainTempHp(doc, amount))
  }
  const onToggleCondition = (id, conditionId) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => toggleNpcCondition(s, id, conditionId))
    return writePc(c, doc => {
      const list = doc.combat?.conditions ?? []
      const conditions = list.includes(conditionId)
        ? list.filter(x => x !== conditionId)
        : [...list, conditionId]
      return { character: { ...doc, combat: { ...doc.combat, conditions } }, sideEffects: null }
    })
  }

  if (loading || loadingParty) {
    return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando mesa de combate…</div>
  }

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="max-w-3xl mx-auto mb-4">
        <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesa</button>
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500 mt-1">Combate</h1>
        {state.started && (
          <p className="text-xs ink-italic text-ink-300">
            Rodada {state.round} · {totalXp(state)} XP em monstros
          </p>
        )}
        {encConflict && (
          <p className="text-xs text-amber-800 ink-italic">o encontro mudou em outra tela — recarregado</p>
        )}
      </header>

      <div className="max-w-3xl mx-auto grid gap-4">
        {!state.started ? (
          <SetupPanel party={party} onStart={(next) => update(() => next)} />
        ) : (
          <>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => update(previousTurn)}>Anterior</Button>
              <Button size="sm" onClick={() => update(nextTurn)}>Próximo</Button>
            </div>

            <ul className="rounded-sm border-2 border-parchment-600 bg-parchment-50 divide-y divide-parchment-600/50 overflow-hidden">
              {state.combatants.map(c => (
                <CombatantRow
                  key={c.id}
                  combatant={c}
                  doc={c.kind === 'pc' ? docs[c.characterId] ?? null : null}
                  active={state.activeId === c.id}
                  warning={notes[c.id]}
                  onDamage={onDamage}
                  onHeal={onHeal}
                  onTempHp={onTempHp}
                  onToggleCondition={onToggleCondition}
                  onRemove={(id) => update(s => removeCombatant(s, id))}
                  onInitiativeChange={(id, v) => update(s => setInitiative(s, id, v))}
                />
              ))}
            </ul>

            <PartyRestPanel docs={docs} onRested={reloadParty} />

            <div>
              <Button variant="ghost" size="sm" onClick={close}>Encerrar combate</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

```js
// src/systems/dnd5e/components/Encounter/index.js
export { EncounterScreen } from './EncounterScreen'
```

- [ ] **Step 4: Conferir os contratos que a tela consome**

Run: `grep -n "export function gainTempHp\|export function applyHealing\|export function applyDamage" src/systems/dnd5e/domain/rules.js`
Expected: `applyDamage` (1045), `applyHealing` (1145) e `gainTempHp` (1179). As
três devolvem `{ character, … }` — `applyDamage` e `applyHealing` com
`sideEffects`, `gainTempHp` sem. É por isso que `writePc` recebe a função crua,
sem embrulhar o retorno.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterScreen.test.jsx`
Expected: PASS — 6 testes.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/EncounterScreen.jsx src/systems/dnd5e/components/Encounter/index.js src/test/EncounterScreen.test.jsx
git commit -m "feat(mesa-de-combate): tela do Mestre escreve dano e condicao na ficha real"
```

---

## Task 14: `PartyRestPanel` — descanso em lote

**Files:**
- Create: `src/systems/dnd5e/components/Encounter/PartyRestPanel.jsx`
- Test: `src/test/PartyRestPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/PartyRestPanel.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({ calls: [], results: {} }))

vi.mock('../lib/dmWrites', () => ({
  dmApplyCombatState: vi.fn(),
  dmSaveCharacter: vi.fn(async (id, data, v) => {
    api.calls.push({ id, data, v })
    return api.results[id] ?? { ok: true, version: v + 1 }
  }),
}))

const { PartyRestPanel } = await import('../systems/dnd5e/components/Encounter/PartyRestPanel')

function doc(id, name, currentHp) {
  return {
    id, version: 3,
    info: { name, level: 3, class: 'Guerreiro' },
    combat: {
      maxHp: 20, currentHp, tempHp: 4, conditions: [],
      hitDice: { pool: { d10: { total: 3, used: 2 } } },
      deathSaves: { successes: 1, failures: 2 },
      classFeatureUses: [],
      turnState: { actionUsed: true, bonusUsed: false, reactionUsed: false, movementUsed: 3 },
      activeEffects: [{ id: 'bless', name: 'Bênção', mods: {} }],
    },
    spellcasting: { usedSlots: { 1: 2 }, pactSlotsUsed: 1 },
  }
}

const docs = { a: doc('a', 'Ana', 5), b: doc('b', 'Bruno', 11) }

beforeEach(() => { api.calls = []; api.results = {} })

describe('PartyRestPanel', () => {
  it('descanso longo salva cada ficha com HP cheio e recursos recuperados', async () => {
    const onRested = vi.fn()
    render(<PartyRestPanel docs={docs} onRested={onRested} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    for (const call of api.calls) {
      expect(call.v).toBe(3)
      expect(call.data.combat.currentHp).toBe(20)
      expect(call.data.combat.tempHp).toBe(0)
      expect(call.data.combat.activeEffects).toEqual([])
      expect(call.data.spellcasting.usedSlots).toEqual({})
      expect(call.data.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
    }
    expect(await screen.findByText(/2 fichas descansaram/i)).toBeInTheDocument()
    expect(onRested).toHaveBeenCalled()
  })

  it('descanso curto NÃO gasta dados de vida nem cura', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso curto/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    const ana = api.calls.find(c => c.id === 'a')
    expect(ana.data.combat.currentHp).toBe(5)
    expect(ana.data.combat.hitDice.pool.d10).toEqual({ total: 3, used: 2 })
    expect(ana.data.combat.turnState).toEqual({ actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 })
  })

  it('uma ficha falhando não impede as outras e o erro aparece', async () => {
    api.results.a = { ok: false, reason: 'conflict' }
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    expect(await screen.findByText(/1 ficha descansou/i)).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('sem fichas o painel não oferece botão', () => {
    render(<PartyRestPanel docs={{}} onRested={() => {}} />)
    expect(screen.queryByRole('button', { name: /descanso longo/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/PartyRestPanel.test.jsx`
Expected: FAIL — `Cannot find module '.../Encounter/PartyRestPanel'`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/systems/dnd5e/components/Encounter/PartyRestPanel.jsx
import { useState } from 'react'
import { dmSaveCharacter } from '../../../../lib/dmWrites'
import { performLongRest, performShortRest } from '../../utils/rest'
import { Button } from '../../../../components/ui/Button'

/**
 * Descanso da companhia inteira, disparado pelo Mestre.
 *
 * A regra é a MESMA da ficha do jogador (performLongRest/performShortRest); só
 * o caminho de escrita é outro (dm_save_character, doc completo com lock).
 * Descanso curto de propósito NÃO gasta dados de vida: quantos gastar é
 * escolha do jogador na ficha dele.
 */
export function PartyRestPanel({ docs, onRested }) {
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)

  const list = Object.values(docs ?? {})
  if (list.length === 0) return null

  async function rest(kind) {
    setBusy(true)
    setSummary(null)
    const failed = []
    let ok = 0
    for (const doc of list) {
      const next = kind === 'long' ? performLongRest(doc) : performShortRest(doc, { spent: [] })
      const res = await dmSaveCharacter(doc.id, stripMeta(next), doc.version)
      if (res.ok) ok += 1
      else failed.push({ name: doc.info?.name ?? doc.id, reason: res.reason })
    }
    setBusy(false)
    setSummary({ ok, failed })
    onRested?.()
  }

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Descanso da companhia
      </h2>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => rest('long')}>Descanso longo</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => rest('short')}>Descanso curto</Button>
        </div>
        <p className="text-xs ink-italic text-ink-300">
          O descanso curto recarrega os recursos e zera a economia de ação — gastar dados de vida
          continua sendo escolha de cada jogador na ficha dele.
        </p>
        {summary && (
          <div className="text-sm text-ink-500">
            <p>
              {summary.ok === 1 ? '1 ficha descansou' : `${summary.ok} fichas descansaram`}
              {summary.failed.length > 0 && `, ${summary.failed.length} falharam`}
            </p>
            {summary.failed.length > 0 && (
              <ul className="mt-1 text-xs text-red-700">
                {summary.failed.map(f => <li key={f.name}>{f.name} — {f.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** Metadados relacionais não vão dentro de `data` (espelham colunas). */
function stripMeta(doc) {
  const { ownerId: _o, campaignId: _c, version: _v, shortId: _s, ...rest } = doc
  void _o; void _c; void _v; void _s
  return rest
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/PartyRestPanel.test.jsx`
Expected: PASS — 4 testes.

- [ ] **Step 5: Rodar junto com a tela que o usa**

Run: `npx vitest run src/test/EncounterScreen.test.jsx src/test/PartyRestPanel.test.jsx`
Expected: PASS nos dois arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/Encounter/PartyRestPanel.jsx src/test/PartyRestPanel.test.jsx
git commit -m "feat(mesa-de-combate): descanso longo e curto da companhia em lote"
```

---

## Task 15: Ligar na casca — rota, registro e botão

**Files:**
- Modify: `src/systems/dnd5e/ui.jsx`, `src/systems/ui-registry.js`, `src/App.jsx`, `src/components/Campaigns/CampaignDetail.jsx`
- Test: `src/test/EncounterRoute.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/EncounterRoute.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { getLazyEncounter } from '../systems/ui-registry'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('registro de UI do sistema', () => {
  it('expõe a tela de combate do dnd5e', () => {
    expect(getLazyEncounter('dnd5e')).toBeTruthy()
  })

  it('sistema desconhecido não tem tela de combate', () => {
    expect(getLazyEncounter('daggerheart')).toBeNull()
  })

  it('memoiza o lazy (referência estável entre chamadas)', () => {
    expect(getLazyEncounter('dnd5e')).toBe(getLazyEncounter('dnd5e'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/EncounterRoute.test.jsx`
Expected: FAIL — `getLazyEncounter is not a function`.

- [ ] **Step 3: Write minimal implementation**

Em `src/systems/ui-registry.js`, ao lado dos outros getters:

```js
export const getLazyEncounter = (systemId) => getLazy(systemId, 'Encounter')
```

Em `src/systems/dnd5e/ui.jsx`, novo export (o `SrdProvider` é self-wrap, igual
às outras superfícies):

```jsx
import { EncounterScreen } from './components/Encounter'

export function Encounter(props) {
  return (
    <SrdProvider>
      <EncounterScreen {...props} />
    </SrdProvider>
  )
}
```

Em `src/App.jsx`, junto dos outros wrappers de rota (o `system` da mesa vem de
`getCampaignSystem`, que já existe em `lib/campaigns.js`):

```jsx
function EncounterRoute() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [system, setSystem] = useState(null)
  useEffect(() => {
    let alive = true
    getCampaignSystem(id).then(s => { if (alive) setSystem(s) })
    return () => { alive = false }
  }, [id])

  if (system === null) return <Loader />
  const Encounter = getLazyEncounter(system)
  if (!Encounter) return <Navigate to={`/campaigns/${id}`} replace />
  return (
    <RouteShell>
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Encounter campaignId={id} onBack={() => navigate(`/campaigns/${id}`)} />
    </RouteShell>
  )
}
```

Adicione os imports (`getLazyEncounter` de `./systems/ui-registry`,
`getCampaignSystem` de `./lib/campaigns`) e a rota, antes da rota `*`:

```jsx
          <Route path="/campaigns/:id/combate" element={<EncounterRoute />} />
```

Em `src/components/Campaigns/CampaignDetail.jsx`, dentro do primeiro bloco
`{isDM && (…)}`, acima de `<CampaignCharactersList …>`:

```jsx
        {isDM && (
          <div>
            <Button size="sm" onClick={() => navigate(`/campaigns/${campaign.id}/combate`)}>
              Rodar combate
            </Button>
          </div>
        )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/EncounterRoute.test.jsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: nenhuma falha nova. `src/test/App-routing.test.jsx` continua verde.

- [ ] **Step 6: Commit**

```bash
git add src/systems/ui-registry.js src/systems/dnd5e/ui.jsx src/App.jsx src/components/Campaigns/CampaignDetail.jsx src/test/EncounterRoute.test.jsx
git commit -m "feat(mesa-de-combate): rota /campaigns/:id/combate e botao na tela da mesa"
```

---

## Task 16: E2E do fluxo do Mestre

**Files:**
- Modify: `e2e-pw/support/supabase-stub.js`
- Create: `e2e-pw/encounter.spec.js`

- [ ] **Step 1: Estender o stub com mesas, encontros e a RPC do Mestre**

Em `e2e-pw/support/supabase-stub.js`, dentro de `stubSupabase`, antes do
`// characters`, adicione o estado e os handlers:

```js
  // Mesa de Combate: mesas, encontros e as RPCs do Mestre (migration 0015).
  const campaigns = opts.campaigns ?? []       // [{ id, name, dm_id, system }]
  const encounters = new Map()                 // id → row
  let encSeq = 1
```

Depois, ainda dentro do `context.route('**/rest/v1/**', …)`, antes do bloco
`if (path.startsWith('characters'))`:

```js
    if (path.startsWith('campaigns')) {
      if (method === 'GET') return json(route, wantsSingle ? (campaigns[0] ?? null) : campaigns)
      return json(route, wantsSingle ? {} : [])
    }

    if (path.startsWith('encounters')) {
      if (method === 'GET') {
        const rows = [...encounters.values()].filter(r => r.active)
        return json(route, wantsSingle ? (rows[0] ?? null) : rows)
      }
      if (method === 'POST') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const incoming = Array.isArray(body) ? body[0] : body
        const row = { id: `enc-${encSeq++}`, campaign_id: incoming.campaign_id, state: incoming.state, version: 1, active: true }
        encounters.set(row.id, row)
        return json(route, wantsSingle ? row : [row], 201)
      }
      if (method === 'PATCH') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const row = encounters.get(id)
        if (!row) return json(route, wantsSingle ? null : [])
        Object.assign(row, body, { version: row.version + 1 })
        const repr = { version: row.version }
        return json(route, wantsSingle ? repr : [repr])
      }
    }

    if (path.startsWith('rpc/dm_apply_combat_state')) {
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
      const row = store.get(body.p_character_id)
      if (!row) return json(route, { message: 'not_dm_of_campaign' }, 400)
      row.data = { ...row.data, combat: { ...row.data.combat, ...body.p_patch } }
      row.version += 1
      return json(route, row.version)
    }

    if (path.startsWith('rpc/dm_save_character')) {
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
      const row = store.get(body.p_character_id)
      if (!row) return json(route, { message: 'not_dm_of_campaign' }, 400)
      row.data = body.p_data
      row.version += 1
      return json(route, row.version)
    }
```

E na doc do `@param` de `stubSupabase`, acrescente `campaigns?: any[]`.

- [ ] **Step 2: Escrever o spec E2E (vai falhar)**

```js
// e2e-pw/encounter.spec.js
import { test, expect } from '@playwright/test'
import { installAuthedApp, USER_ID } from './support/supabase-stub.js'

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111'

const ANA = {
  id: '22222222-2222-4222-8222-222222222222',
  system: 'dnd5e',
  campaignId: CAMPAIGN_ID,
  info: { name: 'Ana', level: 3, class: 'Guerreiro', race: 'Humano', feats: [] },
  attributes: { str: 14, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
  combat: {
    maxHp: 20, currentHp: 18, tempHp: 0, armorClass: 16, conditions: [],
    deathSaves: { successes: 0, failures: 0 }, attacks: [], classFeatureUses: [],
    hitDice: { pool: { d10: { total: 3, used: 0 } } },
  },
  proficiencies: {}, spellcasting: {}, inventory: {},
}

test('Mestre monta combate, aplica dano e a ficha reflete', async ({ page, context }) => {
  await installAuthedApp(context, {
    characters: [ANA],
    campaigns: [{ id: CAMPAIGN_ID, name: 'Mesa de Teste', dm_id: USER_ID, system: 'dnd5e' }],
  })

  await page.goto(`/campaigns/${CAMPAIGN_ID}/combate`)

  // Fase de montagem: a companhia aparece marcada.
  const ana = page.getByLabel('Ana')
  await expect(ana).toBeChecked()

  // Inicia o combate.
  await page.getByRole('button', { name: /rolar iniciativa/i }).click()
  await expect(page.getByText(/rodada 1/i)).toBeVisible()
  await expect(page.getByText('18/20')).toBeVisible()

  // Aplica 5 de dano no PJ — vai pela RPC do Mestre e volta na linha.
  await page.getByLabel(/valor de dano ou cura/i).fill('5')
  await page.getByRole('button', { name: /^dano$/i }).click()
  await expect(page.getByText('13/20')).toBeVisible()

  // Condição aplicada pelo Mestre aparece como chip.
  await page.getByRole('button', { name: /condi/i }).click()
  await page.getByRole('button', { name: /prostrado/i }).click()
  await expect(page.getByText(/Prostrado/)).toBeVisible()

  // Descanso longo devolve a ficha ao HP cheio.
  await page.getByRole('button', { name: /descanso longo/i }).click()
  await expect(page.getByText(/1 ficha descansou/i)).toBeVisible()
  await expect(page.getByText('20/20')).toBeVisible()
})
```

- [ ] **Step 3: Rodar e verificar que falha antes do stub estar completo**

Run: `npx playwright test e2e-pw/encounter.spec.js`
Expected: FAIL na primeira execução se algum handler do stub estiver faltando —
o erro aponta a chamada não atendida. Complete o handler indicado e rode de novo.

- [ ] **Step 4: Rodar até passar**

Run: `npx playwright test e2e-pw/encounter.spec.js`
Expected: 1 passed.

- [ ] **Step 5: Garantir que os e2e antigos continuam verdes**

Run: `npm run test:e2e`
Expected: nenhuma falha nova (o stub ganhou handlers, não mudou os existentes).

- [ ] **Step 6: Commit**

```bash
git add e2e-pw/support/supabase-stub.js e2e-pw/encounter.spec.js
git commit -m "test(mesa-de-combate): e2e do fluxo do Mestre - dano, condicao e descanso"
```

---

## Task 17: Fechamento — lint, typecheck e suíte cheia

**Files:** nenhum arquivo novo; só correções apontadas pelas ferramentas.

- [ ] **Step 1: Lint**

Run: `npm run lint:gate`
Expected: PASS — o gate compara com a baseline (~616 erros pré-existentes).
Se acusar erro NOVO nos arquivos desta entrega, corrija; não mexa em débito antigo.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: nenhum erro novo nos arquivos criados nesta entrega.

- [ ] **Step 3: Suíte completa**

Run: `npm run test:all`
Expected: unit + e2e verdes.

- [ ] **Step 4: Confirmar que NÃO houve mudança em `public/srd-data`**

Run: `git diff --name-only master -- public/srd-data`
Expected: saída vazia — nenhum JSON mudou, então o `srd-data-vN` do
`vite.config.js` **não** precisa de bump.

- [ ] **Step 5: Commit de qualquer correção**

```bash
git add -A
git commit -m "chore(mesa-de-combate): ajustes de lint e typecheck"
```

---

## Self-review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| Domínio puro `encounter.js` (todas as funções da tabela) | 1, 2, 3 |
| Tabela `encounters` + índice parcial + RLS só do DM + trigger de version | 4 |
| `dm_apply_combat_state` com lista fechada e lock | 4 |
| `dm_save_character` com lock | 4 |
| Testes de perímetro (chave ilegal, não-DM, DM de outra mesa, conflito) | 5 |
| `lib/encounters.js` (CRUD + realtime, agnóstico de sistema) | 6 |
| `lib/dmWrites.js` + patch pela lista fechada | 7 |
| Regra em JS (`applyDamage`/`applyHealing`/rest) e nunca em SQL | 7, 13, 14 |
| Combatente PJ sem HP próprio, lido da ficha | 1, 12, 13 |
| Montar cena (PJs marcados, monstros do bestiário, HP médio ou rolado) | 9, 11 |
| Iniciativa em lote com dado visível e valor editável | 2, 11, 12 |
| Rodar (ordem, ativo, rodada, XP, próximo/anterior) | 2, 13 |
| Encerrar (`active=false`) | 6, 13 |
| Descanso longo e curto em lote, falha isolada por ficha | 14 |
| Conflito de versão: recusa, refetch, aviso | 6, 7, 10, 13, 14 |
| PJ órfão riscado e travado, mantido na ordem | 3, 12, 13 |
| Aviso de CD de concentração / queda a 0 / morte | 13 |
| Fronteira multi-sistema (rota delega, tela no sistema) | 15 |
| E2E do fluxo | 16 |
| Sem bump de `srd-data-vN` | 17 |

**Consistência de nomes verificada:** `emptyEncounterState`, `addPc`, `addNpc`,
`npcStatsFromMonster`, `sortByInitiative`, `rollInitiative` (retorna
`{ state, rolls }`), `setInitiative`, `startEncounter`, `nextTurn`,
`previousTurn`, `applyNpcDamage`, `applyNpcHealing`, `setNpcTempHp`,
`toggleNpcCondition`, `removeCombatant`, `markOrphans`, `totalXp`,
`combatPatchFrom`, `DM_COMBAT_KEYS`, `dmApplyCombatState`, `dmSaveCharacter`,
`getActiveEncounter`, `createEncounter`, `saveEncounterState`, `closeEncounter`,
`subscribeEncounter`, `useEncounter`, `SetupPanel`, `CombatantRow`,
`PartyRestPanel`, `EncounterScreen`, `getLazyEncounter` — usados com o mesmo
nome em toda task que os referencia.

**Contratos externos confirmados na escrita do plano:** `applyDamage`
(rules.js:1045), `applyHealing` (rules.js:1145) e `gainTempHp` (rules.js:1179)
existem e devolvem objeto embrulhando `character` — a Task 13 consome as três
sem re-embrulhar. `performLongRest` (rest.js:122) e
`performShortRest(char, { spent })` (rest.js:59) recebem e devolvem o doc
inteiro. `Button` aceita `variant` e `size`. `getCampaignSystem`
(campaigns.js:91) e `is_campaign_dm` (migration 0004) já existem.
