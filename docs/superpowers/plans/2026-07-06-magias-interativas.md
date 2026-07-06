# Rolagem Interativa de Magias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conjurar uma magia na ficha gasta o slot E rola tudo (ataque/dano/cura, com CD anunciada), escalonado por upcast e nível de personagem, com dados de mecânica curados em JSON.

**Architecture:** Camada de dados `public/srd-data/spell-mechanics-pt.json` (curada; gerador one-shot + guard-rail `--check`) → função pura `spellRollPlan()` (domínio) monta o plano de rolagens → executor `executeCastPlan()` chama `roll()` em sequência com máquina de crítico → `SpellRow` (aba Magias) dispara tudo no clique de conjurar. Extras: chip de Pact Magic no seletor (destrava Bruxo), cura aplicável aos PV, prompt de concentração no shell v2 (o sideEffect `concentrationCheckDC` JÁ EXISTE em `rules.applyDamage`).

**Tech Stack:** React 19, Vite 8, Vitest + Testing Library, Playwright, JSONs SRD servidos de `public/srd-data/` via SrdProvider.

**Spec:** `docs/superpowers/specs/2026-07-06-magias-interativas-design.md`

---

## Contexto essencial do codebase (leia antes de qualquer task)

- **`roll(notation, label, opts)`** (via `useDiceRoller()` de `src/hooks/useDiceRoller.js`): executa a rolagem, adiciona ao histórico e cuida da apresentação (dados 3D ou painel). **Retorna a entry SINCRONAMENTE**: `{ notation, rolls, modifier, total, sides, count, mode }`. `opts.mode: 'adv'|'dis'` (só vale em 1d20), `opts.crit: true` dobra os dados. NÃO chame `openPanel()` após `roll()` — a apresentação é centralizada no provider.
- **`parseAndRoll(notation, opts)`** (mesmo arquivo): parser puro, aceita `"8d6"`, `"1d20+7"`, `"3d4+3"`, `"5"`.
- **`Spells.jsx`** (`src/systems/dnd5e/components/CharacterSheet/Spells.jsx`): aba Magias compartilhada v1/v2. Já calcula `spellSaveDC`, `spellAttack`, `totalLevel`, `pactSlots`/`pactUsed`, e tem `SpellRow` com o seletor "Conjurar em: Nv X" que hoje SÓ gasta slot (`onToggleSlot`).
- **`rules.applyDamage`** (`src/systems/dnd5e/domain/rules.js:1010`) já retorna `sideEffects.concentrationCheckDC = max(10, floor(dano/2))` quando há concentração ativa. `useCharacter` guarda isso em `lastDamageEvent` e expõe `lastDamageEvent`/`clearLastDamageEvent` DENTRO de `updaters` (via contexto).
- **Testes de integração** usam `mockSrdFetch()` (`src/test/integration/helpers.js`) que serve QUALQUER arquivo de `public/srd-data/` pelo nome — o novo JSON funciona automaticamente.
- **Componentes v2** usam classes `.v2-*` e vars `--v2-*`. Em `Spells.jsx` (tela legada re-tematizada pela ponte CSS), REUSE só utilitários de cor que JÁ EXISTEM no arquivo (amber/gray/purple/emerald/blue/red). Se introduzir utilitário de cor novo em qualquer JSX, rode `node scripts/gen-bridge.mjs` e commite `src/theme/legacy-bridge.css` junto.
- **Commits:** título SEM acentos; corpo em PT pode ter acentos; terminar com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Após cada commit, `git push`.
- **Comandos:** teste unitário: `npx vitest run <arquivo>` (ou sem arquivo = suíte toda); build: `npm run build`; e2e: `npx playwright test <arquivo>`.

### Schema do spell-mechanics (referência para todas as tasks)

```jsonc
{
  "_ignore": ["aumentar-reduzir", "sono"],   // prosa tem dado, mas NÃO é rolagem do conjurador
  "bola-de-fogo": {
    "save": { "ability": "dex", "halfOnSuccess": true },
    "damage": [{ "dice": "8d6", "type": "fogo" }],
    "upcast": { "perSlot": "1d6" }
  },
  "raio-de-fogo":      { "attack": true, "damage": [{ "dice": "1d10", "type": "fogo" }], "cantripScaling": true },
  "curar-ferimentos":  { "heal": { "dice": "1d8", "addMod": true }, "upcast": { "perSlot": "1d8" } },
  "misseis-magicos":   { "damage": [{ "dice": "3d4+3", "type": "força" }], "upcast": { "perSlot": "1d4+1" } },
  "raio-ardente":      { "attack": true, "damage": [{ "dice": "2d6", "type": "fogo" }], "beams": { "base": 3, "perSlot": 1 } },
  "rajada-mistica":    { "attack": true, "damage": [{ "dice": "1d10", "type": "força" }], "beams": { "base": 1, "cantripScaling": true } }
}
```

Campos: `attack` (d20+ataque mágico antes do dano; nat 20 crita, nat 1 erra), `save.ability` (chave canônica `str|dex|con|int|wis|cha` de `domain/attributes.js`), `save.halfOnSuccess`, `damage[]` (`type` na lista canônica PT), `heal.addMod` (soma mod de conjuração), `upcast.perSlot` (dados somados por nível acima do base — aplica no PRIMEIRO pacote de damage, ou no heal quando não há damage), `cantripScaling` (dados ×2/×3/×4 nos níveis 5/11/17), `beams` (nº de raios, ataque INDIVIDUAL por raio; `beams.cantripScaling` escala Nº de raios e é exclusivo com o `cantripScaling` raiz; `beams.perSlot` exclusivo com `upcast.perSlot`).

---

### Task 1: Domínio — `spellRollPlan` (função pura)

**Files:**
- Create: `src/systems/dnd5e/domain/spellMechanics.js`
- Test: `src/test/spellMechanics.test.js`

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `src/test/spellMechanics.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  spellRollPlan, cantripTier, parseDiceNotation, DAMAGE_TYPES_PT,
} from '../systems/dnd5e/domain/spellMechanics'

const CTX = { slotLevel: null, characterLevel: 5, spellAttack: 6, spellMod: 3, spellDC: 14 }

describe('parseDiceNotation', () => {
  it('parseia contagem, lados e modificador', () => {
    expect(parseDiceNotation('8d6')).toEqual({ count: 8, sides: 6, mod: 0 })
    expect(parseDiceNotation('3d4+3')).toEqual({ count: 3, sides: 4, mod: 3 })
    expect(parseDiceNotation('d8-1')).toEqual({ count: 1, sides: 8, mod: -1 })
    expect(parseDiceNotation('banana')).toBeNull()
  })
})

describe('cantripTier', () => {
  it('segue PHB: 1/5/11/17', () => {
    expect(cantripTier(1)).toBe(1)
    expect(cantripTier(4)).toBe(1)
    expect(cantripTier(5)).toBe(2)
    expect(cantripTier(11)).toBe(3)
    expect(cantripTier(17)).toBe(4)
  })
})

describe('spellRollPlan', () => {
  it('retorna null sem mecânica', () => {
    expect(spellRollPlan({ name: 'X', level: 1 }, null, CTX)).toBeNull()
  })

  it('magia de salvaguarda: dano direto com CD anunciada no label', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '8d6', type: 'fogo' }], upcast: { perSlot: '1d6' } }
    const plan = spellRollPlan({ name: 'Bola de Fogo', level: 3 }, mech, { ...CTX, slotLevel: 3 })
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0]).toMatchObject({ kind: 'damage', notation: '8d6', critable: false })
    expect(plan.steps[0].label).toBe('Bola de Fogo · dano (Nv 3) · CD 14 · salvaguarda de DES · metade no sucesso')
  })

  it('upcast soma perSlot por nivel acima do base', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '8d6', type: 'fogo' }], upcast: { perSlot: '1d6' } }
    const plan = spellRollPlan({ name: 'Bola de Fogo', level: 3 }, mech, { ...CTX, slotLevel: 5 })
    expect(plan.steps[0].notation).toBe('10d6')
    expect(plan.steps[0].label).toContain('(Nv 5)')
  })

  it('upcast com modificador no dado (Misseis Magicos)', () => {
    const mech = { damage: [{ dice: '3d4+3', type: 'força' }], upcast: { perSlot: '1d4+1' } }
    const plan = spellRollPlan({ name: 'Mísseis Mágicos', level: 1 }, mech, { ...CTX, slotLevel: 3 })
    expect(plan.steps[0].notation).toBe('5d4+5')
  })

  it('truque de ataque escala dados pelo nivel do personagem', () => {
    const mech = { attack: true, damage: [{ dice: '1d10', type: 'fogo' }], cantripScaling: true }
    const plan = spellRollPlan({ name: 'Raio de Fogo', level: 0 }, mech, CTX)
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[0]).toMatchObject({ kind: 'attack', notation: '1d20+6', label: 'Raio de Fogo · ataque' })
    expect(plan.steps[1]).toMatchObject({ kind: 'damage', notation: '2d10', critable: true })
    expect(plan.steps[1].label).toBe('Raio de Fogo · dano')          // truque sem "(Nv N)"
    expect(plan.steps[1].critLabel).toBe('Raio de Fogo · dano CRÍTICO')
  })

  it('cura com addMod soma o mod de conjuracao; upcast no heal', () => {
    const mech = { heal: { dice: '1d8', addMod: true }, upcast: { perSlot: '1d8' } }
    const plan = spellRollPlan({ name: 'Curar Ferimentos', level: 1 }, mech, { ...CTX, slotLevel: 2 })
    expect(plan.steps).toEqual([
      { kind: 'heal', notation: '2d8+3', label: 'Curar Ferimentos · cura (Nv 2)' },
    ])
  })

  it('multiplos pacotes de dano levam o tipo no label; upcast so no primeiro', () => {
    const mech = { attack: true, damage: [{ dice: '4d6', type: 'cortante' }, { dice: '2d6', type: 'fogo' }] }
    const plan = spellRollPlan({ name: 'Golpe Flamejante', level: 2 }, mech, { ...CTX, slotLevel: 2 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].label).toContain('(cortante)')
    expect(dmg[1].label).toContain('(fogo)')
  })

  it('beams: um ataque POR raio; perSlot adiciona raios', () => {
    const mech = { attack: true, damage: [{ dice: '2d6', type: 'fogo' }], beams: { base: 3, perSlot: 1 } }
    const plan = spellRollPlan({ name: 'Raio Ardente', level: 2 }, mech, { ...CTX, slotLevel: 3 })
    const attacks = plan.steps.filter(s => s.kind === 'attack')
    const damages = plan.steps.filter(s => s.kind === 'damage')
    expect(attacks).toHaveLength(4)                                   // 3 + 1 (upcast)
    expect(damages).toHaveLength(4)
    expect(damages[0].notation).toBe('2d6')                           // dado por raio NAO escala
    expect(attacks[0].label).toBe('Raio Ardente · ataque · raio 1/4')
  })

  it('beams.cantripScaling escala o numero de raios (Rajada Mistica)', () => {
    const mech = { attack: true, damage: [{ dice: '1d10', type: 'força' }], beams: { base: 1, cantripScaling: true } }
    const plan = spellRollPlan({ name: 'Rajada Mística', level: 0 }, mech, { ...CTX, characterLevel: 11 })
    expect(plan.steps.filter(s => s.kind === 'attack')).toHaveLength(3)
    expect(plan.steps.filter(s => s.kind === 'damage')[0].notation).toBe('1d10')
  })

  it('anuncio de CD aparece so no primeiro passo de dano', () => {
    const mech = { save: { ability: 'dex', halfOnSuccess: true }, damage: [{ dice: '2d8', type: 'fogo' }, { dice: '1d6', type: 'frio' }] }
    const plan = spellRollPlan({ name: 'Teste', level: 2 }, mech, { ...CTX, slotLevel: 2 })
    const dmg = plan.steps.filter(s => s.kind === 'damage')
    expect(dmg[0].label).toContain('CD 14')
    expect(dmg[1].label).not.toContain('CD 14')
  })

  it('DAMAGE_TYPES_PT contem os 13 tipos canonicos', () => {
    expect(DAMAGE_TYPES_PT).toHaveLength(13)
    expect(DAMAGE_TYPES_PT).toContain('fogo')
    expect(DAMAGE_TYPES_PT).toContain('força')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/spellMechanics.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o domínio**

Criar `src/systems/dnd5e/domain/spellMechanics.js`:

```js
import { abbrOfKey } from './attributes'

/** Tipos de dano canônicos em PT (validação da camada de dados). */
export const DAMAGE_TYPES_PT = [
  'ácido', 'contundente', 'cortante', 'elétrico', 'fogo', 'força', 'frio',
  'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno',
]

/** Tier de truque pelo nível TOTAL do personagem (PHB: 1/5/11/17). */
export function cantripTier(level) {
  return level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1
}

/** '3d4+3' → { count, sides, mod } ; null se não for notação de dados. */
export function parseDiceNotation(str) {
  const m = String(str).replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!m) return null
  return {
    count: Math.max(1, parseInt(m[1] || '1', 10)),
    sides: parseInt(m[2], 10),
    mod: m[3] ? parseInt(m[3], 10) : 0,
  }
}

function fmtDice({ count, sides, mod }) {
  return `${count}d${sides}${mod > 0 ? `+${mod}` : mod < 0 ? String(mod) : ''}`
}

const fmtMod = n => (n >= 0 ? `+${n}` : String(n))

/** Soma `per` (mesmos lados — garantido pela validação dos dados) n vezes. */
function addDice(base, per, n) {
  if (!per || n <= 0) return base
  const b = parseDiceNotation(base)
  const p = parseDiceNotation(per)
  return fmtDice({ count: b.count + p.count * n, sides: b.sides, mod: b.mod + p.mod * n })
}

/** Multiplica a QUANTIDADE de dados (escalonamento de truque). */
function scaleDice(base, tier) {
  const b = parseDiceNotation(base)
  return fmtDice({ count: b.count * tier, sides: b.sides, mod: b.mod })
}

/** Acrescenta modificador plano à notação ('1d8' + 3 → '1d8+3'). */
function withFlatMod(base, m) {
  if (!m) return base
  const b = parseDiceNotation(base)
  return fmtDice({ ...b, mod: b.mod + m })
}

/**
 * Monta o plano de rolagens de uma conjuração.
 *
 * @param spell  { name, level } — magia da ficha
 * @param mech   entrada do spell-mechanics-pt.json (ou null → retorna null)
 * @param ctx    { slotLevel, characterLevel, spellAttack, spellMod, spellDC }
 * @returns { steps, announce } | null
 *   steps: [{ kind: 'attack'|'damage'|'heal', notation, label, critLabel?, critable? }]
 *   O executor (castSpell.js) percorre em ordem: ataque nat 20 → dano
 *   seguinte com crit; nat 1 → dano seguinte pulado.
 */
export function spellRollPlan(spell, mech, ctx) {
  if (!mech) return null
  const isCantrip = spell.level === 0
  const castLevel = isCantrip ? 0 : (ctx.slotLevel ?? spell.level)
  const above = isCantrip ? 0 : Math.max(0, castLevel - spell.level)
  const tier = cantripTier(ctx.characterLevel ?? 1)
  const lvlSuffix = isCantrip ? '' : ` (Nv ${castLevel})`

  const announce = mech.save
    ? `CD ${ctx.spellDC} · salvaguarda de ${abbrOfKey(mech.save.ability)}` +
      (mech.save.halfOnSuccess ? ' · metade no sucesso' : '')
    : null

  const beamCount = mech.beams
    ? (mech.beams.base ?? 1)
      + (mech.beams.perSlot ?? 0) * above
      + (mech.beams.cantripScaling ? tier - 1 : 0)
    : 1

  const steps = []
  for (let b = 1; b <= beamCount; b++) {
    const beamSuffix = beamCount > 1 ? ` · raio ${b}/${beamCount}` : ''
    if (mech.attack) {
      steps.push({
        kind: 'attack',
        notation: `1d20${fmtMod(ctx.spellAttack ?? 0)}`,
        label: `${spell.name} · ataque${beamSuffix}`,
      })
    }
    ;(mech.damage ?? []).forEach((pkt, i) => {
      let dice = pkt.dice
      if (mech.cantripScaling) dice = scaleDice(dice, tier)
      if (i === 0 && mech.upcast?.perSlot) dice = addDice(dice, mech.upcast.perSlot, above)
      const typePart = (mech.damage.length > 1) ? ` (${pkt.type})` : ''
      const cd = i === 0 && b === 1 && announce ? ` · ${announce}` : ''
      steps.push({
        kind: 'damage',
        notation: dice,
        label: `${spell.name} · dano${typePart}${lvlSuffix}${beamSuffix}${cd}`,
        critLabel: `${spell.name} · dano CRÍTICO${typePart}${lvlSuffix}${beamSuffix}${cd}`,
        critable: !!mech.attack,
      })
    })
  }

  if (mech.heal) {
    let dice = mech.heal.dice
    if (!mech.damage?.length && mech.upcast?.perSlot) dice = addDice(dice, mech.upcast.perSlot, above)
    if (mech.heal.addMod) dice = withFlatMod(dice, ctx.spellMod ?? 0)
    steps.push({ kind: 'heal', notation: dice, label: `${spell.name} · cura${lvlSuffix}` })
  }

  return { steps, announce }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/spellMechanics.test.js`
Expected: PASS (11 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/spellMechanics.js src/test/spellMechanics.test.js
git commit -m "feat(magias): spellRollPlan puro (upcast, truque, beams, CD no label)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 2: Executor — `executeCastPlan` (máquina de crítico)

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/castSpell.js`
- Test: `src/test/castSpell.test.js`

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `src/test/castSpell.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { executeCastPlan } from '../systems/dnd5e/components/CharacterSheet/castSpell'

// roll fake determinístico: d20 devolve o próximo valor da fila; dano devolve total 7.
function makeRoll(d20Queue = [10]) {
  const queue = [...d20Queue]
  const calls = []
  const roll = vi.fn((notation, label, opts = {}) => {
    calls.push({ notation, label, opts })
    if (/^1d20/.test(notation)) {
      const v = queue.shift() ?? 10
      return { notation, sides: 20, rolls: [v], modifier: 0, total: v, count: 1, mode: opts.mode ?? 'normal' }
    }
    return { notation, sides: 6, rolls: [7], modifier: 0, total: 7, count: 1, mode: 'normal' }
  })
  return { roll, calls }
}

const dmgStep = (over = {}) => ({
  kind: 'damage', notation: '2d6', label: 'X · dano', critLabel: 'X · dano CRÍTICO', critable: true, ...over,
})

describe('executeCastPlan', () => {
  it('ataque normal → dano normal', () => {
    const { roll, calls } = makeRoll([12])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls).toHaveLength(2)
    expect(calls[1]).toMatchObject({ notation: '2d6', label: 'X · dano', opts: {} })
  })

  it('nat 20 → dano com crit e critLabel', () => {
    const { roll, calls } = makeRoll([20])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls[1]).toMatchObject({ label: 'X · dano CRÍTICO', opts: { crit: true } })
  })

  it('nat 1 → dano pulado', () => {
    const { roll, calls } = makeRoll([1])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls).toHaveLength(1)
  })

  it('beams: cada raio resolve o proprio critico', () => {
    const { roll, calls } = makeRoll([1, 20])
    executeCastPlan([
      { kind: 'attack', notation: '1d20+6', label: 'X · ataque · raio 1/2' },
      dmgStep({ label: 'X · dano · raio 1/2', critLabel: 'X · dano CRÍTICO · raio 1/2' }),
      { kind: 'attack', notation: '1d20+6', label: 'X · ataque · raio 2/2' },
      dmgStep({ label: 'X · dano · raio 2/2', critLabel: 'X · dano CRÍTICO · raio 2/2' }),
    ], roll)
    // raio 1: nat 1 → só o ataque; raio 2: nat 20 → ataque + dano crítico
    expect(calls.map(c => c.label)).toEqual([
      'X · ataque · raio 1/2', 'X · ataque · raio 2/2', 'X · dano CRÍTICO · raio 2/2',
    ])
  })

  it('dano sem critable (salvaguarda) rola direto, sem d20', () => {
    const { roll, calls } = makeRoll()
    executeCastPlan([dmgStep({ critable: false })], roll)
    expect(calls).toHaveLength(1)
    expect(calls[0].opts).toEqual({})
  })

  it('mode adv propaga so pros ataques', () => {
    const { roll, calls } = makeRoll([15])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'a' }, dmgStep()], roll, { mode: 'adv' })
    expect(calls[0].opts).toEqual({ mode: 'adv' })
    expect(calls[1].opts).toEqual({})
  })

  it('heal acumula healTotal', () => {
    const { roll } = makeRoll()
    const { healTotal } = executeCastPlan([{ kind: 'heal', notation: '2d8+3', label: 'cura' }], roll)
    expect(healTotal).toBe(7)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/castSpell.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `src/systems/dnd5e/components/CharacterSheet/castSpell.js`:

```js
/**
 * Executa um plano de spellRollPlan chamando roll() em ordem.
 *
 * Máquina de crítico POR RAIO (PHB p.194/196): passo de ataque guarda
 * nat 20/nat 1 do d20 mantido; o passo de dano `critable` seguinte rola
 * com crit (dados dobrados) no nat 20 e é PULADO no nat 1. `mode`
 * ('adv'|'dis' — Shift/Alt no clique) vale só pros ataques.
 *
 * Retorna { healTotal } — soma dos passos de cura, pro botão
 * "Aplicar N PV" do SpellRow.
 */
export function executeCastPlan(steps, roll, { mode } = {}) {
  let pendingAttack = null
  let healTotal = 0

  for (const step of steps) {
    if (step.kind === 'attack') {
      const r = roll(step.notation, step.label, mode ? { mode } : {})
      const d20 = r && r.sides === 20 ? r.rolls?.[0] : null
      pendingAttack = { nat20: d20 === 20, nat1: d20 === 1 }
    } else if (step.kind === 'damage') {
      if (step.critable && pendingAttack?.nat1) { pendingAttack = null; continue }
      const isCrit = step.critable && pendingAttack?.nat20
      roll(step.notation, isCrit ? step.critLabel : step.label, isCrit ? { crit: true } : {})
      pendingAttack = null
    } else if (step.kind === 'heal') {
      const r = roll(step.notation, step.label)
      if (r) healTotal += r.total
    }
  }
  return { healTotal }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/castSpell.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/castSpell.js src/test/castSpell.test.js
git commit -m "feat(magias): executeCastPlan (maquina de critico por raio, healTotal)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 3: Gerador `gen-spell-mechanics.mjs` + rascunho inicial

**Files:**
- Create: `scripts/gen-spell-mechanics.mjs`
- Create: `public/srd-data/spell-mechanics-pt.json` (RASCUNHO — nada consome ainda)
- Test: `src/test/spell-mechanics-check.test.js`

- [ ] **Step 1: Escrever teste do heurístico (falhando)**

Criar `src/test/spell-mechanics-check.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { looksRollable, findUncovered } from '../../scripts/gen-spell-mechanics.mjs'

describe('looksRollable', () => {
  it('detecta dados na prosa (desc e higher_level)', () => {
    expect(looksRollable({ desc: 'sofre 8d6 de dano de fogo', higher_level: '' })).toBe(true)
    expect(looksRollable({ desc: 'nada', higher_level: 'aumenta em 1d6' })).toBe(true)
  })
  it('detecta cura sem dado explicito? nao — so com dado ou "pontos de vida" com recupera', () => {
    expect(looksRollable({ desc: 'o alvo recupera 1d8 pontos de vida', higher_level: '' })).toBe(true)
    expect(looksRollable({ desc: 'voce fica invisivel', higher_level: '' })).toBe(false)
  })
})

describe('findUncovered', () => {
  const spells = [
    { index: 'a', desc: '2d6 de dano', higher_level: '' },
    { index: 'b', desc: '1d4 na arma do alvo', higher_level: '' },
    { index: 'c', desc: 'sem dados', higher_level: '' },
  ]
  it('aponta rolavel sem entrada e fora do _ignore', () => {
    expect(findUncovered(spells, { _ignore: ['b'] })).toEqual(['a'])
    expect(findUncovered(spells, { a: { damage: [] }, _ignore: ['b'] })).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/spell-mechanics-check.test.js`
Expected: FAIL — script não existe.

- [ ] **Step 3: Implementar o gerador**

Criar `scripts/gen-spell-mechanics.mjs`:

```js
// Gerador do spell-mechanics-pt.json.
//
//   node scripts/gen-spell-mechanics.mjs --draft   # rascunho one-shot (recusa
//                                                  # sobrescrever; --force ignora)
//   node scripts/gen-spell-mechanics.mjs --check   # guard-rail: lista magias
//                                                  # roláveis sem curadoria (exit 1)
//
// O rascunho marca cada entrada com "_draft": true — a CURADORIA remove o
// marcador depois de conferir a entrada contra a prosa (fonte da verdade).
// Depois de curado, o JSON é editado À MÃO; --draft não re-roda por cima.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { keyFromName } from '../src/systems/dnd5e/domain/attributes.js'

const DATA_DIR = 'public/srd-data'
const OUT = `${DATA_DIR}/spell-mechanics-pt.json`

/* ── Heurística de detecção (usada pelo --check E pelo teste unitário) ── */
const DICE_RE = /\d*d\d+/i

export function looksRollable(spell) {
  const text = `${spell.desc ?? ''}\n${spell.higher_level ?? ''}`
  return DICE_RE.test(text)
}

/** Magias roláveis sem entrada no mechanics nem no _ignore. */
export function findUncovered(spells, mechanics) {
  const ignore = new Set(mechanics?._ignore ?? [])
  return spells
    .filter(s => looksRollable(s))
    .filter(s => !mechanics?.[s.index] && !ignore.has(s.index))
    .map(s => s.index)
}

/** Todas as fontes de magia PT presentes (futuras fontes entram sozinhas). */
export function loadSpellSources(dir = DATA_DIR) {
  return readdirSync(dir)
    .filter(f => /-spells-pt\.json$/.test(f))
    .flatMap(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
}

/* ── Rascunho por heurística (só bootstrap; curadoria confere tudo) ──── */
function draftEntry(spell) {
  const desc = spell.desc ?? ''
  const higher = spell.higher_level ?? ''
  const text = `${desc}\n${higher}`
  const entry = {}

  if (/ataque de magia/i.test(text)) entry.attack = true

  const save = text.match(/testes? de resist[êe]ncia de (Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma)/i)
  if (save) {
    entry.save = {
      ability: keyFromName(save[1][0].toUpperCase() + save[1].slice(1).toLowerCase()),
      halfOnSuccess: /metade d(?:esse|o) dano/i.test(text),
    }
  }

  const damage = []
  for (const m of desc.matchAll(/(\d*d\d+(?:\s*\+\s*\d+)?)\s*(?:pontos\s+)?de dano(?:\s+(?:de\s+)?([a-zà-úç]+))?/gi)) {
    damage.push({ dice: m[1].replace(/\s+/g, ''), type: (m[2] ?? '').toLowerCase() })
  }
  if (damage.length) entry.damage = damage

  const heal = desc.match(/recupera[^.]*?(\d*d\d+(?:\s*\+\s*\d+)?)[^.]*?pontos de vida/i)
  if (heal) {
    entry.heal = {
      dice: heal[1].replace(/\s+/g, ''),
      addMod: /modificador de (?:sua )?habilidade de conjura[çc][ãa]o/i.test(desc),
    }
  }

  const up = higher.match(/aumenta(?:m)? em (\d*d\d+(?:\+\d+)?)/i)
  if (up) entry.upcast = { perSlot: up[1] }

  if (spell.level === 0 && /5º n[íi]vel/i.test(text)) entry.cantripScaling = true

  entry._draft = true
  return entry
}

/* ── CLI ─────────────────────────────────────────────────────────────── */
function main() {
  const args = process.argv.slice(2)
  const spells = loadSpellSources()

  if (args.includes('--check')) {
    const mech = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
    const uncovered = findUncovered(spells, mech)
    if (uncovered.length) {
      console.error(`Magias rolaveis sem curadoria (${uncovered.length}) — adicione ao mechanics ou ao _ignore:\n` + uncovered.join('\n'))
      process.exit(1)
    }
    console.log('OK: todas as magias rolaveis estao curadas ou ignoradas.')
    return
  }

  if (args.includes('--draft')) {
    if (existsSync(OUT) && !args.includes('--force')) {
      console.error(`${OUT} ja existe — curadoria manual seria perdida. Use --force se souber o que esta fazendo.`)
      process.exit(1)
    }
    const out = { _ignore: [] }
    for (const s of spells.filter(looksRollable)) out[s.index] = draftEntry(s)
    writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
    console.log(`OK: rascunho com ${Object.keys(out).length - 1} entradas em ${OUT}`)
    return
  }

  console.log('Uso: node scripts/gen-spell-mechanics.mjs --draft | --check')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, '/').replace(/^([a-z]):/i, (m, d) => `${d.toUpperCase()}:`)) main()
```

**Atenção Windows:** se a guarda `if (...) main()` der problema no runner (paths com `\` vs `/`), simplifique para `const isCli = process.argv[1]?.endsWith('gen-spell-mechanics.mjs'); if (isCli) main()`. O importante: `main()` NÃO pode rodar quando o Vitest importa o módulo.

- [ ] **Step 4: Rodar teste e ver passar**

Run: `npx vitest run src/test/spell-mechanics-check.test.js`
Expected: PASS.

- [ ] **Step 5: Gerar o rascunho**

Run: `node scripts/gen-spell-mechanics.mjs --draft`
Expected: `OK: rascunho com ~N entradas` (N na casa de 150–250). Depois `node scripts/gen-spell-mechanics.mjs --check` deve imprimir `OK` (rascunho cobre tudo que o heurístico acha).

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-spell-mechanics.mjs public/srd-data/spell-mechanics-pt.json src/test/spell-mechanics-check.test.js
git commit -m "feat(magias): gerador de spell-mechanics (rascunho one-shot + modo check)

Rascunho NAO auditado (entradas marcadas _draft); nada consome o JSON
ainda. Curadoria nas proximas tasks remove os marcadores.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 4: Curadoria lote 1 (truques + níveis 1–2) + teste de validação

**Files:**
- Modify: `public/srd-data/spell-mechanics-pt.json`
- Test: `src/test/spell-mechanics-data.test.js`

**Processo de curadoria (vale pra esta task e pra Task 5):** para CADA entrada `_draft` cuja magia tem o nível do lote (olhe `level` em `public/srd-data/phb-spells-pt.json` / `tasha-spells-pt.json`):
1. Leia a `desc` e o `higher_level` da magia — a prosa é a fonte da verdade.
2. Corrija a entrada: dados/tipo de dano certos, `save.ability`/`halfOnSuccess`, `attack`, `heal.addMod`, `upcast.perSlot`, `cantripScaling`, `beams` (magias de múltiplos projéteis com ataque individual: Rajada Mística `{base:1, cantripScaling:true}`, Raio Ardente `{base:3, perSlot:1}`, Mísseis Mágicos NÃO — não tem ataque, modele como `3d4+3` + `perSlot 1d4+1`).
3. Tipos de dano devem estar na lista canônica (13): `ácido, contundente, cortante, elétrico, fogo, força, frio, necrótico, perfurante, psíquico, radiante, trovejante, veneno`.
4. Se o dado da prosa NÃO é dano do conjurador nem cura direta de PV → mova o index pro `_ignore`. Exemplos: buff no ALVO (`aumentar-reduzir` +1d4 na arma), pool de PV (`sono` 5d8), PV TEMPORÁRIO (`falsa-vida`, `heroismo` — tempHp não é cura), dado rolado pelo alvo, dano da ARMA do conjurador (ataques com arma — ex. `golpe-trovejante` estilo smite ficam em `_ignore` porque o dano base é da arma).
5. Remova o marcador `_draft` da entrada curada.
6. `upcast.perSlot` deve ter os MESMOS lados do dado que escala (validação exige).

- [ ] **Step 1: Escrever o teste de validação (falhando)**

Criar `src/test/spell-mechanics-data.test.js`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseDiceNotation, DAMAGE_TYPES_PT } from '../systems/dnd5e/domain/spellMechanics'
import { ABILITY_KEYS } from '../systems/dnd5e/domain/attributes'
import { findUncovered, loadSpellSources } from '../../scripts/gen-spell-mechanics.mjs'

const DATA = path.resolve(process.cwd(), 'public/srd-data')
const mech = JSON.parse(fs.readFileSync(path.join(DATA, 'spell-mechanics-pt.json'), 'utf8'))
const spells = loadSpellSources(DATA)
const byIndex = new Map(spells.map(s => [s.index, s]))

const ENTRY_KEYS = ['attack', 'save', 'damage', 'heal', 'upcast', 'cantripScaling', 'beams']
const entries = Object.entries(mech).filter(([k]) => k !== '_ignore')
const curated = entries.filter(([, v]) => !v._draft)

describe('spell-mechanics-pt.json — validacao integral (entradas curadas)', () => {
  it('todo index de entrada e de _ignore existe nas fontes', () => {
    const missing = [...entries.map(([k]) => k), ...(mech._ignore ?? [])].filter(k => !byIndex.has(k))
    expect(missing).toEqual([])
  })

  it('_ignore nao duplica entrada', () => {
    const dup = (mech._ignore ?? []).filter(k => mech[k])
    expect(dup).toEqual([])
  })

  // Loop único (não it.each: array vazio antes da curadoria quebraria o runner)
  it('todas as entradas curadas sao validas', () => {
    for (const [index, e] of curated) {
      const spell = byIndex.get(index)
      // só chaves conhecidas (pega _draftNote esquecido etc.)
      expect(Object.keys(e).filter(k => !ENTRY_KEYS.includes(k)), `${index}: chaves`).toEqual([])
      // tem pelo menos dano ou cura
      expect(Boolean(e.damage?.length || e.heal), `${index}: sem dano nem cura`).toBe(true)
      for (const pkt of e.damage ?? []) {
        expect(parseDiceNotation(pkt.dice), `${index}: dice ${pkt.dice}`).not.toBeNull()
        expect(DAMAGE_TYPES_PT, `${index}: type ${pkt.type}`).toContain(pkt.type)
      }
      if (e.heal) expect(parseDiceNotation(e.heal.dice), `${index}: heal.dice`).not.toBeNull()
      if (e.save) expect(ABILITY_KEYS, `${index}: save.ability`).toContain(e.save.ability)
      if (e.upcast) {
        const per = parseDiceNotation(e.upcast.perSlot)
        expect(per, `${index}: upcast.perSlot`).not.toBeNull()
        const target = e.damage?.length ? parseDiceNotation(e.damage[0].dice) : parseDiceNotation(e.heal.dice)
        expect(per.sides, `${index}: upcast de lados diferentes`).toBe(target.sides)
        expect(spell.level, `${index}: upcast em truque`).toBeGreaterThan(0)
      }
      if (e.cantripScaling) {
        expect(spell.level, `${index}: cantripScaling em magia com nivel`).toBe(0)
        expect(e.beams?.cantripScaling, `${index}: cantripScaling raiz E em beams`).toBeUndefined()
      }
      if (e.beams) {
        expect(e.beams.base, `${index}: beams.base`).toBeGreaterThanOrEqual(1)
        if (e.beams.perSlot) expect(e.upcast, `${index}: beams.perSlot E upcast.perSlot`).toBeUndefined()
        if (e.beams.cantripScaling) expect(spell.level, `${index}: beams.cantripScaling`).toBe(0)
      }
    }
  })

  it('lote curado: niveis 0-2 sem _draft', () => {
    const pending = entries
      .filter(([k, v]) => v._draft && (byIndex.get(k)?.level ?? 99) <= 2)
      .map(([k]) => k)
    expect(pending).toEqual([])
  })
})

describe('guard-rail — cobertura de fontes', () => {
  it('nenhuma magia rolavel descoberta (mechanics ou _ignore)', () => {
    expect(findUncovered(spells, mech)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/spell-mechanics-data.test.js`
Expected: FAIL em "niveis 0-2 sem _draft" (e possivelmente em entradas inválidas do rascunho de níveis 0–2 se já curadas erradas — o `it.each` só valida entradas SEM `_draft`).

- [ ] **Step 3: Curar truques + níveis 1–2**

Siga o processo de curadoria acima para TODAS as entradas `_draft` de magias com `level <= 2` (inclui as de Tasha desses níveis). Ao final desta etapa, nenhuma entrada de nível 0–2 tem `_draft`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/spell-mechanics-data.test.js`
Expected: PASS (o `it.each` agora valida todo o lote curado; níveis 3+ seguem `_draft` e ficam de fora até a Task 5).

- [ ] **Step 5: Commit**

```bash
git add public/srd-data/spell-mechanics-pt.json src/test/spell-mechanics-data.test.js
git commit -m "data(magias): curadoria do spell-mechanics niveis 0-2 + teste de validacao

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 5: Curadoria lote 2 (níveis 3–9 + restantes) — arquivo 100% curado

**Files:**
- Modify: `public/srd-data/spell-mechanics-pt.json`
- Modify: `src/test/spell-mechanics-data.test.js`

- [ ] **Step 1: Endurecer o teste (falhando)**

Em `src/test/spell-mechanics-data.test.js`, substituir o teste `'lote curado: niveis 0-2 sem _draft'` por:

```js
  it('arquivo 100% curado: nenhuma entrada _draft', () => {
    const pending = entries.filter(([, v]) => v._draft).map(([k]) => k)
    expect(pending).toEqual([])
  })
```

Run: `npx vitest run src/test/spell-mechanics-data.test.js`
Expected: FAIL listando as entradas de nível 3+.

- [ ] **Step 2: Curar níveis 3–9 (+ qualquer restante de Tasha)**

Mesmo processo de curadoria da Task 4 para TODAS as entradas `_draft` restantes. Atenção às clássicas: `bola-de-fogo` (8d6 fogo, DES metade, +1d6/nível), `relampago` (8d6 elétrico, DES metade, +1d6), `curar-ferimentos-em-massa`, `palavra-de-cura` (bônus: 1d4+mod), `orbe-cromatico` (ataque, 3d8, tipo À ESCOLHA → use o tipo mais comum ou mova pro `_ignore` se preferir não fixar tipo — decisão consciente, documente no commit), `desintegrar` (10d6+40 força — dado com modificador plano funciona: `10d6+40`).

- [ ] **Step 3: Rodar TUDO e ver passar**

Run: `npx vitest run src/test/spell-mechanics-data.test.js src/test/spell-mechanics-check.test.js`
Expected: PASS — validação integral + guard-rail zerado.

Run: `node scripts/gen-spell-mechanics.mjs --check`
Expected: `OK: todas as magias rolaveis estao curadas ou ignoradas.`

- [ ] **Step 4: Commit**

```bash
git add public/srd-data/spell-mechanics-pt.json src/test/spell-mechanics-data.test.js
git commit -m "data(magias): curadoria completa do spell-mechanics (niveis 3-9 + guard-rail)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 6: SrdProvider — dataset lazy `spellMechanics`

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx`

- [ ] **Step 1: Adicionar o dataset**

Em `src/systems/dnd5e/data/SrdProvider.jsx`, no objeto `DATASETS`, junto dos outros lazy (após a linha do `magicItemsTasha`):

```js
  spellMechanics:  { pt: 'spell-mechanics-pt.json',      fallback: null,                      lazy: true },
```

E em `EMPTY_DEFAULTS`, acrescentar:

```js
  spellMechanics: {},
```

(fica: `infusions: [], magicItems: [], spellMechanics: {},`)

- [ ] **Step 2: Verificação rápida**

Run: `npx vitest run src/test/integration/spells.test.jsx`
Expected: PASS (nada consumidor ainda; só garante que o provider não quebrou).

- [ ] **Step 3: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx
git commit -m "feat(magias): dataset lazy spellMechanics no SrdProvider

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 7: SpellRow — conjurar rola tudo (slots, truque, pact, CD)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/Spells.jsx`
- Test: `src/test/integration/spell-cast.test.jsx` (novo)

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `src/test/integration/spell-cast.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { mockSrdFetch } from './helpers'

/* Mock determinístico do roller: registra chamadas; d20 devolve rollState.d20. */
const { rollCalls, rollState } = vi.hoisted(() => ({ rollCalls: [], rollState: { d20: 10 } }))
vi.mock('../../hooks/useDiceRoller', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDiceRoller: () => ({
      roll: (notation, label, opts = {}) => {
        rollCalls.push({ notation, label, opts })
        const m = String(notation).match(/^1d20([+-]\d+)?$/)
        if (m) {
          const mod = m[1] ? parseInt(m[1], 10) : 0
          return { notation, sides: 20, rolls: [rollState.d20], modifier: mod, total: rollState.d20 + mod, count: 1, mode: opts.mode ?? 'normal' }
        }
        return { notation, sides: 8, rolls: [5], modifier: 0, total: 5, count: 1, mode: 'normal' }
      },
      dice3d: false, setDice3d: () => {}, setDiceAccent: () => {},
      openPanel: () => {}, history: [], open: false, mode: 'normal',
    }),
  }
})

const MAGO = { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência' }
const CLERIGO = { index: 'clerigo', name: 'Clérigo', hit_die: 8, spellcasting_ability: 'Sabedoria' }
const BRUXO = { index: 'bruxo', name: 'Bruxo', hit_die: 8, spellcasting_ability: 'Carisma' }

function makeChar(classIndex, ability, spells) {
  return {
    info: { name: 'Teste', class: classIndex, level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 16, cha: 16 },
    combat: {
      maxHp: 28, currentHp: 20, tempHp: 0, armorClass: 12, speed: 9, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability, usedSlots: {}, pactSlotsUsed: 0, spells },
  }
}

function Harness({ initial, classData, onApplyHealing = () => {}, spies = {} }) {
  const [character, setCharacter] = useState(initial)
  return (
    <SrdProvider>
      <Spells
        character={character}
        attributes={character.attributes}
        level={character.info.level}
        profBonus={3}
        classData={classData}
        onUpdateSpellcasting={() => {}}
        onAddSpell={() => {}}
        onRemoveSpell={() => {}}
        onTogglePrepared={() => {}}
        onToggleSlot={(lvl, used) => {
          spies.onToggleSlot?.(lvl, used)
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, usedSlots: { ...c.spellcasting.usedSlots, [lvl]: used } } }))
        }}
        onSpendPactSlot={(qty) => {
          spies.onSpendPactSlot?.(qty)
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, pactSlotsUsed: Math.min(qty, (c.spellcasting.pactSlotsUsed ?? 0) + 1) } }))
        }}
        onRegainPactSlot={() => {}}
        onSetConcentration={() => {}}
        onApplyHealing={onApplyHealing}
      />
    </SrdProvider>
  )
}

const BOLA = { id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true }
const RAIO_FOGO = { id: 's2', index: 'raio-de-fogo', name: 'Raio de Fogo', level: 0, school: 'Evocação' }
const CURAR = { id: 's3', index: 'curar-ferimentos', name: 'Curar Ferimentos', level: 1, school: 'Evocação', prepared: true }

beforeEach(() => {
  mockSrdFetch()
  rollCalls.length = 0
  rollState.d20 = 10
})
afterEach(() => vi.restoreAllMocks())

async function openCastPicker(user) {
  const cast = await screen.findByRole('button', { name: 'Conjurar' })
  await user.click(cast)
}

describe('conjurar rola tudo (Mago)', () => {
  it('salvaguarda: gasta o slot e rola o dano com CD no label', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    render(<Harness initial={makeChar('mago', 'int', [BOLA])} classData={MAGO} spies={{ onToggleSlot }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 3/ }))
    expect(onToggleSlot).toHaveBeenCalledWith(3, 1)
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    // Mago nv5 INT 16: CD 14 (8+3+3)
    expect(rollCalls[0]).toMatchObject({ notation: '8d6' })
    expect(rollCalls[0].label).toBe('Bola de Fogo · dano (Nv 3) · CD 14 · salvaguarda de DES · metade no sucesso')
  })

  it('upcast: conjurar no Nv 5 rola 10d6', async () => {
    const user = userEvent.setup()
    render(<Harness initial={makeChar('mago', 'int', [BOLA])} classData={MAGO} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 5/ }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('10d6')
  })

  it('truque rola direto sem gastar slot (ataque + dano escalonado)', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} spies={{ onToggleSlot }} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(2))
    expect(onToggleSlot).not.toHaveBeenCalled()
    expect(rollCalls[0]).toMatchObject({ notation: '1d20+6' })     // ataque +6 (3 prof + 3 INT)
    expect(rollCalls[1]).toMatchObject({ notation: '2d10' })       // tier 2 no nv 5
  })

  it('nat 20 no truque de ataque rola dano com crit', async () => {
    const user = userEvent.setup()
    rollState.d20 = 20
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(2))
    expect(rollCalls[1].opts).toEqual({ crit: true })
    expect(rollCalls[1].label).toContain('CRÍTICO')
  })

  it('nat 1 para no ataque (sem dano)', async () => {
    const user = userEvent.setup()
    rollState.d20 = 1
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
  })

  it('magia sem mecanica: conjura gasta o slot e NAO rola nada', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    const SEM = { id: 's9', index: 'compreender-idiomas', name: 'Compreender Idiomas', level: 1, school: 'Adivinhação', prepared: true }
    render(<Harness initial={makeChar('mago', 'int', [SEM])} classData={MAGO} spies={{ onToggleSlot }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onToggleSlot).toHaveBeenCalledWith(1, 1)
    expect(rollCalls).toHaveLength(0)
  })
})

describe('cura aplicavel (Clerigo)', () => {
  it('rola a cura com mod e o botao Aplicar chama onApplyHealing com o total', async () => {
    const user = userEvent.setup()
    const onApplyHealing = vi.fn()
    render(<Harness initial={makeChar('clerigo', 'wis', [CURAR])} classData={CLERIGO} onApplyHealing={onApplyHealing} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('1d8+3')                     // SAB 16 → +3
    const apply = await screen.findByRole('button', { name: /Aplicar 5 PV/ })
    await user.click(apply)
    expect(onApplyHealing).toHaveBeenCalledWith(5)
  })
})

describe('Pact Magic (Bruxo)', () => {
  it('chip Pacto aparece, gasta pact slot e rola no nivel do pacto', async () => {
    const user = userEvent.setup()
    const onSpendPactSlot = vi.fn()
    // Bruxo nv 5: pact slots Nv 3 ×2. Bola de Fogo nao e de bruxo, mas o
    // harness injeta direto na ficha — vale pro fluxo.
    render(<Harness initial={makeChar('bruxo', 'cha', [BOLA])} classData={BRUXO} spies={{ onSpendPactSlot }} />)
    await openCastPicker(user)
    const pact = await screen.findByRole('button', { name: /^Pacto Nv 3/ })
    await user.click(pact)
    expect(onSpendPactSlot).toHaveBeenCalled()
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('8d6')                       // Nv 3 = base, sem upcast
    expect(rollCalls[0].label).toContain('(Nv 3)')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/integration/spell-cast.test.jsx`
Expected: FAIL — `onApplyHealing` não existe, botão "Conjurar" (nome exato) pode não bater, pact chip e rolagens não existem.

- [ ] **Step 3: Implementar em `Spells.jsx`**

**3a. Imports novos** (topo do arquivo):

```js
import { useDiceRoller } from '../../../../hooks/useDiceRoller'
import { useLazySrdDataset } from '../../data/SrdProvider'
import { spellRollPlan } from '../../domain/spellMechanics'
import { executeCastPlan } from './castSpell'
```

**3b. Assinatura de `Spells`** — adicionar a prop `onApplyHealing`:

```js
export function Spells({ character, attributes, level, profBonus: profBonusProp, classData, onUpdateSpellcasting, onAddSpell, onRemoveSpell, onTogglePrepared, onToggleSlot, onSetConcentration, onSpendPactSlot, onRegainPactSlot, onApplyHealing, focusSpellId, onClearFocusSpell }) {
```

**3c. Dentro de `Spells()`**, após o cálculo de `spellAttack` (linha ~37), acrescentar:

```js
  const { roll } = useDiceRoller()
  const spellMechanics = useLazySrdDataset('spellMechanics')
  const spellMod = spellAbility ? Math.floor((abilityScore - 10) / 2) : 0

  /**
   * Conjurar = gastar o recurso E rolar o plano da magia (spec 2026-07-06).
   * Shift no clique = vantagem, Alt = desvantagem (só nos d20 de ataque).
   * Retorna { healTotal } pro SpellRow exibir "Aplicar N PV" (ou null).
   */
  function handleCast(spell, { slotLevel = null, pact = false, event = null } = {}) {
    if (pact) onSpendPactSlot?.(pactSlots.qty)
    else if (slotLevel != null) onToggleSlot?.(slotLevel, (usedSlots[slotLevel] || 0) + 1)

    const mech = spellMechanics?.[spell.index]
    if (!mech) return null
    const plan = spellRollPlan(spell, mech, {
      slotLevel: pact ? pactSlots.slotLevel : slotLevel,
      characterLevel: totalLevel,
      spellAttack,
      spellMod,
      spellDC: spellSaveDC,
    })
    if (!plan) return null
    const mode = event?.shiftKey ? 'adv' : event?.altKey ? 'dis' : undefined
    return executeCastPlan(plan.steps, roll, { mode })
  }
```

**3d. Na renderização do `<SpellRow>`** (dentro do map de `group.map(spell => ...)`), adicionar as props:

```jsx
                  hasMechanics={!!spellMechanics?.[spell.index]}
                  onCast={(opts) => handleCast(spell, opts)}
                  pactOption={pactSlots ? { slotLevel: pactSlots.slotLevel, remaining: pactSlots.qty - pactUsed } : null}
                  onApplyHealing={onApplyHealing}
```

**3e. `SpellRow`** — mudanças:

Assinatura: acrescentar `hasMechanics, onCast, pactOption, onApplyHealing` às props.

Estado novo (junto de `castOpen`/`castedAt`):

```js
  const [pendingHeal, setPendingHeal] = useState(null)
```

Substituir a função `castAt` por:

```js
  function castAt(slotLevel, e, { pact = false } = {}) {
    const result = onCast?.({ slotLevel: pact ? null : slotLevel, pact, event: e })
    setCastOpen(false)
    setCastedAt(slotLevel)
    setTimeout(() => setCastedAt(null), 1800)
    if (result?.healTotal > 0) {
      setPendingHeal(result.healTotal)
      setTimeout(() => setPendingHeal(null), 10000)
    }
  }
```

Disponibilidade do Pact no seletor (logo após o cálculo de `availableSlots`):

```js
  const pactAvailable = spell.level > 0 && canCast && pactOption
    && pactOption.remaining > 0 && pactOption.slotLevel >= spell.level
```

O botão ⚡ "Conjurar" (o `spell.level > 0 && (...)`) passa a considerar o pact: trocar as DUAS condições `availableSlots.length === 0` por `availableSlots.length === 0 && !pactAvailable` (no `onClick` e no `disabled`/`title`/`className`). Adicionar `aria-label="Conjurar"` já existe — manter.

Botão de truque (novo — inserir ANTES do bloco `spell.level > 0 && (...)` do ⚡):

```jsx
      {spell.level === 0 && hasMechanics && (
        <button
          onClick={(e) => onCast?.({ event: e })}
          title={'Rolar truque\nShift+click: vantagem · Alt+click: desvantagem'}
          aria-label={`Rolar ${spell.name}`}
          className="flex-shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-1 rounded border transition-colors border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40"
        >
          <Icon name="bolt" size={12} strokeWidth={2} />
        </button>
      )}
```

Chip do Pacto (dentro do bloco `castOpen && ...`, junto dos chips `Nv {sl}` — inserir após o map de `availableSlots`):

```jsx
        {pactAvailable && (
          <button
            onClick={(e) => castAt(pactOption.slotLevel, e, { pact: true })}
            title={`Pact Magic — espaço de nível ${pactOption.slotLevel} (recarrega em descanso curto)`}
            className="text-xs px-2 py-0.5 rounded border font-mono transition-colors border-purple-500 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40"
          >
            Pacto Nv {pactOption.slotLevel} ({pactOption.remaining})
          </button>
        )}
```

E o gate do bloco do seletor muda de `castOpen && availableSlots.length > 0` para `castOpen && (availableSlots.length > 0 || pactAvailable)`.

Botão transiente de cura (logo após o badge `castedAt && (...)`):

```jsx
      {pendingHeal != null && (
        <button
          onClick={() => { onApplyHealing?.(pendingHeal); setPendingHeal(null) }}
          className="flex-shrink-0 text-xs px-2 py-0.5 rounded border font-bold transition-colors border-emerald-600 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
        >
          ✚ Aplicar {pendingHeal} PV
        </button>
      )}
```

Além disso, no `castOpen`: o botão de abrir (`onClick={() => availableSlots.length > 0 && setCastOpen(v => !v)}`) vira `onClick={() => (availableSlots.length > 0 || pactAvailable) && setCastOpen(v => !v)}`.

**Cores:** todos os utilitários acima (amber-700/900, purple-500/900, emerald-600/900 etc.) já existem em `Spells.jsx` ou nos componentes da ficha. Após editar, rode `node scripts/gen-bridge.mjs`; se `src/theme/legacy-bridge.css` mudar, commite junto. Se o gerador abortar com token sem mapeamento, troque o utilitário por um que já exista no arquivo.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/integration/spell-cast.test.jsx`
Expected: PASS (9 testes).

Run também a suíte antiga da aba: `npx vitest run src/test/integration/spells.test.jsx src/test/integration/concentration.test.jsx`
Expected: PASS (sem regressão).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/Spells.jsx src/test/integration/spell-cast.test.jsx src/theme/legacy-bridge.css
git commit -m "feat(magias): conjurar gasta slot e rola tudo (upcast, truque, pact, CD, cura)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

(Se `legacy-bridge.css` não mudou, tire do `git add`.)

---

### Task 8: Wiring da cura — `onApplyHealing` nos dois shells

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx` (~linha 120, bloco `<Spells`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` (~linha 301, bloco `<Spells`)

- [ ] **Step 1: MainBox (v2)**

Em `MainBox.jsx`, no destructuring de `updaters` (linha ~77), acrescentar `applyHealing`:

```js
    updateSpellcasting, addSpell, removeSpell, togglePrepared, toggleSlot,
    spendPactSlot, regainPactSlot, setConcentration, applyHealing,
```

E no `<Spells ...>` acrescentar a prop:

```jsx
            onApplyHealing={applyHealing}
```

- [ ] **Step 2: SheetContent (v1)**

Em `SheetContent.jsx`, `applyHealing` já é destructurado de `updaters` (linha ~104). No bloco `<Spells` (linha ~301) acrescentar a mesma prop:

```jsx
          onApplyHealing={applyHealing}
```

- [ ] **Step 3: Verificar**

Run: `npx vitest run src/test/integration/spell-cast.test.jsx src/test/sheetV2-RollableRow.test.jsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx
git commit -m "feat(magias): onApplyHealing ligado nos shells v1 e v2

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 9: Prompt de concentração no shell v2

**Files:**
- Create: `src/systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx` (renderizar após `{banner}`)
- Test: `src/test/concentrationPromptV2.test.jsx`

Contexto: `rules.applyDamage` JÁ emite `sideEffects.concentrationCheckDC`; `useCharacter` guarda em `lastDamageEvent` DENTRO de `updaters` (junto com `clearLastDamageEvent` e `setConcentration`). O helper `renderWithSheetContext` (`src/test/helpers/sheetV2TestContext.jsx`) monta o contexto v2 com `makeUpdaters`/`makeDice`/`makeCalc`.

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `src/test/concentrationPromptV2.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConcentrationPromptV2 } from '../systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

function concentratingChar() {
  const base = makeCharacter()
  return { ...base, combat: { ...base.combat, concentrating: { spellIndex: 'bencao', spellName: 'Bênção' } } }
}

function setup({ dc = 12, d20Total = 18, updaterSpies = {} } = {}) {
  const rollFn = vi.fn(() => ({ sides: 20, rolls: [d20Total - 9], total: d20Total }))
  const updaters = makeUpdaters({
    lastDamageEvent: dc == null ? null : { kind: 'damage', damageDealt: dc * 2, concentrationCheckDC: dc },
    clearLastDamageEvent: updaterSpies.clear ?? vi.fn(),
    setConcentration: updaterSpies.setConc ?? vi.fn(),
  })
  renderWithSheetContext(<ConcentrationPromptV2 />, {
    character: concentratingChar(),
    dice: { roll: rollFn },
    updaters,
  })
  return { rollFn }
}

describe('ConcentrationPromptV2', () => {
  it('mostra CD e a magia quando ha check pendente', () => {
    setup({ dc: 12 })
    expect(screen.getByText(/CD 12/)).toBeInTheDocument()
    expect(screen.getByText(/Bênção/)).toBeInTheDocument()
  })

  it('nao renderiza sem DC pendente', () => {
    setup({ dc: null })
    expect(screen.queryByText(/Teste de Concentração/)).not.toBeInTheDocument()
  })

  it('rola CON pela pipeline (1d20+9 do makeCalc) e mostra sucesso', async () => {
    const user = userEvent.setup()
    const { rollFn } = setup({ dc: 12, d20Total: 18 })
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(rollFn).toHaveBeenCalledWith('1d20+9', expect.stringContaining('CD 12'), {})
    expect(screen.getByText(/✓ mantida/)).toBeInTheDocument()
  })

  it('falha NAO rompe sozinha; Romper chama setConcentration(null)', async () => {
    const user = userEvent.setup()
    const setConc = vi.fn()
    const clear = vi.fn()
    setup({ dc: 20, d20Total: 5, updaterSpies: { setConc, clear } })
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(screen.getByText(/✗ falhou/)).toBeInTheDocument()
    expect(setConc).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Romper' }))
    expect(setConc).toHaveBeenCalledWith(null)
    expect(clear).toHaveBeenCalled()
  })

  it('fechar (✕) so limpa o evento', async () => {
    const user = userEvent.setup()
    const clear = vi.fn()
    const setConc = vi.fn()
    setup({ dc: 12, updaterSpies: { clear, setConc } })
    await user.click(screen.getByRole('button', { name: /Fechar aviso de concentração/ }))
    expect(clear).toHaveBeenCalled()
    expect(setConc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/concentrationPromptV2.test.jsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `src/systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2.jsx`:

```jsx
import { useRef, useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useDiceRoller } from '../../../../../hooks/useDiceRoller'

/**
 * Prompt de teste de concentração do shell v2 (PHB p.203).
 * Aparece quando o último evento de dano trouxe concentrationCheckDC
 * (sideEffect que rules.applyDamage já emite) e o personagem segue
 * concentrando — cobre modal de dano E controles rápidos, porque o gancho
 * é o sideEffect, não a UI de origem.
 * NÃO rompe sozinho: na falha o botão Romper ganha destaque — a decisão
 * é do jogador (War Caster, contexto do mestre etc.; Shift = vantagem).
 */
export function ConcentrationPromptV2() {
  const { character, calc, updaters, readOnly } = useCharacterContext()
  const { roll } = useDiceRoller()
  const [result, setResult] = useState(null)

  const event = updaters.lastDamageEvent
  // Novo evento de dano zera o resultado anterior (reset de estado derivado).
  const eventRef = useRef(event)
  if (eventRef.current !== event) {
    eventRef.current = event
    if (result) setResult(null)
  }

  const dc = event?.concentrationCheckDC
  const spell = character.combat?.concentrating
  if (readOnly || dc == null || !spell?.spellIndex) return null

  const bonus = calc.savingThrows?.con ?? 0

  function handleRoll(e) {
    const mode = e.shiftKey ? 'adv' : e.altKey ? 'dis' : undefined
    const entry = roll(`1d20${calc.fmt(bonus)}`, `Concentração · salvaguarda de CON (CD ${dc})`, mode ? { mode } : {})
    if (entry) setResult({ total: entry.total, passed: entry.total >= dc })
  }

  function dismiss() {
    setResult(null)
    updaters.clearLastDamageEvent?.()
  }

  return (
    <div className="v2-panel" role="alert" style={{ borderColor: 'var(--v2-accent)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        Teste de Concentração — <strong>CD {dc}</strong>
        <span className="v2-mut"> · {spell.spellName}</span>
        {result && (
          <span style={{ marginLeft: 8, fontWeight: 600, color: result.passed ? 'var(--v2-success)' : 'var(--v2-danger)' }}>
            {result.total} vs CD {dc} — {result.passed ? '✓ mantida' : '✗ falhou'}
          </span>
        )}
      </span>
      {!result && (
        <button type="button" className="v2-btn" onClick={handleRoll} title="Shift: vantagem · Alt: desvantagem">
          Rolar salvaguarda de CON
        </button>
      )}
      <button
        type="button"
        className="v2-btn"
        onClick={() => { updaters.setConcentration?.(null); dismiss() }}
        style={result && !result.passed ? { borderColor: 'var(--v2-danger)', color: 'var(--v2-danger)' } : undefined}
      >
        Romper
      </button>
      <button type="button" className="v2-btn" aria-label="Fechar aviso de concentração" onClick={dismiss}>✕</button>
    </div>
  )
}
```

Em `SheetV2.jsx`: importar e renderizar logo após `{banner}`:

```jsx
import { ConcentrationPromptV2 } from './ConcentrationPromptV2'
...
        {banner}
        <ConcentrationPromptV2 />
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/concentrationPromptV2.test.jsx`
Expected: PASS (5 testes).

Rodar também os testes existentes do shell v2: `npx vitest run src/test/sheetV2-RollableRow.test.jsx src/test/sheetV2-roll-rows.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2.jsx src/systems/dnd5e/components/CharacterSheet/v2/SheetV2.jsx src/test/concentrationPromptV2.test.jsx
git commit -m "feat(magias): prompt de concentracao no shell v2 (nao rompe sozinho)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

### Task 10: E2E determinístico + bump do cache SW + gates finais

**Files:**
- Create: `e2e-pw/spell-cast.spec.js`
- Modify: `vite.config.js` (cacheName `srd-data-v21` → `srd-data-v22` + linha de changelog no comentário)

- [ ] **Step 1: Bump do cache do service worker**

Em `vite.config.js`, no comentário-changelog acima do `urlPattern` de `/srd-data/`, acrescentar a linha:

```
            \  v21 → v22 (2026-07-06): spell-mechanics-pt.json (rolagem de magias)
```

E trocar `cacheName: 'srd-data-v21'` por `cacheName: 'srd-data-v22'`.

- [ ] **Step 2: Escrever o e2e**

Criar `e2e-pw/spell-cast.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Conjurar Bola de Fogo no Nv 3: gasta o slot e o painel ROLAGENS (fluxo
// clássico — dice3d off semeado pelo stub) mostra o dano com a CD anunciada.
// Mago nv 5, INT 16: CD 14 (8 + prof 3 + mod 3).
test('conjurar magia gasta slot e rola dano com CD anunciada', async ({ context, page }) => {
  const id = '77777777-7777-4777-8777-777777777777'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Mago Conjurador', {
      shortId: 'MAGECASTBC',
      info: { name: 'Mago Conjurador', race: 'humano', class: 'mago', level: 5, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'sabio' },
      attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
      spellcasting: {
        ability: 'int', usedSlots: {}, pactSlotsUsed: 0,
        spells: [{ id: 'sp1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true }],
      },
    })],
  })
  await page.goto('/c/MAGECASTBC')
  await expect(page.getByText('Mago Conjurador').first()).toBeVisible()

  // Aba Magias do MainBox v2
  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await expect(page.getByText('Bola de Fogo').first()).toBeVisible()

  // Conjurar → escolher o espaço de Nv 3
  await page.getByRole('button', { name: 'Conjurar' }).first().click()
  await page.getByRole('button', { name: /^Nv 3/ }).first().click()

  // Painel clássico abre com o dano e a CD anunciada no label
  await expect(page.getByRole('heading', { name: 'Rolagens' })).toBeVisible()
  await expect(page.getByText(/Bola de Fogo · dano \(Nv 3\) · CD 14 · salvaguarda de DES/).first()).toBeVisible()

  // Slot de Nv 3 gasto: tracker mostra 1/2 (mago nv 5 tem 2 espaços de Nv 3)
  await expect(page.getByText('1/2').first()).toBeVisible()
})
```

- [ ] **Step 3: Rodar o e2e novo**

Run: `npx playwright test e2e-pw/spell-cast.spec.js`
Expected: PASS. Se o seletor da aba falhar (`role: 'tab'` duplicado mobile/desktop), use `.first()` — já está no código acima.

- [ ] **Step 4: Gates finais**

Run: `npx vitest run`
Expected: PASS (~1640+ testes; flake conhecido de timeout em LoginScreen/ResetPasswordScreen na suíte cheia — se falhar SÓ isso, re-rode o arquivo isolado pra confirmar).

Run: `npm run build`
Expected: build verde.

Run: `npx playwright test`
Expected: todos os specs passam (24 com o novo).

- [ ] **Step 5: Commit**

```bash
git add e2e-pw/spell-cast.spec.js vite.config.js
git commit -m "test(magias): e2e de conjuracao deterministico + bump srd-data-v22

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Fora de escopo (NÃO implementar)

- Efeitos ativos na ficha (buffs Bênção/Velocidade etc.) — sub-projeto B, spec própria.
- Re-rolagem avulsa sem gastar slot; conjuração na `PreparedSpellsList`.
- Prompt de concentração no shell v1 (v1 já tem o dele em `CombatStats` e está a caminho da remoção).
- Componentes materiais, ritual casting, listas de magia expandidas.

## Verificação final (depois da Task 10)

Gates verdes = mergear na master e pushar (preferência registrada do dono: merge + push dispara deploy sem pedir). Antes do merge, rodar `node scripts/gen-spell-mechanics.mjs --check` uma última vez.
