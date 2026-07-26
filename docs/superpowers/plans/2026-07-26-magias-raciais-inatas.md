# Magias Raciais Inatas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drow, Tiefling, Duergar e Gnomo da Floresta passam a receber as magias do traço racial na ficha — com atributo próprio, gating por nível e um uso por descanso longo que dá pra conjurar sem gastar espaço.

**Architecture:** Tabela de declaração (`racialSpells.js`) + injeção idempotente espelhando `injectFeatSpells` + política de conjuração unificada (`castPolicy.js`) que soma raça e talento + trackers derivados dessa política + botões na linha da magia. Nada de política é persistido: a magia guarda só proveniência, e o comportamento é resolvido ao vivo.

**Tech Stack:** React 19, Vitest + Testing Library (unit/integração), Playwright (e2e). Domínio puro em `src/systems/dnd5e/domain/`.

Spec: `docs/superpowers/specs/2026-07-26-magias-raciais-inatas-design.md`

**Ordem de dependência:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. As tasks 1-5 são domínio puro (rápidas); 6-7 são UI/integração.

---

### Task 1: Tabela de declaração racial

**Files:**
- Create: `src/systems/dnd5e/domain/racialSpells.js`
- Test: `src/test/dnd5e/racialSpells.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/racialSpells.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { RACIAL_SPELL_DEFS, getRacialGrants, racialTrackerId } from '../../systems/dnd5e/domain/racialSpells'

const CATALOG = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))
const byIndex = new Map(CATALOG.map(s => [s.index, s]))

const drow = (level = 5) => ({ info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [] } })

describe('RACIAL_SPELL_DEFS', () => {
  it('guard-rail: toda magia declarada existe no catálogo', () => {
    const faltando = []
    for (const [raceKey, def] of Object.entries(RACIAL_SPELL_DEFS)) {
      for (const g of def.grants) {
        if (!byIndex.has(g.spell)) faltando.push(`${raceKey}: ${g.spell}`)
      }
    }
    expect(faltando).toEqual([])
  })

  it('guard-rail: o nome declarado bate com o do catálogo', () => {
    const divergentes = []
    for (const def of Object.values(RACIAL_SPELL_DEFS)) {
      for (const g of def.grants) {
        const real = byIndex.get(g.spell)
        if (real && real.name !== g.name) divergentes.push(`${g.spell}: "${g.name}" ≠ "${real.name}"`)
      }
    }
    expect(divergentes).toEqual([])
  })
})

describe('getRacialGrants', () => {
  it('drow nv1 recebe só o truque', () => {
    const r = getRacialGrants(drow(1))
    expect(r.raceKey).toBe('elfo-negro-drow')
    expect(r.label).toBe('Magia Drow')
    expect(r.ability).toBe('cha')
    expect(r.grants.map(g => g.spell)).toEqual(['globos-de-luz'])
  })

  it('drow nv3 ganha fogo das fadas; nv5 ganha escuridão', () => {
    expect(getRacialGrants(drow(3)).grants.map(g => g.spell)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
    expect(getRacialGrants(drow(5)).grants.map(g => g.spell)).toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
  })

  it('grantIdx é a posição ABSOLUTA na declaração (não a filtrada)', () => {
    const r = getRacialGrants(drow(5))
    expect(r.grants.map(g => g.grantIdx)).toEqual([0, 1, 2])
    const nv3 = getRacialGrants(drow(3))
    expect(nv3.grants.at(-1).grantIdx).toBe(1)
  })

  it('nível TOTAL conta multiclasse', () => {
    const c = { info: { race: 'elfo', subrace: 'elfo-negro-drow', level: 2, multiclasses: [{ class: 'mago', level: 1 }] } }
    expect(getRacialGrants(c).grants.map(g => g.spell)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
  })

  it('tiefling casa pela RAÇA (não tem sub-raça)', () => {
    const r = getRacialGrants({ info: { race: 'tiefling', subrace: '', level: 5, multiclasses: [] } })
    expect(r.label).toBe('Legado Infernal')
    expect(r.grants.map(g => g.spell)).toEqual(['taumaturgia', 'repreensao-infernal', 'escuridao'])
    expect(r.grants[1].castAtLevel).toBe(2) // "como uma magia de 2º nível"
  })

  it('sub-raça vence a raça (anão comum não tem magia; duergar tem)', () => {
    expect(getRacialGrants({ info: { race: 'anao', subrace: 'anao-da-colina', level: 5, multiclasses: [] } })).toBeNull()
    const d = getRacialGrants({ info: { race: 'anao', subrace: 'duergar', level: 5, multiclasses: [] } })
    expect(d.ability).toBe('int')
    expect(d.grants.map(g => g.spell)).toEqual(['aumentarreduzir', 'invisibilidade'])
  })

  it('raça sem magia inata → null', () => {
    expect(getRacialGrants({ info: { race: 'humano', subrace: '', level: 5, multiclasses: [] } })).toBeNull()
  })
})

describe('racialTrackerId', () => {
  it('é estável e separa raças que concedem a MESMA magia', () => {
    expect(racialTrackerId('elfo-negro-drow', 'escuridao')).toBe('raca-elfo-negro-drow-escuridao')
    expect(racialTrackerId('tiefling', 'escuridao')).toBe('raca-tiefling-escuridao')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/racialSpells.test.js`
Expected: FAIL — "Failed to resolve import ... racialSpells"

- [ ] **Step 3: Implementar**

```js
// src/systems/dnd5e/domain/racialSpells.js
// @ts-check
/**
 * Magias concedidas por TRAÇO RACIAL (DADOS, não regra).
 *
 * Módulo FOLHA de propósito: não importa nada do domínio, então `rules.js` e
 * qualquer outro consumidor podem lê-lo sem risco de ciclo de import.
 *
 * `grantIdx` (posição ABSOLUTA em `grants`) é persistido na proveniência da
 * magia — REORDENAR `grants` orfana ficha salva. Acrescente no fim.
 *
 * `name` duplica o nome do catálogo de propósito: o tracker precisa de rótulo
 * legível sem ter o catálogo em mão. Um teste guarda a divergência.
 */

export const RACIAL_SPELL_DEFS = Object.freeze({
  'elfo-negro-drow': {
    label: 'Magia Drow',
    ability: 'cha',
    grants: [
      { spell: 'globos-de-luz',  name: 'Globos De Luz',  minLevel: 1, atWill: true },
      { spell: 'fogo-das-fadas', name: 'Fogo Das Fadas', minLevel: 3, freeCast: 'long', castAtLevel: 1 },
      { spell: 'escuridao',      name: 'Escuridão',      minLevel: 5, freeCast: 'long', castAtLevel: 2 },
    ],
  },
  tiefling: {
    label: 'Legado Infernal',
    ability: 'cha',
    grants: [
      { spell: 'taumaturgia',         name: 'Taumaturgia',         minLevel: 1, atWill: true },
      // PHB: "poderá conjurar repreensão infernal COMO UMA MAGIA DE 2° NÍVEL".
      { spell: 'repreensao-infernal', name: 'Repreensão Infernal', minLevel: 3, freeCast: 'long', castAtLevel: 2 },
      { spell: 'escuridao',           name: 'Escuridão',           minLevel: 5, freeCast: 'long', castAtLevel: 2 },
    ],
  },
  duergar: {
    label: 'Magia Duergar',
    ability: 'int', // é o que o texto da raça no app diz
    grants: [
      { spell: 'aumentarreduzir', name: 'Aumentar/Reduzir', minLevel: 3, freeCast: 'long', castAtLevel: 2, note: 'somente a versão Ampliar' },
      { spell: 'invisibilidade',  name: 'Invisibilidade',   minLevel: 5, freeCast: 'long', castAtLevel: 2, note: 'somente sobre si mesmo' },
    ],
  },
  'gnomo-da-floresta': {
    label: 'Ilusionista Nato',
    ability: 'int',
    grants: [
      { spell: 'ilusao-menor', name: 'Ilusão Menor', minLevel: 1, atWill: true },
    ],
  },
})

/** Nível TOTAL — traço racial não é de classe, multiclasse soma. */
export function characterTotalLevel(character) {
  const base = character?.info?.level ?? 0
  return base + (character?.info?.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
}

/** Chave da declaração: sub-raça vence a raça (anão comum ≠ duergar). */
function resolveRaceKey(character) {
  const { race, subrace } = character?.info ?? {}
  if (subrace && RACIAL_SPELL_DEFS[subrace]) return subrace
  if (race && RACIAL_SPELL_DEFS[race]) return race
  return null
}

/**
 * Concessões JÁ LIBERADAS pelo nível, com `grantIdx` absoluto.
 * `null` quando a raça não concede magia nenhuma.
 */
export function getRacialGrants(character) {
  const raceKey = resolveRaceKey(character)
  if (!raceKey) return null
  const def = RACIAL_SPELL_DEFS[raceKey]
  const level = characterTotalLevel(character)
  return {
    raceKey,
    label: def.label,
    ability: def.ability,
    grants: def.grants
      .map((g, grantIdx) => ({ ...g, grantIdx }))
      .filter(g => level >= g.minLevel),
  }
}

export function racialTrackerId(raceKey, spellIndex) {
  return `raca-${raceKey}-${spellIndex}`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/racialSpells.test.js`
Expected: PASS (11 testes)

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/racialSpells.js src/test/dnd5e/racialSpells.test.js
git commit -m "feat(magias-raciais): tabela de declaracao das magias de traco racial"
```

---

### Task 2: Injeção das magias raciais na ficha

**Files:**
- Modify: `src/systems/dnd5e/domain/racialSpells.js` (acrescenta `injectRacialSpells` no fim)
- Test: `src/test/dnd5e/racialSpells-inject.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/racialSpells-inject.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectRacialSpells } from '../../systems/dnd5e/domain/racialSpells'

const SRD = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))

const drow = (level, spells = []) => ({
  info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [] },
  spellcasting: { ability: null, spells },
})

describe('injectRacialSpells', () => {
  it('cria a magia com atributo do traço, selo e proveniência', () => {
    const c = injectRacialSpells(drow(5), SRD)
    const fogo = c.spellcasting.spells.find(s => s.index === 'fogo-das-fadas')
    expect(fogo.ability).toBe('cha')
    expect(fogo.source).toBe('race')
    expect(fogo.sourceLabel).toBe('Magia Drow')
    expect(fogo.alwaysPrepared).toBe(true)
    expect(fogo.raceCreated).toBe(true)
    expect(fogo.raceGrants).toEqual([{ raceKey: 'elfo-negro-drow', grantIdx: 1 }])
    expect(fogo.desc.length).toBeGreaterThan(50) // texto real do catálogo
  })

  it('respeita o gating por nível', () => {
    expect(injectRacialSpells(drow(1), SRD).spellcasting.spells.map(s => s.index)).toEqual(['globos-de-luz'])
    expect(injectRacialSpells(drow(5), SRD).spellcasting.spells.map(s => s.index))
      .toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
  })

  it('idempotente: segunda passada devolve o MESMO objeto', () => {
    const once = injectRacialSpells(drow(5), SRD)
    expect(injectRacialSpells(once, SRD)).toBe(once)
  })

  it('magia já conhecida pela classe: ganha proveniência, mantém ability e NÃO vira raceCreated', () => {
    const conhecida = { id: 'x1', index: 'escuridao', name: 'Escuridão', level: 2, ability: 'int', prepared: true }
    const c = injectRacialSpells(drow(5, [conhecida]), SRD)
    const escuridao = c.spellcasting.spells.find(s => s.index === 'escuridao')
    expect(escuridao.ability).toBe('int')
    expect(escuridao.id).toBe('x1')
    expect(escuridao.raceCreated).toBeUndefined()
    expect(escuridao.raceGrants).toEqual([{ raceKey: 'elfo-negro-drow', grantIdx: 2 }])
  })

  it('raça sem magia inata: devolve o MESMO objeto', () => {
    const c = { info: { race: 'humano', subrace: '', level: 5, multiclasses: [] }, spellcasting: { spells: [] } }
    expect(injectRacialSpells(c, SRD)).toBe(c)
  })

  it('sem catálogo: devolve o MESMO objeto (não apaga nada)', () => {
    const c = drow(5)
    expect(injectRacialSpells(c, [])).toBe(c)
    expect(injectRacialSpells(c, null)).toBe(c)
  })

  it('subir de nível acrescenta sem tocar no que já existe', () => {
    const nv1 = injectRacialSpells(drow(1), SRD)
    const marcado = {
      ...nv1,
      info: { ...nv1.info, level: 3 },
      spellcasting: { ...nv1.spellcasting, spells: nv1.spellcasting.spells.map(s => ({ ...s, usadoPeloJogador: true })) },
    }
    const nv3 = injectRacialSpells(marcado, SRD)
    expect(nv3.spellcasting.spells[0].usadoPeloJogador).toBe(true)
    expect(nv3.spellcasting.spells.map(s => s.index)).toEqual(['globos-de-luz', 'fogo-das-fadas'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/racialSpells-inject.test.js`
Expected: FAIL — "injectRacialSpells is not a function"

- [ ] **Step 3: Implementar (acrescentar no fim de `racialSpells.js`)**

```js
import { mapSrdSpellToCharacter } from './subclassSpells'

/**
 * Injeta as magias do traço racial em `spellcasting.spells`.
 *
 * MERGE idempotente por `index`, espelhando `injectFeatSpells`:
 *  - `ability` e `raceCreated` só vão na magia que a RAÇA CRIA. Se o Bruxo
 *    drow já conhecia Escuridão pela classe, o atributo dele continua sendo o
 *    da classe e os espaços continuam valendo (ver `castPolicy`);
 *  - `raceGrants` ACUMULA a referência, nunca sobrescreve;
 *  - nada muda → devolve o MESMO objeto `character`. A ficha abre sem se
 *    marcar como alterada (senão o autosave dispararia a cada abertura).
 */
export function injectRacialSpells(character, srdSpells) {
  if (!character || !srdSpells?.length) return character
  const info = getRacialGrants(character)
  if (!info || info.grants.length === 0) return character

  const spells = character.spellcasting?.spells ?? []
  const order = [...new Set(spells.map(s => s.index))]
  const working = new Map(spells.map(s => [s.index, s]))
  let changed = false

  for (const g of info.grants) {
    const cur = working.get(g.spell)

    if (cur) {
      const refs = cur.raceGrants ?? []
      if (refs.some(r => r.raceKey === info.raceKey && r.grantIdx === g.grantIdx)) continue
      working.set(g.spell, {
        ...cur,
        raceGrants: [...refs, { raceKey: info.raceKey, grantIdx: g.grantIdx }],
      })
      changed = true
      continue
    }

    const srd = srdSpells.find(s => s.index === g.spell)
    if (!srd) continue
    working.set(g.spell, {
      ...mapSrdSpellToCharacter(srd, { source: 'race', alwaysPrepared: true, label: info.label }),
      raceGrants: [{ raceKey: info.raceKey, grantIdx: g.grantIdx }],
      raceCreated: true,
      ability: info.ability,
    })
    order.push(g.spell)
    changed = true
  }

  if (!changed) return character
  return {
    ...character,
    spellcasting: { ...character.spellcasting, spells: order.map(idx => working.get(idx)) },
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/racialSpells-inject.test.js`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/racialSpells.js src/test/dnd5e/racialSpells-inject.test.js
git commit -m "feat(magias-raciais): injecao idempotente das magias de traco"
```

---

### Task 3: `featIndex` na entrada de freeCast do talento

Motivo: o tracker precisa de rótulo ("Passo Nebuloso (Talento: Tocado pelas Fadas)") e a UI precisa saber de onde o uso veio. Hoje a entrada só tem `recharge` e `trackerId`.

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js:214-216`
- Modify: `src/test/dnd5e/featSpells.test.js:244,251,257`

- [ ] **Step 1: Ajustar os testes existentes (viram vermelhos)**

Em `src/test/dnd5e/featSpells.test.js`, trocar as três expectativas:

```js
// linha ~244
      freeCast: [{ recharge: 'long', trackerId: 'feat-tocado-pelas-fadas-passo-nebuloso', featIndex: 'tocado-pelas-fadas' }],
// linha ~251
    expect(p.freeCast).toEqual([{ recharge: 'short', trackerId: 'feat-teleporte-das-fadas-passo-nebuloso', featIndex: 'teleporte-das-fadas' }])
// linha ~257
    expect(p.freeCast).toEqual([{ recharge: 'long', trackerId: 'feat-iniciado-em-magia-escudo-arcano', featIndex: 'iniciado-em-magia' }])
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: FAIL — 3 testes, "expected ... to deeply equal ..." (falta `featIndex`)

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/domain/featSpells.js`, na `policyForGrant`:

```js
  const freeCast = grant.freeCast
    ? {
        recharge: grant.freeCast,
        trackerId: `feat-${ref.featIndex}-${spell.index}`,
        featIndex: ref.featIndex, // rótulo do tracker + origem do uso na UI
      }
    : null
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: PASS (todos)

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/test/dnd5e/featSpells.test.js
git commit -m "refactor(feat-spells): freeCast carrega featIndex (rotulo do tracker)"
```

---

### Task 4: Política de conjuração unificada + trackers

**Files:**
- Create: `src/systems/dnd5e/domain/castPolicy.js`
- Test: `src/test/dnd5e/castPolicy.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/castPolicy.test.js
import { describe, it, expect } from 'vitest'
import { getSpellCastPolicy, specialCastingUses } from '../../systems/dnd5e/domain/castPolicy'

const drow = (level = 5, spells = []) => ({
  info: { race: 'elfo', subrace: 'elfo-negro-drow', level, multiclasses: [], feats: [] },
  spellcasting: { spells },
})

const racial = (index, grantIdx, over = {}) => ({
  index, name: index, level: 2, raceCreated: true,
  raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx }],
  ...over,
})

describe('getSpellCastPolicy', () => {
  it('magia sem proveniência nenhuma → null (comportamento padrão)', () => {
    expect(getSpellCastPolicy({ index: 'bola-de-fogo', level: 3 }, drow())).toBeNull()
  })

  it('magia criada pela raça: sem espaços, um uso grátis por descanso longo', () => {
    const p = getSpellCastPolicy(racial('fogo-das-fadas', 1, { level: 1 }), drow())
    expect(p.slots).toBe(false)
    expect(p.atWill).toBe(false)
    expect(p.freeCast).toEqual([{
      recharge: 'long', trackerId: 'raca-elfo-negro-drow-fogo-das-fadas',
      source: 'raca', label: 'Magia Drow', castAtLevel: 1,
    }])
  })

  it('Repreensão Infernal do tiefling conjura como 2º nível', () => {
    const tief = { info: { race: 'tiefling', subrace: '', level: 5, multiclasses: [], feats: [] }, spellcasting: { spells: [] } }
    const spell = { index: 'repreensao-infernal', name: 'Repreensão Infernal', level: 1, raceCreated: true, raceGrants: [{ raceKey: 'tiefling', grantIdx: 1 }] }
    expect(getSpellCastPolicy(spell, tief).freeCast[0].castAtLevel).toBe(2)
  })

  it('truque racial: à vontade, sem tracker', () => {
    const p = getSpellCastPolicy(racial('globos-de-luz', 0, { level: 0 }), drow())
    expect(p.atWill).toBe(true)
    expect(p.freeCast).toEqual([])
  })

  it('magia que a classe também dá (raceCreated ausente): espaços continuam valendo', () => {
    const p = getSpellCastPolicy(racial('escuridao', 2, { raceCreated: undefined }), drow())
    expect(p.slots).toBe(true)
    expect(p.freeCast).toHaveLength(1)
  })

  it('une raça e talento: dois usos independentes da mesma magia', () => {
    const char = {
      info: {
        race: 'elfo', subrace: 'elfo-negro-drow', level: 5, multiclasses: [],
        feats: [{ index: 'tocado-pelas-sombras', name: 'Tocado pelas Sombras' }],
      },
      spellcasting: { spells: [] },
    }
    const spell = {
      index: 'escuridao', name: 'Escuridão', level: 2, raceCreated: true,
      raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 2 }],
      featGrants: [{ featIndex: 'tocado-pelas-sombras', featGrant: 1 }],
    }
    const p = getSpellCastPolicy(spell, char)
    expect(p.freeCast).toHaveLength(2)
    expect(p.freeCast.map(f => f.source).sort()).toEqual(['feat', 'raca'])
    expect(p.slots).toBe(true) // o talento permite espaços; a raça não tira
  })

  it('grantIdx órfão é ignorado sem derrubar a ficha', () => {
    const p = getSpellCastPolicy(racial('escuridao', 99), drow())
    expect(p).toBeNull()
  })
})

describe('specialCastingUses', () => {
  it('um tracker por concessão com uso grátis, nenhum pra truque', () => {
    const c = drow(5, [
      racial('globos-de-luz', 0, { name: 'Globos De Luz', level: 0 }),
      racial('fogo-das-fadas', 1, { name: 'Fogo Das Fadas', level: 1 }),
      racial('escuridao', 2, { name: 'Escuridão' }),
    ])
    expect(specialCastingUses(c)).toEqual([
      { id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)', max: 1, used: 0, recharge: 'long', source: 'raca' },
      { id: 'raca-elfo-negro-drow-escuridao',      name: 'Escuridão (Magia Drow)',      max: 1, used: 0, recharge: 'long', source: 'raca' },
    ])
  })

  it('magia de talento também gera tracker, com o nome do talento', () => {
    const c = {
      info: { race: 'humano', subrace: '', level: 4, multiclasses: [], feats: [{ index: 'telepatico', name: 'Telepático' }] },
      spellcasting: { spells: [{ index: 'detectar-pensamentos', name: 'Detectar Pensamentos', level: 2, featGrants: [{ featIndex: 'telepatico', featGrant: 0 }] }] },
    }
    expect(specialCastingUses(c)).toEqual([{
      id: 'feat-telepatico-detectar-pensamentos',
      name: 'Detectar Pensamentos (Talento: Telepático)',
      max: 1, used: 0, recharge: 'long', source: 'feat',
    }])
  })

  it('ficha sem magia especial nenhuma → lista vazia', () => {
    expect(specialCastingUses({ info: { race: 'humano', level: 1, multiclasses: [], feats: [] }, spellcasting: { spells: [] } })).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/castPolicy.test.js`
Expected: FAIL — "Failed to resolve import ... castPolicy"

- [ ] **Step 3: Implementar**

```js
// src/systems/dnd5e/domain/castPolicy.js
// @ts-check
/**
 * Política de conjuração ESPECIAL de uma magia — o que dá pra gastar pra
 * conjurá-la — somando as duas fontes que fogem do padrão: talento
 * (`featSpells`) e traço racial (`racialSpells`).
 *
 * Nada disso é persistido na magia: a ficha guarda só PROVENIÊNCIA
 * (`featGrants`/`raceGrants`) e a política é resolvida ao vivo. Mudar a
 * declaração muda o comportamento de ficha salva sem migração.
 */
import { getCastPolicy } from './featSpells'
import { RACIAL_SPELL_DEFS, getRacialGrants, racialTrackerId } from './racialSpells'

/** Uma política por concessão RACIAL da magia. */
function racialParts(spell) {
  const refs = spell?.raceGrants ?? []
  const out = []
  for (const ref of refs) {
    const def = RACIAL_SPELL_DEFS[ref.raceKey]
    const grant = def?.grants?.[ref.grantIdx]
    if (!grant) {
      // `grantIdx` é persistido: editar a declaração pode orfanar ficha salva.
      // Avisa em DEV — throw derrubaria a ficha (isto roda por linha, a cada render).
      if (import.meta.env?.DEV) {
        console.warn(`getSpellCastPolicy: grant racial órfão (${ref.raceKey}#${ref.grantIdx})`)
      }
      continue
    }
    // A raça só TIRA os espaços quando a magia existe apenas por causa dela.
    const slots = !spell.raceCreated
    if (grant.atWill || spell.level === 0) {
      out.push({ slots, atWill: true, ritualOnly: false, freeCast: [] })
      continue
    }
    out.push({
      slots,
      atWill: false,
      ritualOnly: false,
      freeCast: grant.freeCast
        ? [{
            recharge: grant.freeCast,
            trackerId: racialTrackerId(ref.raceKey, spell.index),
            source: 'raca',
            label: def.label,
            castAtLevel: grant.castAtLevel ?? spell.level,
          }]
        : [],
    })
  }
  return out
}

/** Política do talento, normalizada pro mesmo formato (rótulo + origem). */
function featPart(spell, character) {
  const p = getCastPolicy(spell, character)
  if (!p) return null
  const featName = idx => (character?.info?.feats ?? []).find(f => f.index === idx)?.name ?? idx
  return {
    slots: p.slots,
    atWill: p.atWill,
    ritualOnly: p.ritualOnly,
    freeCast: (p.freeCast ?? []).map(fc => ({
      recharge: fc.recharge,
      trackerId: fc.trackerId,
      source: 'feat',
      label: `Talento: ${featName(fc.featIndex)}`,
      castAtLevel: spell.level,
    })),
  }
}

/**
 * União das políticas. `null` quando a magia não tem proveniência especial —
 * o caller usa o comportamento padrão (espaços da classe).
 */
export function getSpellCastPolicy(spell, character) {
  const parts = [featPart(spell, character), ...racialParts(spell)].filter(Boolean)
  if (parts.length === 0) return null
  return {
    slots:      parts.some(p => p.slots),
    atWill:     parts.some(p => p.atWill),
    ritualOnly: parts.every(p => p.ritualOnly),
    freeCast:   parts.flatMap(p => p.freeCast),
  }
}

/**
 * Trackers de conjuração especial (1×/descanso), derivados das magias que a
 * ficha JÁ tem — por isso o rótulo sai do nome da própria magia e o mesmo
 * laço serve talento e raça.
 *
 * Mora fora de `defaultClassFeatureUses` de propósito: `rules.js` é importado
 * por `subclassSpells`, que é importado por `featSpells` — importar a política
 * lá dentro fecharia um ciclo. Quem compõe é a `CharacterSheet`.
 */
export function specialCastingUses(character) {
  const out = []
  for (const spell of character?.spellcasting?.spells ?? []) {
    const policy = getSpellCastPolicy(spell, character)
    for (const fc of policy?.freeCast ?? []) {
      out.push({
        id: fc.trackerId,
        name: `${spell.name} (${fc.label})`,
        max: 1,
        used: 0,
        recharge: fc.recharge,
        source: fc.source,
      })
    }
  }
  return out
}

export { getRacialGrants }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/castPolicy.test.js`
Expected: PASS (10 testes)

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/castPolicy.js src/test/dnd5e/castPolicy.test.js
git commit -m "feat(magias-raciais): politica de conjuracao unificada raca+talento"
```

---

### Task 5: `syncClassFeatureUses` preserva trackers que não conhece

Sem isso, subir de nível apagaria os trackers raciais/de talento (e o `used` deles), porque `syncClassFeatureUses` reescreve a lista só com os defaults de classe.

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js:939-946`
- Test: `src/test/dnd5e/rules-feature-uses.test.js` (criar se não existir; se existir, acrescentar o caso)

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/rules-feature-uses.test.js
import { describe, it, expect } from 'vitest'
import { syncClassFeatureUses } from '../../systems/dnd5e/domain/rules'

describe('syncClassFeatureUses', () => {
  it('preserva tracker persistido que os defaults de classe não conhecem', () => {
    const c = {
      info: { class: 'guerreiro', level: 5, multiclasses: [], chosenFeatures: {} },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
      combat: {
        classFeatureUses: [
          { id: 'guerreiro-action-surge', name: 'Surto de Ação', max: 1, used: 1, recharge: 'short', source: 'guerreiro' },
          { id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)', max: 1, used: 1, recharge: 'long', source: 'raca' },
        ],
      },
    }
    const next = syncClassFeatureUses(c).combat.classFeatureUses
    const racial = next.find(u => u.id === 'raca-elfo-negro-drow-fogo-das-fadas')
    expect(racial).toBeTruthy()
    expect(racial.used).toBe(1)
    expect(next.find(u => u.id === 'guerreiro-action-surge').used).toBe(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/rules-feature-uses.test.js`
Expected: FAIL — "expected undefined to be truthy" (o tracker racial some)

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/domain/rules.js`, `syncClassFeatureUses`:

```js
export function syncClassFeatureUses(character) {
  const persisted = character.combat?.classFeatureUses ?? []
  const next = defaultClassFeatureUses(character)
  const merged = mergeFeatureUses(persisted, next)
  // Trackers que os defaults de classe NÃO conhecem (subclasse com
  // `classChoices`, conjuração especial de raça/talento) são preservados —
  // mesma regra que `resolveFeatureUseList` já aplica no hook. Sem isto,
  // subir de nível apagaria o uso gasto do traço racial.
  const known = new Set(merged.map(u => u.id))
  const extras = persisted.filter(u => !known.has(u.id))
  return {
    ...character,
    combat: { ...character.combat, classFeatureUses: [...merged, ...extras] },
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/rules-feature-uses.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte de regras pra garantir que nada quebrou**

Run: `npx vitest run src/test/dnd5e src/test/rules.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/rules-feature-uses.test.js
git commit -m "fix(trackers): sync de nivel preserva trackers fora dos defaults de classe"
```

---

### Task 6: Botões de conjuração especial na linha da magia

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/Spells.jsx` (imports, props do componente, `handleCast`, chamada do `SpellRow`, corpo do `SpellRow`)
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx:302-320` (passa as duas props novas)
- Modify: `src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx:121-139` (idem)
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx:231-234` (compõe os trackers especiais)
- Test: `src/test/integration/racial-spells.test.jsx`

- [ ] **Step 1: Escrever o teste de integração que falha**

```jsx
// src/test/integration/racial-spells.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { mockSrdFetch } from './helpers'

const GUERREIRO = { index: 'guerreiro', name: 'Guerreiro', hit_die: 10 }

// Guerreiro drow nv5: NENHUM espaço de magia — só os usos do traço racial.
function makeDrow(spells) {
  return {
    info: { name: 'Zaknafein', class: 'guerreiro', level: 5, race: 'elfo', subrace: 'elfo-negro-drow', multiclasses: [], feats: [] },
    attributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
    combat: {
      maxHp: 44, currentHp: 44, armorClass: 16, attacks: [], classFeatureUses: [],
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability: null, usedSlots: {}, spells },
  }
}

const FOGO = {
  id: 'r1', index: 'fogo-das-fadas', name: 'Fogo Das Fadas', level: 1, school: 'Evocação',
  ability: 'cha', alwaysPrepared: true, prepared: true, source: 'race', sourceLabel: 'Magia Drow',
  raceCreated: true, raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 1 }],
}

function Harness({ initial }) {
  const [character, setCharacter] = useState(initial)
  const featureUses = [
    { id: 'raca-elfo-negro-drow-fogo-das-fadas', name: 'Fogo Das Fadas (Magia Drow)', max: 1, used: 0, recharge: 'long', source: 'raca' },
  ].map(u => character.combat.classFeatureUses.find(p => p.id === u.id) ?? u)
  return (
    <SrdProvider>
      <DiceRollerProvider>
        <Spells
          character={character}
          attributes={character.attributes}
          level={5}
          profBonus={3}
          classData={GUERREIRO}
          featureUses={featureUses}
          onSpendFeatureUse={(id) => setCharacter(c => ({
            ...c,
            combat: {
              ...c.combat,
              classFeatureUses: featureUses.map(u => u.id === id ? { ...u, used: Math.min(u.max, u.used + 1) } : u),
            },
          }))}
          onUpdateSpellcasting={() => {}}
          onAddSpell={() => {}}
          onRemoveSpell={() => {}}
          onTogglePrepared={() => {}}
          onToggleSlot={() => {}}
          onSetConcentration={() => {}}
        />
      </DiceRollerProvider>
    </SrdProvider>
  )
}

describe('Magias raciais na aba Magias', () => {
  beforeEach(() => { mockSrdFetch() })
  afterEach(() => { vi.restoreAllMocks() })

  it('Guerreiro drow (sem espaço nenhum) consegue conjurar pelo uso do traço', async () => {
    const user = userEvent.setup()
    render(<Harness initial={makeDrow([FOGO])} />)
    const castBtn = await screen.findByTitle(/Conjurar/i)
    expect(castBtn).toBeEnabled()
    await user.click(castBtn)

    const freeBtn = await screen.findByRole('button', { name: /1×\/desc\. longo \(1\)/i })
    expect(freeBtn).toBeEnabled()
    // Sem espaços: nenhum botão "Nv N"
    expect(screen.queryByRole('button', { name: /^Nv \d/ })).toBeNull()

    await user.click(freeBtn)
    await waitFor(() => expect(screen.getByTitle(/Conjurar/i)).toBeInTheDocument())

    // Uso gasto: reabrindo, o botão aparece zerado e desabilitado.
    await user.click(screen.getByTitle(/Conjurar/i))
    const gasto = await screen.findByRole('button', { name: /1×\/desc\. longo \(0\)/i })
    expect(gasto).toBeDisabled()
  })

  it('truque racial continua rolando pelo botão-raio (sem tracker)', async () => {
    const truque = {
      id: 'r0', index: 'globos-de-luz', name: 'Globos De Luz', level: 0, ability: 'cha',
      alwaysPrepared: true, source: 'race', sourceLabel: 'Magia Drow', raceCreated: true,
      raceGrants: [{ raceKey: 'elfo-negro-drow', grantIdx: 0 }],
    }
    render(<Harness initial={makeDrow([truque])} />)
    await waitFor(() => expect(screen.getByText('Globos De Luz')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /1×\/desc/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/integration/racial-spells.test.jsx`
Expected: FAIL — `castBtn` desabilitado / "Unable to find role button 1×/desc. longo"

- [ ] **Step 3: Implementar em `Spells.jsx`**

3a. Import (junto dos outros de domínio):

```js
import { getSpellCastPolicy } from '../../domain/castPolicy'
```

3b. Assinatura do componente — acrescentar as duas props no fim da lista:

```js
export function Spells({ character, attributes, level, profBonus: profBonusProp, classData, onUpdateSpellcasting, onAddSpell, onRemoveSpell, onTogglePrepared, onToggleSlot, onSetConcentration, onSpendPactSlot, onRegainPactSlot, onApplyHealing, onAddActiveEffect, focusSpellId, onClearFocusSpell, featureUses = [], onSpendFeatureUse }) {
```

3c. `handleCast` — gastar o uso grátis e conjurar no nível declarado:

```js
  function handleCast(spell, { slotLevel = null, pact = false, freeUse = null, event = null } = {}) {
    if (freeUse) {
      onSpendFeatureUse?.(freeUse.trackerId)
    } else if (pact) {
      if (!pactSlots) return null
      onSpendPactSlot?.(pactSlots.qty)
    } else if (slotLevel != null) {
      onToggleSlot?.(slotLevel, (usedSlots[slotLevel] || 0) + 1)
    }
```

e, na montagem do plano, o nível efetivo:

```js
    const plan = spellRollPlan(spell, mech, {
      slotLevel: freeUse ? freeUse.castAtLevel : (pact ? pactSlots.slotLevel : slotLevel),
      characterLevel: totalLevel,
```

3d. Na chamada do `SpellRow` (dentro do `.map`), acrescentar as duas props:

```js
                castPolicy={getSpellCastPolicy(spell, character)}
                freeUses={featureUses}
```

3e. No `SpellRow`, assinatura + cálculo:

```js
function SpellRow({ spell, onDetail, onRemove, isPrepared = true, showPreparedToggle, onTogglePrepared, isConcentrating, canConcentrate, onToggleConcentration, slotLevels = [], slotMax, usedSlots = {}, canCast = true, hasMechanics, onCast, pactOption, onApplyHealing, onApplyEffect, abilityOverride = null, castPolicy = null, freeUses = [] }) {
```

```js
  // Espaços disponíveis para esta magia: nível ≥ nível da magia E sobrando ≥ 1.
  // `castPolicy.slots === false` (magia que SÓ existe pelo traço/talento)
  // esconde os espaços — o traço não dá acesso a eles.
  const slotsAllowed = castPolicy ? castPolicy.slots : true
  const availableSlots = spell.level > 0 && canCast && slotsAllowed
    ? slotLevels.filter(sl => sl >= spell.level && ((slotMax?.(sl) ?? 0) - (usedSlots[sl] || 0)) > 0)
    : []
  // Usos grátis (1×/descanso) desta magia, com o que sobrou de cada tracker.
  const freeOptions = (castPolicy?.freeCast ?? []).map(fc => {
    const tracker = freeUses.find(u => u.id === fc.trackerId)
    return { ...fc, remaining: tracker ? Math.max(0, (tracker.max ?? 1) - (tracker.used ?? 0)) : 0 }
  })
  const hasFreeOption = spell.level > 0 && canCast && freeOptions.length > 0
```

3f. Botão de abrir o picker (`spell.level > 0`) — passa a considerar o uso grátis:

```js
      {spell.level > 0 && (
        <button
          onClick={() => (availableSlots.length > 0 || pactAvailable || hasFreeOption) && setCastOpen(v => !v)}
          disabled={!canCast || (availableSlots.length === 0 && !pactAvailable && !hasFreeOption)}
          title={
            !canCast
              ? 'Magia não está preparada'
              : (availableSlots.length === 0 && !pactAvailable && !hasFreeOption)
                ? 'Sem espaços disponíveis'
```

(o resto do `title` fica como está)

3g. Painel do picker — condição de abertura e os botões novos:

```js
    {castOpen && (availableSlots.length > 0 || pactAvailable || hasFreeOption) && (
      <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-gray-700/60">
        <span className="text-xs text-gray-500 self-center mr-1">Conjurar em:</span>
        {freeOptions.map(fc => (
          <button
            key={fc.trackerId}
            onClick={(e) => fc.remaining > 0 && castAt(null, e, { freeUse: fc })}
            disabled={fc.remaining === 0}
            title={fc.remaining > 0
              ? `${fc.label} — uso grátis, recupera em descanso ${fc.recharge === 'short' ? 'curto' : 'longo'}`
              : `${fc.label} — uso já gasto, volta no descanso ${fc.recharge === 'short' ? 'curto' : 'longo'}`}
            className={`text-xs px-2 py-0.5 rounded border font-mono transition-colors ${
              fc.remaining > 0
                ? 'border-emerald-600 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40'
                : 'border-gray-700 bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
          >
            1×/desc. {fc.recharge === 'short' ? 'curto' : 'longo'} ({fc.remaining})
          </button>
        ))}
        {availableSlots.map(sl => {
```

(o `.map` dos espaços e o resto do painel ficam como estão)

3h. `castAt` — repassar o uso grátis:

```js
  function castAt(slotLevel, e, { pact = false, freeUse = null } = {}) {
    const result = onCast?.({ slotLevel: pact || freeUse ? null : slotLevel, pact, freeUse, event: e })
    setCastOpen(false)
    setCastedAt(freeUse ? freeUse.castAtLevel : slotLevel)
```

- [ ] **Step 4: Passar as props nos dois layouts**

Em `SheetContent.jsx`, dentro do `<Spells ...>` (linha ~302), acrescentar:

```jsx
          featureUses={featureUses}
          onSpendFeatureUse={(id) => spendFeatureUse(id, featureUses)}
```

Em `v2/MainBox.jsx`, dentro do `<Spells ...>` (linha ~121), acrescentar as MESMAS duas linhas. Se `featureUses`/`spendFeatureUse` não estiverem no escopo do MainBox, pegue do contexto da ficha junto com os outros (`const { featureUses, updaters: { spendFeatureUse } } = useSheet()` — siga o padrão que o arquivo já usa pros outros handlers).

- [ ] **Step 5: Compor os trackers especiais na CharacterSheet**

Em `CharacterSheet.jsx`:

```js
import { specialCastingUses } from '../../domain/castPolicy'
```

```js
  // featureUses é derivado de character — memo para evitar recalcular nos filhos.
  // `specialCastingUses` acrescenta os usos 1×/descanso de magia racial e de
  // talento; mora fora de `defaultClassFeatureUses` pra não fechar ciclo de
  // import (rules → subclassSpells → featSpells → rules).
  const featureUses = useMemo(
    () => mergeFeatureUses(character.combat?.classFeatureUses ?? [], [
      ...defaultClassFeatureUses(character, classChoices),
      ...specialCastingUses(character),
    ]),
    [character, classChoices],
  )
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/test/integration/racial-spells.test.jsx`
Expected: PASS (2 testes)

- [ ] **Step 7: Rodar as suítes de magias que já existiam (nada pode quebrar)**

Run: `npx vitest run src/test/integration src/test/dnd5e`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/Spells.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx src/systems/dnd5e/components/CharacterSheet/v2/MainBox.jsx src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx src/test/integration/racial-spells.test.jsx
git commit -m "feat(magias-raciais): botao de conjuracao 1x/descanso na linha da magia"
```

---

### Task 7: Injeção na criação e retrofit ao abrir a ficha

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js:301-313`
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx` (efeito de retrofit)
- Test: `src/test/dnd5e/racialSpells-integration.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/racialSpells-integration.test.js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildCharacterWithSubclassSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const SRD = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))
const guerreiro = { index: 'guerreiro', hit_die: 10 }

describe('build do wizard injeta magia racial', () => {
  it('guerreiro drow nv5 nasce com as três magias do traço', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Zaknafein', class: 'guerreiro', level: 5,
      race: 'elfo', subrace: 'elfo-negro-drow',
      baseAttributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
      savingThrows: ['str', 'con'],
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, SRD)
    const raciais = c.spellcasting.spells.filter(s => s.source === 'race')
    expect(raciais.map(s => s.index)).toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
    expect(raciais.every(s => s.ability === 'cha')).toBe(true)
    expect(raciais.every(s => s.sourceLabel === 'Magia Drow')).toBe(true)
  })

  it('humano não ganha nada', () => {
    const draft = {
      ...INITIAL_DRAFT_V2, name: 'Bob', class: 'guerreiro', level: 5, race: 'humano',
      baseAttributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 }, savingThrows: ['str', 'con'],
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, SRD)
    expect(c.spellcasting.spells.filter(s => s.source === 'race')).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/racialSpells-integration.test.js`
Expected: FAIL — array vazio no primeiro teste

- [ ] **Step 3: Implementar no build**

Em `build-character.js`, no import e no wrapper:

```js
import { injectRacialSpells } from '../../../domain/racialSpells'
```

```js
export function buildCharacterWithSubclassSpells(draft, classData, classEquipment, srdSpells) {
  const base = buildCharacter(draft, classData, classEquipment)
  if (!srdSpells || srdSpells.length === 0) return base
  const withSpells = injectRacialSpells(
    injectFeatSpells(injectSubclassSpellsAtBuild(base, srdSpells), srdSpells),
    srdSpells,
  )
  // Truque racial e familiar do pacto nascem como objetos mínimos aqui dentro
  // (o wizard não tem o catálogo na mão) — completa antes de gravar.
  return {
    ...withSpells,
    spellcasting: {
      ...withSpells.spellcasting,
      spells: resolveSpellDetails(withSpells.spellcasting?.spells ?? [], srdSpells),
    },
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/racialSpells-integration.test.js`
Expected: PASS (2 testes)

- [ ] **Step 5: Retrofit ao abrir a ficha**

Em `CharacterSheet.jsx`: pegar o catálogo do provider e aplicar a injeção quando ela mudar algo. Como `injectRacialSpells` devolve o MESMO objeto quando não há mudança, o efeito não entra em laço.

```js
  const { races, classes, backgrounds, classChoices, spells: srdSpells } = useSrd()
```

```js
  // Retrofit das magias raciais: ficha criada antes do traço existir (ou que
  // subiu de nível) ganha as magias ao abrir. `injectRacialSpells` é
  // idempotente e devolve o MESMO objeto quando nada muda — sem isso o
  // `setCharacter` reentraria a cada render e o autosave dispararia à toa.
  useEffect(() => {
    if (!srdSpells?.length) return
    setCharacter(prev => injectRacialSpells(prev, srdSpells))
  }, [srdSpells, setCharacter, character.info?.race, character.info?.subrace, character.info?.level])
```

Coloque o efeito logo depois da declaração de `featureUses` (o `character`/`setCharacter` já estão no escopo). Se o `useEffect` não estiver importado no arquivo, acrescente no import do React.

- [ ] **Step 6: Verificar no browser que a ficha salva ganha as magias**

Run: `npx playwright test spell-cast.spec.js`
Expected: PASS (nenhuma regressão no fluxo de conjuração)

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx src/test/dnd5e/racialSpells-integration.test.js
git commit -m "feat(magias-raciais): injecao na criacao e retrofit ao abrir a ficha"
```

---

### Task 8: E2E do fluxo completo + fechamento

**Files:**
- Create: `e2e-pw/racial-spells.spec.js`

- [ ] **Step 1: Escrever o e2e que falha**

```js
// e2e-pw/racial-spells.spec.js
import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Guerreiro drow nv5 salvo SEM as magias do traço: ao abrir a ficha elas
// aparecem, e a de nível conjura pelo uso 1×/descanso (ele não tem espaço).
// ATENÇÃO: short_id não aceita 0/O/1/I/L (SHORT_ID_REGEX em utils/storage.js).
test('drow ganha as magias do traço e conjura pelo uso do descanso', async ({ context, page }) => {
  const id = '55555555-5555-4555-8555-555555555555'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Zaknafein', {
      shortId: 'DROWMAGESB',
      info: { name: 'Zaknafein', race: 'elfo', subrace: 'elfo-negro-drow', class: 'guerreiro', level: 5, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'soldado' },
      attributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
      spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    })],
  })
  await page.goto('/c/DROWMAGESB')
  await expect(page.getByText('Zaknafein').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await expect(page.getByText('Fogo Das Fadas').first()).toBeVisible()
  await expect(page.getByText('Globos De Luz').first()).toBeVisible()

  // Sem espaço nenhum, o botão de conjurar continua clicável pelo uso do traço.
  await page.getByTitle(/Conjurar/i).first().click()
  await page.getByRole('button', { name: /1×\/desc\. longo \(1\)/i }).click()
  await page.getByTitle(/Conjurar/i).first().click()
  await expect(page.getByRole('button', { name: /1×\/desc\. longo \(0\)/i })).toBeDisabled()
})
```

- [ ] **Step 2: Rodar**

Run: `npx playwright test racial-spells.spec.js`
Expected: PASS — as tasks 1-7 já entregaram o caminho inteiro. Se falhar aqui,
o bug é real: leia o `error-context.md` que o Playwright grava em
`test-results/` antes de mexer no teste.

- [ ] **Step 3: Provar que o teste tem dente**

```bash
git stash push src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx
npx playwright test racial-spells.spec.js
git stash pop
```
Expected: FAIL sem o retrofit ("Fogo Das Fadas" não aparece), PASS com ele.

- [ ] **Step 4: Suítes completas**

Run: `npx vitest run`
Expected: PASS (todos os arquivos)

Run: `npx playwright test`
Expected: PASS (todos os specs)

Run: `npm run lint:gate`
Expected: "✅ Lint OK" com contagem ≤ baseline

- [ ] **Step 5: Commit + merge + deploy**

```bash
git add e2e-pw/racial-spells.spec.js
git commit -m "test(magias-raciais): e2e do traco racial da criacao ao uso"
git switch master
git merge --ff-only feat/magias-raciais
git push origin master
```

Nenhum JSON de `public/srd-data` mudou, então **não** precisa bumpar o `srd-data-vN` do service worker.

---

## Notas de revisão do plano

- **Cobertura da spec:** declaração (Task 1), injeção + retrofit (Tasks 2 e 7), política unificada (Task 4), trackers (Tasks 4 e 5), UI (Task 6), testes de domínio/integração/e2e (Tasks 1-8). O `castAtLevel` da Repreensão Infernal é coberto em Task 4 (unitário) e usado em Task 6 (`handleCast`).
- **Ciclo de import:** `racialSpells.js` importa só `subclassSpells` (pro mapper); `rules.js` NÃO importa nem `castPolicy` nem `featSpells` — por isso os trackers especiais são compostos na `CharacterSheet` e a Task 5 protege o que o sync de nível não conhece.
- **Nomes usados de forma consistente:** `getRacialGrants`, `injectRacialSpells`, `racialTrackerId`, `getSpellCastPolicy`, `specialCastingUses`, props `castPolicy`/`freeUses`/`featureUses`/`onSpendFeatureUse`, campos `raceGrants`/`raceCreated`.
