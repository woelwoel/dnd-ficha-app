# Magias de Talento — Plano 1: Motor + atributo por magia + injeção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor de domínio `featSpells.js` (11 talentos), atributo de conjuração por magia com cascata de CD/ataque, e injeção das magias concedidas na criação e no level-up.

**Architecture:** Módulo de domínio espelhando `subclassSpells.js`: declarações estáticas + predicados puros, injeção com merge idempotente no build (`buildCharacterWithSubclassSpells`) e no level-up (`enrichWithFeatSpells` → `bonusSpells`/`featSpellMerges` consumidos por `applyLevelUp`). A UI só muda no cálculo de CD/ataque por linha em `Spells.jsx` (compartilhado por v1 e v2).

**Tech Stack:** React + Vite, Vitest, dados SRD em `public/srd-data/*.json` (nenhum JSON muda — **sem bump de SW cache**).

**Spec:** `docs/superpowers/specs/2026-07-15-magias-de-talento-design.md`

**Convenções do repo:** commits em pt-BR prefixados `@ ` no branch; todo commit termina com o trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; merge na master + push ao final (deploy automático).

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| Create `src/systems/dnd5e/domain/featSpells.js` | Motor: declarações dos 11 talentos, predicados, resolução de atributo, política de conjuração, injeção (build) e enriquecimento (level-up) |
| Create `src/test/dnd5e/featSpells.test.js` | Testes do motor (declarações, opções, política) |
| Create `src/test/dnd5e/feat-spells-injection.test.js` | Testes de injeção no build + mapeamento do draft |
| Create `src/test/dnd5e/feat-spells-levelup.test.js` | Testes de `enrichWithFeatSpells` + `applyLevelUp` |
| Create `src/test/dnd5e/feat-spell-math.test.js` | Testes de `getSpellMathForSpell` |
| Modify `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js` | Mapeia `featSpellChoices` → `info.feats[].spellChoices`; chain de injeção no wrapper |
| Modify `src/systems/dnd5e/domain/rules.js` (applyLevelUp) | Persiste `spellChoices` no feat; aplica `featSpellMerges` |
| Modify `src/systems/dnd5e/components/CharacterSheet/LevelProgression.jsx` | Chain `enrichWithFeatSpells` no `enrichedApplyLevelUp` |
| Modify `src/systems/dnd5e/utils/spellcasting.js` | Novo `getSpellMathForSpell` |
| Modify `src/systems/dnd5e/components/CharacterSheet/Spells.jsx` | CD/ataque/mod por magia no `handleCast` + badge na linha |

---

### Task 0: Branch

- [ ] **Step 1: Criar o branch**

```bash
git checkout -b feat/magias-talento-p1
```

---

### Task 1: Declarações + resolveFeatAbility + isFeatSpellChoiceComplete

**Files:**
- Create: `src/systems/dnd5e/domain/featSpells.js`
- Test: `src/test/dnd5e/featSpells.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/test/dnd5e/featSpells.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FEAT_SPELL_GRANTS, getFeatSpellDef, resolveFeatAbility,
  isFeatSpellChoiceComplete,
} from '../../systems/dnd5e/domain/featSpells'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]
const spellIdxSet = new Set(allSpells.map(s => s.index))

describe('FEAT_SPELL_GRANTS — sanidade das declarações', () => {
  it('cobre exatamente os 11 talentos da spec', () => {
    expect(Object.keys(FEAT_SPELL_GRANTS).sort()).toEqual([
      'alta-magia-drow', 'atirador-de-magia', 'conjurador-de-ritual',
      'iniciado-artifice', 'iniciado-em-magia', 'magia-do-elfo-da-floresta',
      'telecinetico', 'telepatico', 'teleporte-das-fadas',
      'tocado-pelas-fadas', 'tocado-pelas-sombras',
    ])
  })

  it('toda magia fixa declarada existe no catálogo', () => {
    for (const [feat, def] of Object.entries(FEAT_SPELL_GRANTS)) {
      for (const g of def.grants) {
        if (g.fixed) expect(spellIdxSet.has(g.fixed), `${feat}: ${g.fixed}`).toBe(true)
      }
    }
  })

  it('todo talento declarado existe nos catálogos de talentos', () => {
    const feats = [
      ...JSON.parse(readFileSync('public/srd-data/phb-feats-pt.json', 'utf8')),
      ...JSON.parse(readFileSync('public/srd-data/tasha-feats-pt.json', 'utf8')),
      ...JSON.parse(readFileSync('public/srd-data/xanathar-feats-pt.json', 'utf8')),
    ]
    const featIdxSet = new Set(feats.map(f => f.index))
    for (const key of Object.keys(FEAT_SPELL_GRANTS)) {
      expect(featIdxSet.has(key), key).toBe(true)
    }
  })

  it('getFeatSpellDef: null para talento sem magia', () => {
    expect(getFeatSpellDef('robusto')).toBeNull()
    expect(getFeatSpellDef('tocado-pelas-fadas')).not.toBeNull()
  })
})

describe('resolveFeatAbility', () => {
  it("'chosenAttr' usa o atributo aumentado pelo talento", () => {
    const def = getFeatSpellDef('tocado-pelas-fadas')
    expect(resolveFeatAbility(def, { chosenAttr: 'cha' })).toBe('cha')
  })

  it("'chosenAttr' sem escolha registrada → null", () => {
    const def = getFeatSpellDef('tocado-pelas-fadas')
    expect(resolveFeatAbility(def, {})).toBeNull()
  })

  it("'byList' mapeia mago→int, clerigo→wis, bardo→cha", () => {
    const def = getFeatSpellDef('iniciado-em-magia')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'mago' } })).toBe('int')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'clerigo' } })).toBe('wis')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'bardo' } })).toBe('cha')
    expect(resolveFeatAbility(def, {})).toBeNull()
  })

  it('literal retorna direto (iniciado-artifice → int, alta-magia-drow → cha)', () => {
    expect(resolveFeatAbility(getFeatSpellDef('iniciado-artifice'), {})).toBe('int')
    expect(resolveFeatAbility(getFeatSpellDef('alta-magia-drow'), {})).toBe('cha')
  })
})

describe('isFeatSpellChoiceComplete', () => {
  it('talento sem def → true (não bloqueia nada)', () => {
    expect(isFeatSpellChoiceComplete('robusto', null)).toBe(true)
  })

  it('talento só com fixas → true mesmo sem spellChoices', () => {
    expect(isFeatSpellChoiceComplete('telepatico', null)).toBe(true)
    expect(isFeatSpellChoiceComplete('alta-magia-drow', null)).toBe(true)
  })

  it('tocado-pelas-fadas: exige 1 pick no único grant choose', () => {
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', null)).toBe(false)
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', { list: null, picks: [[]] })).toBe(false)
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', { list: null, picks: [['enfeiticar-pessoa']] })).toBe(true)
  })

  it('iniciado-em-magia: exige list + 2 truques + 1 magia', () => {
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: null, picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: FAIL — `Failed to resolve import "../../systems/dnd5e/domain/featSpells"`

- [ ] **Step 3: Implementar o módulo com declarações + as duas funções**

Criar `src/systems/dnd5e/domain/featSpells.js`:

```js
/**
 * Motor de magias concedidas por TALENTO (spec 2026-07-15).
 *
 * Espelha o subclassSpells.js: declaração no domínio + injeção na criação
 * (build) e no level-up (bonusSpells). Diferenças importantes:
 *  - MERGE, nunca skip: magia já presente ganha proveniência do talento
 *    (featIndex/featGrant e ability se ausente) em vez de ser descartada;
 *  - roda TAMBÉM em level-up de multiclasse (ASI de MC pode virar talento);
 *  - regras de conjuração (freeCast/atWill/ritualOnly/slots) derivam AO VIVO
 *    das declarações via getCastPolicy — nunca são persistidas na magia.
 *
 * `picks[i]` do spellChoices alinha com o i-ésimo grant `choose` do talento
 * (ordinal entre os choose, não índice absoluto em grants).
 */
import { mapSrdSpellToCharacter } from './subclassSpells'

const SIX_CASTER_LISTS = ['bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'mago']

// Atributo de conjuração por lista de classe (modo 'byList')
const LIST_ABILITY = {
  bardo: 'cha', bruxo: 'cha', feiticeiro: 'cha',
  clerigo: 'wis', druida: 'wis',
  mago: 'int', artifice: 'int',
}

export const FEAT_SPELL_GRANTS = {
  // ── Tasha ──────────────────────────────────────────────────────────
  'tocado-pelas-fadas': {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'passo-nebuloso', freeCast: 'long', slots: 'always' },
      { choose: { count: 1, level: 1, schools: ['adivinhação', 'encantamento'] },
        freeCast: 'long', slots: 'always' },
    ],
  },
  'tocado-pelas-sombras': {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'invisibilidade', freeCast: 'long', slots: 'always' },
      { choose: { count: 1, level: 1, schools: ['ilusão', 'necromancia'] },
        freeCast: 'long', slots: 'always' },
    ],
  },
  'iniciado-artifice': {
    ability: 'int',
    grants: [
      { choose: { count: 1, level: 0, list: 'artifice' } },
      // Texto explícito: "pode conjurar essa magia utilizando qualquer
      // espaço de magia que você possua" → slots incondicionais.
      { choose: { count: 1, level: 1, list: 'artifice' }, freeCast: 'long', slots: 'always' },
    ],
  },
  telepatico: {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'detectar-pensamentos', freeCast: 'long', slots: 'always' },
    ],
  },
  telecinetico: {
    ability: 'chosenAttr',
    grants: [
      { fixed: 'maos-magicas' }, // truque — à vontade por natureza
    ],
  },
  // ── PHB ────────────────────────────────────────────────────────────
  'iniciado-em-magia': {
    ability: 'byList',
    pickList: SIX_CASTER_LISTS,
    grants: [
      { choose: { count: 2, level: 0, fromList: true } },
      // Sage Advice: slot permitido apenas se a classe escolhida no talento
      // for uma das classes do personagem.
      { choose: { count: 1, level: 1, fromList: true }, freeCast: 'long', slots: 'classMatch' },
    ],
  },
  'conjurador-de-ritual': {
    ability: 'byList',
    pickList: SIX_CASTER_LISTS,
    grants: [
      { choose: { count: 2, level: 1, ritual: true, fromList: true }, ritualOnly: true },
    ],
  },
  'atirador-de-magia': {
    ability: 'byList',
    pickList: SIX_CASTER_LISTS,
    grants: [
      { choose: { count: 1, level: 0, attack: true, fromList: true } },
    ],
  },
  // ── Xanathar (talentos raciais) ────────────────────────────────────
  'magia-do-elfo-da-floresta': {
    ability: 'wis',
    grants: [
      { choose: { count: 1, level: 0, list: 'druida' } },
      { fixed: 'passos-longos',     freeCast: 'long', slots: 'never' },
      // Índice canônico; 'passos-sem-pegadas' é duplicata a remover (task à parte).
      { fixed: 'passar-sem-rastro', freeCast: 'long', slots: 'never' },
    ],
  },
  'teleporte-das-fadas': {
    ability: 'int',
    grants: [
      { fixed: 'passo-nebuloso', freeCast: 'short', slots: 'never' },
    ],
  },
  'alta-magia-drow': {
    ability: 'cha',
    grants: [
      { fixed: 'detectar-magia',  atWill: true },
      { fixed: 'levitacao',       freeCast: 'long', slots: 'never' },
      { fixed: 'dissipar-magia',  freeCast: 'long', slots: 'never' },
    ],
  },
}

export function getFeatSpellDef(featIndex) {
  return FEAT_SPELL_GRANTS[featIndex] ?? null
}

/**
 * Resolve o atributo de conjuração das magias do talento.
 * @param def  declaração (getFeatSpellDef)
 * @param feat entrada persistida { chosenAttr?, spellChoices? } (info.feats[])
 */
export function resolveFeatAbility(def, feat) {
  if (!def?.ability) return null
  if (def.ability === 'chosenAttr') return feat?.chosenAttr ?? null
  if (def.ability === 'byList') return LIST_ABILITY[feat?.spellChoices?.list] ?? null
  return def.ability
}

/**
 * Escolhas completas? Sem def → true. Com pickList, exige `list`; cada grant
 * `choose` exige `picks[ordinal].length === count`.
 */
export function isFeatSpellChoiceComplete(featIndex, spellChoices) {
  const def = getFeatSpellDef(featIndex)
  if (!def) return true
  if (def.pickList && !spellChoices?.list) return false
  let ordinal = 0
  for (const g of def.grants) {
    if (!g.choose) continue
    if ((spellChoices?.picks?.[ordinal]?.length ?? 0) !== g.choose.count) return false
    ordinal++
  }
  return true
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: PASS (todos)

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/test/dnd5e/featSpells.test.js
git commit -m "@ feat(feat-spells): declaracoes dos 11 talentos + ability + completude" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: resolveFeatSpellOptions (predicados) + guard-rail de truques de ataque

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js`
- Test: `src/test/dnd5e/featSpells.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao FINAL de `src/test/dnd5e/featSpells.test.js` (o import de `resolveFeatSpellOptions` entra no import existente do módulo):

```js
import { resolveFeatSpellOptions } from '../../systems/dnd5e/domain/featSpells'

const spellMechanics = JSON.parse(readFileSync('public/srd-data/spell-mechanics-pt.json', 'utf8'))

describe('resolveFeatSpellOptions', () => {
  it('tocado-pelas-fadas: 1º círculo de adivinhação/encantamento (21 no catálogo atual)', () => {
    const opts = resolveFeatSpellOptions('tocado-pelas-fadas', 1, { srdSpells: allSpells })
    expect(opts.length).toBe(21)
    expect(opts.every(s => s.level === 1)).toBe(true)
    expect(opts.every(s => ['adivinhação', 'encantamento'].includes(s.school))).toBe(true)
    expect(opts.some(s => s.index === 'enfeiticar-pessoa')).toBe(true)
  })

  it('tocado-pelas-sombras: ilusão/necromancia (9 no catálogo atual)', () => {
    const opts = resolveFeatSpellOptions('tocado-pelas-sombras', 1, { srdSpells: allSpells })
    expect(opts.length).toBe(9)
  })

  it('grant sem choose (fixa) → []', () => {
    expect(resolveFeatSpellOptions('tocado-pelas-fadas', 0, { srdSpells: allSpells })).toEqual([])
  })

  it('fromList sem list escolhida → []', () => {
    expect(resolveFeatSpellOptions('iniciado-em-magia', 0, { srdSpells: allSpells })).toEqual([])
  })

  it('iniciado-em-magia com list mago: truques da lista do mago', () => {
    const opts = resolveFeatSpellOptions('iniciado-em-magia', 0, { list: 'mago', srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.level === 0 && (s.classes ?? []).includes('mago'))).toBe(true)
  })

  it('iniciado-artifice: list fixa artifice, 14 truques no catálogo atual', () => {
    const opts = resolveFeatSpellOptions('iniciado-artifice', 0, { srdSpells: allSpells })
    expect(opts.length).toBe(14)
    expect(opts.every(s => (s.classes ?? []).includes('artifice'))).toBe(true)
  })

  it('conjurador-de-ritual com list mago: só rituais de 1º da lista', () => {
    const opts = resolveFeatSpellOptions('conjurador-de-ritual', 0, { list: 'mago', srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.ritual === true && s.level === 1 && (s.classes ?? []).includes('mago'))).toBe(true)
  })

  it('atirador-de-magia com list bruxo: inclui rajada-mistica', () => {
    const opts = resolveFeatSpellOptions('atirador-de-magia', 0, { list: 'bruxo', srdSpells: allSpells, spellMechanics })
    expect(opts.some(s => s.index === 'rajada-mistica')).toBe(true)
    expect(opts.every(s => s.level === 0)).toBe(true)
  })

  it('GUARD-RAIL: conjunto de truques de ataque derivado do spell-mechanics', () => {
    // Congela o conjunto derivado (attack:true + level 0) — se o
    // spell-mechanics mudar, este teste avisa. Ao falhar: imprima o
    // recebido, confira nome a nome se são truques com jogada de ataque
    // e atualize a lista conscientemente.
    const cantripIdx = new Set(allSpells.filter(s => s.level === 0).map(s => s.index))
    const derived = Object.entries(spellMechanics)
      .filter(([idx, m]) => m && m.attack === true && cantripIdx.has(idx))
      .map(([idx]) => idx)
      .sort()
    expect(derived).toHaveLength(9)
    expect(derived).toContain('rajada-mistica')
    expect(derived).toContain('raio-de-fogo')
    expect(derived).toContain('toque-chocante')
  })

  it('magia-do-elfo-da-floresta: truques de druida', () => {
    const opts = resolveFeatSpellOptions('magia-do-elfo-da-floresta', 0, { srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.level === 0 && (s.classes ?? []).includes('druida'))).toBe(true)
  })
})
```

Nota: mantenha os imports no topo do arquivo (Vitest não se importa, mas o lint sim — mova o `import` e a const `spellMechanics` pro topo junto dos existentes).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: FAIL — `resolveFeatSpellOptions is not a function` (ou import inexistente)

- [ ] **Step 3: Implementar**

Acrescentar em `src/systems/dnd5e/domain/featSpells.js`, após `isFeatSpellChoiceComplete`:

```js
/**
 * Candidatas de um grant `choose`. `list` = classe escolhida no pickList
 * (irrelevante quando o grant tem `list` fixa). `spellMechanics` só é
 * necessário para grants com `attack: true`.
 */
export function resolveFeatSpellOptions(featIndex, grantIdx, { list = null, srdSpells = [], spellMechanics = null } = {}) {
  const def = getFeatSpellDef(featIndex)
  const grant = def?.grants?.[grantIdx]
  if (!grant?.choose) return []
  const c = grant.choose
  const wantList = c.list ?? (c.fromList ? list : null)
  if ((c.fromList || c.list) && !wantList) return []
  return srdSpells.filter(s => {
    if ((s.level ?? -1) !== c.level) return false
    if (c.schools && !c.schools.includes(String(s.school ?? '').toLowerCase())) return false
    if (c.ritual && !s.ritual) return false
    if (wantList && !(s.classes ?? []).includes(wantList)) return false
    if (c.attack && spellMechanics?.[s.index]?.attack !== true) return false
    return true
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: PASS. Se o guard-rail falhar no tamanho/conteúdo, imprima o derivado, valide magia a magia contra o catálogo e ajuste o teste com a lista real — NUNCA relaxe o predicado.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/test/dnd5e/featSpells.test.js
git commit -m "@ feat(feat-spells): predicados de escolha + guard-rail de truques de ataque" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: getCastPolicy

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js`
- Test: `src/test/dnd5e/featSpells.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao arquivo de teste (import de `getCastPolicy` junto dos demais):

```js
import { getCastPolicy } from '../../systems/dnd5e/domain/featSpells'

describe('getCastPolicy', () => {
  const baseChar = (over = {}) => ({
    info: {
      class: 'guerreiro', multiclasses: [],
      feats: [{ index: 'iniciado-em-magia', name: 'Iniciado em Magia', spellChoices: { list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] } }],
      ...over,
    },
  })

  it('magia sem featIndex → null (não é de talento)', () => {
    expect(getCastPolicy({ index: 'bola-de-fogo', level: 3 }, baseChar())).toBeNull()
  })

  it('ritualOnly: sem slots, sem freeCast', () => {
    const p = getCastPolicy({ featIndex: 'conjurador-de-ritual', featGrant: 0, index: 'alarme', level: 1 }, baseChar())
    expect(p).toEqual({ slots: false, ritualOnly: true, atWill: false, freeCast: null })
  })

  it('atWill: detectar-magia da alta-magia-drow', () => {
    const p = getCastPolicy({ featIndex: 'alta-magia-drow', featGrant: 0, index: 'detectar-magia', level: 1 }, baseChar())
    expect(p).toEqual({ slots: false, ritualOnly: false, atWill: true, freeCast: null })
  })

  it('truque de talento → atWill', () => {
    const p = getCastPolicy({ featIndex: 'telecinetico', featGrant: 0, index: 'maos-magicas', level: 0 }, baseChar())
    expect(p).toEqual({ slots: false, ritualOnly: false, atWill: true, freeCast: null })
  })

  it('freeCast long + slots always (tocado-pelas-fadas fixa)', () => {
    const p = getCastPolicy({ featIndex: 'tocado-pelas-fadas', featGrant: 0, index: 'passo-nebuloso', level: 2 }, baseChar())
    expect(p).toEqual({
      slots: true, ritualOnly: false, atWill: false,
      freeCast: { recharge: 'long', trackerId: 'feat-tocado-pelas-fadas-passo-nebuloso' },
    })
  })

  it('slots never + freeCast short (teleporte-das-fadas)', () => {
    const p = getCastPolicy({ featIndex: 'teleporte-das-fadas', featGrant: 0, index: 'passo-nebuloso', level: 2 }, baseChar())
    expect(p.slots).toBe(false)
    expect(p.freeCast).toEqual({ recharge: 'short', trackerId: 'feat-teleporte-das-fadas-passo-nebuloso' })
  })

  it('classMatch negativo: guerreiro com iniciado-em-magia (mago) → sem slots', () => {
    const p = getCastPolicy({ featIndex: 'iniciado-em-magia', featGrant: 1, index: 'escudo-arcano', level: 1 }, baseChar())
    expect(p.slots).toBe(false)
    expect(p.freeCast?.recharge).toBe('long')
  })

  it('classMatch positivo pela classe primária', () => {
    const c = baseChar({ class: 'mago' })
    const p = getCastPolicy({ featIndex: 'iniciado-em-magia', featGrant: 1, index: 'escudo-arcano', level: 1 }, c)
    expect(p.slots).toBe(true)
  })

  it('classMatch positivo por multiclasse', () => {
    const c = baseChar({ multiclasses: [{ class: 'mago', level: 2 }] })
    const p = getCastPolicy({ featIndex: 'iniciado-em-magia', featGrant: 1, index: 'escudo-arcano', level: 1 }, c)
    expect(p.slots).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: FAIL — `getCastPolicy is not a function`

- [ ] **Step 3: Implementar**

Acrescentar em `featSpells.js`:

```js
/**
 * Política de conjuração de uma magia de talento, derivada AO VIVO da
 * declaração (nada disso é persistido na magia). Retorna null para magias
 * que não vieram de talento — o caller usa o comportamento padrão.
 * `slots: 'classMatch'` reavalia a cada chamada: multiclassar depois de
 * pegar o talento muda o resultado (Sage Advice, Iniciado em Magia).
 */
export function getCastPolicy(spell, character) {
  if (spell?.featIndex == null) return null
  const def = getFeatSpellDef(spell.featIndex)
  const grant = def?.grants?.[spell.featGrant]
  if (!grant) return null
  if (grant.ritualOnly) return { slots: false, ritualOnly: true, atWill: false, freeCast: null }
  if (grant.atWill)     return { slots: false, ritualOnly: false, atWill: true, freeCast: null }
  if ((spell.level ?? 0) === 0) return { slots: false, ritualOnly: false, atWill: true, freeCast: null }

  const freeCast = grant.freeCast
    ? { recharge: grant.freeCast, trackerId: `feat-${spell.featIndex}-${spell.index}` }
    : null

  const policy = grant.slots ?? 'always'
  let slots
  if (policy === 'always') slots = true
  else if (policy === 'never') slots = false
  else {
    const feat = (character?.info?.feats ?? []).find(f => f.index === spell.featIndex)
    const list = feat?.spellChoices?.list ?? null
    const classes = [character?.info?.class, ...(character?.info?.multiclasses ?? []).map(m => m.class)]
      .filter(Boolean)
    slots = !!list && classes.includes(list)
  }
  return { slots, ritualOnly: false, atWill: false, freeCast }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/featSpells.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/test/dnd5e/featSpells.test.js
git commit -m "@ feat(feat-spells): getCastPolicy (slots/freeCast/atWill/ritualOnly ao vivo)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: injectFeatSpells (merge) + wiring no build

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js`
- Test: `src/test/dnd5e/feat-spells-injection.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/test/dnd5e/feat-spells-injection.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectFeatSpells } from '../../systems/dnd5e/domain/featSpells'
import { buildCharacter, buildCharacterWithSubclassSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]

function makeChar(feats, spells = []) {
  return {
    info: { class: 'guerreiro', level: 4, multiclasses: [], feats },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 13 },
    spellcasting: { spells },
  }
}

describe('injectFeatSpells', () => {
  it('talento só com fixas injeta com ability, label e proveniência', () => {
    const c = makeChar([{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }])
    const next = injectFeatSpells(c, allSpells)
    const sp = next.spellcasting.spells.find(s => s.index === 'detectar-pensamentos')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('wis')
    expect(sp.source).toBe('feat')
    expect(sp.sourceLabel).toBe('Talento: Telepático')
    expect(sp.featIndex).toBe('telepatico')
    expect(sp.featGrant).toBe(0)
    expect(sp.alwaysPrepared).toBe(true)
  })

  it('fixa + escolhida (tocado-pelas-fadas com pick)', () => {
    const c = makeChar([{
      index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4,
      chosenAttr: 'cha', spellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    }])
    const next = injectFeatSpells(c, allSpells)
    const idx = next.spellcasting.spells.map(s => s.index)
    expect(idx).toContain('passo-nebuloso')
    expect(idx).toContain('enfeiticar-pessoa')
    expect(next.spellcasting.spells.every(s => s.ability === 'cha')).toBe(true)
  })

  it('sem picks → injeta só a fixa', () => {
    const c = makeChar([{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }])
    const next = injectFeatSpells(c, allSpells)
    expect(next.spellcasting.spells.map(s => s.index)).toEqual(['passo-nebuloso'])
  })

  it('MERGE: magia já existente ganha proveniência, sem duplicar', () => {
    const existing = { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'oath', sourceLabel: 'Juramento: vinganca', alwaysPrepared: true, prepared: true }
    const c = makeChar(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }],
      [existing],
    )
    const next = injectFeatSpells(c, allSpells)
    const matches = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(matches).toHaveLength(1)
    expect(matches[0].featIndex).toBe('tocado-pelas-fadas')
    expect(matches[0].ability).toBe('cha')
    expect(matches[0].sourceLabel).toBe('Juramento: vinganca') // não sobrescreve
  })

  it('MERGE não sobrescreve ability já existente', () => {
    const existing = { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, ability: 'int' }
    const c = makeChar(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }],
      [existing],
    )
    const next = injectFeatSpells(c, allSpells)
    expect(next.spellcasting.spells[0].ability).toBe('int')
  })

  it('idempotente: segunda passada não muda nada', () => {
    const c = makeChar([{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }])
    const once = injectFeatSpells(c, allSpells)
    const twice = injectFeatSpells(once, allSpells)
    expect(twice).toBe(once) // referência idêntica = nenhum trabalho
  })

  it('personagem sem talentos com magia → retorna o próprio objeto', () => {
    const c = makeChar([{ index: 'robusto', name: 'Robusto', takenAtLevel: 4 }])
    expect(injectFeatSpells(c, allSpells)).toBe(c)
  })
})

const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }
const baseDraft = {
  ...INITIAL_DRAFT_V2,
  name: 'Heitor', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  savingThrows: ['str', 'con'],
}

describe('build-character — spellChoices e injeção no wrapper', () => {
  it('racialFeat.featSpellChoices vira info.feats[].spellChoices', () => {
    const draft = {
      ...baseDraft,
      racialFeat: {
        featIndex: 'tocado-pelas-fadas', featName: 'Tocado pelas Fadas',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
        featChosenAttr: 'cha',
        featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
      },
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.info.feats[0].spellChoices).toEqual({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('asiChoices[lvl].featSpellChoices vira spellChoices do feat de nível', () => {
    const draft = {
      ...baseDraft, level: 4,
      asiChoices: { 4: {
        type: 'feat', featIndex: 'telepatico', featName: 'Telepático',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'wis',
        featSpellChoices: { list: null, picks: [] },
      } },
    }
    const c = buildCharacter(draft, guerreiro, {})
    const feat = c.info.feats.find(f => f.index === 'telepatico')
    expect(feat.spellChoices).toEqual({ list: null, picks: [] })
  })

  it('wrapper injeta magias de talento no build (Guerreiro + Telepático)', () => {
    const draft = {
      ...baseDraft,
      racialFeat: {
        featIndex: 'telepatico', featName: 'Telepático',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
        featChosenAttr: 'wis',
      },
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, allSpells)
    const sp = c.spellcasting.spells.find(s => s.index === 'detectar-pensamentos')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('wis')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/feat-spells-injection.test.js`
Expected: FAIL — `injectFeatSpells is not a function`

- [ ] **Step 3: Implementar injectFeatSpells**

Acrescentar em `featSpells.js`:

```js
/** Refs { index, grantIdx } das magias concedidas por UM feat persistido. */
function getGrantedSpellRefs(def, feat) {
  const out = []
  let ordinal = 0
  for (const [grantIdx, g] of def.grants.entries()) {
    if (g.fixed) {
      out.push({ index: g.fixed, grantIdx })
    } else if (g.choose) {
      for (const idx of feat?.spellChoices?.picks?.[ordinal] ?? []) {
        out.push({ index: idx, grantIdx })
      }
      ordinal++
    }
  }
  return out
}

/**
 * Injeta as magias de TODOS os talentos do personagem (info.feats).
 * MERGE idempotente: magia já presente ganha featIndex/featGrant (e ability
 * se ausente) em vez de duplicar; nada a fazer → retorna o MESMO objeto.
 * Usado no build do wizard e no retrofit da ficha (plano 2).
 */
export function injectFeatSpells(character, srdSpells) {
  if (!character || !srdSpells?.length) return character

  const spells = character.spellcasting?.spells ?? []
  const byIndex = new Map(spells.map(s => [s.index, s]))
  const added = []
  const mergesByIndex = new Map()

  for (const feat of character.info?.feats ?? []) {
    const def = getFeatSpellDef(feat.index)
    if (!def) continue
    const ability = resolveFeatAbility(def, feat)
    const label = `Talento: ${feat.name}`

    for (const ref of getGrantedSpellRefs(def, feat)) {
      const cur = byIndex.get(ref.index)
      if (cur) {
        if (cur.featIndex == null && !mergesByIndex.has(ref.index)) {
          mergesByIndex.set(ref.index, {
            featIndex: feat.index, featGrant: ref.grantIdx,
            ...(cur.ability == null && ability ? { ability } : {}),
          })
        }
        continue
      }
      const srd = srdSpells.find(s => s.index === ref.index)
      if (!srd) continue
      const mapped = {
        ...mapSrdSpellToCharacter(srd, { source: 'feat', alwaysPrepared: true, label }),
        featIndex: feat.index, featGrant: ref.grantIdx,
        ...(ability ? { ability } : {}),
      }
      added.push(mapped)
      byIndex.set(ref.index, mapped)
    }
  }

  if (added.length === 0 && mergesByIndex.size === 0) return character

  const nextSpells = spells.map(s => {
    const m = mergesByIndex.get(s.index)
    return m ? { ...s, ...m } : s
  })
  return {
    ...character,
    spellcasting: { ...character.spellcasting, spells: [...nextSpells, ...added] },
  }
}
```

- [ ] **Step 4: Wiring no build-character.js**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js`:

(a) Import (linha 4):

```js
import { injectSubclassSpellsAtBuild } from '../../../domain/subclassSpells'
import { injectFeatSpells } from '../../../domain/featSpells'
```

(b) No array `feats:` (entrada do talento racial, ~linha 180), acrescentar a linha do `spellChoices` após o spread do `chosenAttr`:

```js
        ...(draft.racialFeat?.featIndex ? [{
          index: draft.racialFeat.featIndex,
          name: draft.racialFeat.featName,
          takenAtLevel: 1,
          source: 'race',
          ...(draft.racialFeat.featAttrBonus
            ? { chosenAttr: draft.racialFeat.featChosenAttr ?? draft.racialFeat.featAttrBonus.choices?.[0] ?? null }
            : {}),
          ...(draft.racialFeat.featSpellChoices ? { spellChoices: draft.racialFeat.featSpellChoices } : {}),
        }] : []),
```

(c) Na entrada dos ASIs da classe primária (map de `draft.asiChoices`):

```js
          .map(([lvl, c]) => ({
            index: c.featIndex, name: c.featName, takenAtLevel: Number(lvl),
            ...(c.featAttrBonus ? { chosenAttr: c.featChosenAttr ?? c.featAttrBonus.choices?.[0] ?? null } : {}),
            ...(c.featSpellChoices ? { spellChoices: c.featSpellChoices } : {}),
          })),
```

(d) Na entrada das multiclasses (map de `mc.asiChoices`):

```js
            .map(([lvl, c]) => ({
              index: c.featIndex, name: c.featName, takenAtLevel: Number(lvl), fromClass: mc.class,
              ...(c.featAttrBonus ? { chosenAttr: c.featChosenAttr ?? c.featAttrBonus.choices?.[0] ?? null } : {}),
              ...(c.featSpellChoices ? { spellChoices: c.featSpellChoices } : {}),
            }))
```

(e) No wrapper (~linha 296), chain da injeção + comentário atualizado:

```js
/**
 * Wrapper de buildCharacter que pós-processa o personagem para injetar
 * magias concedidas por subclasse (Cleric domain, Paladin oath, Druid
 * Land circle, Warlock patron) E por talento (spec 2026-07-15). Separado
 * de buildCharacter pra manter o core puro/testável sem dependência da
 * lista SRD.
 */
export function buildCharacterWithSubclassSpells(draft, classData, classEquipment, srdSpells) {
  const base = buildCharacter(draft, classData, classEquipment)
  if (!srdSpells || srdSpells.length === 0) return base
  return injectFeatSpells(injectSubclassSpellsAtBuild(base, srdSpells), srdSpells)
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/feat-spells-injection.test.js`
Expected: PASS

Run também (regressão do build): `npx vitest run src/test/wizardV2-build-character.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/test/dnd5e/feat-spells-injection.test.js
git commit -m "@ feat(feat-spells): injecao com merge no build + spellChoices no draft" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: enrichWithFeatSpells + applyLevelUp + call site

**Files:**
- Modify: `src/systems/dnd5e/domain/featSpells.js`
- Modify: `src/systems/dnd5e/domain/rules.js` (applyLevelUp, ~linhas 546-650)
- Modify: `src/systems/dnd5e/components/CharacterSheet/LevelProgression.jsx` (~linha 61)
- Test: `src/test/dnd5e/feat-spells-levelup.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/test/dnd5e/feat-spells-levelup.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { enrichWithFeatSpells } from '../../systems/dnd5e/domain/featSpells'
import { applyLevelUp } from '../../systems/dnd5e/domain/rules'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]

const FEY = {
  index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas',
  attrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
}

// Mesmo formato do makeChar de src/test/audit-fixes.test.js (shape mínimo
// que o applyLevelUp aceita), com spellcasting.spells materializado.
function makeChar(overrides = {}) {
  return {
    id: 'c1',
    meta: { settings: { allowFeats: true } },
    info: {
      name: 'Heitor', class: 'guerreiro', level: 3,
      multiclasses: [], feats: [], asiOrFeatByLevel: {},
      ...overrides.info,
    },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 13 },
    combat: { maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 14, speed: 30 },
    proficiencies: {},
    spellcasting: { spells: [], ...overrides.spellcasting },
    inventory: { currency: {} },
    traits: {},
    ...overrides.root,
  }
}

function feyPatch(extra = {}) {
  return {
    newLevel: 4, hpIncrease: 6, attrBoosts: {},
    chosenFeat: FEY, featChosenAttr: 'cha',
    featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    ...extra,
  }
}

describe('enrichWithFeatSpells + applyLevelUp', () => {
  it('injeta fixa + escolhida com ability e persiste spellChoices no feat', () => {
    const c = makeChar()
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch: feyPatch(), character: c, srdSpells: allSpells }))
    const idx = next.spellcasting.spells.map(s => s.index)
    expect(idx).toContain('passo-nebuloso')
    expect(idx).toContain('enfeiticar-pessoa')
    expect(next.spellcasting.spells.every(s => s.ability === 'cha')).toBe(true)
    expect(next.info.feats[0].spellChoices).toEqual({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('MERGE: magia já conhecida ganha proveniência sem duplicar', () => {
    const c = makeChar({ spellcasting: { spells: [
      { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'oath' },
    ] } })
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch: feyPatch(), character: c, srdSpells: allSpells }))
    const matches = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(matches).toHaveLength(1)
    expect(matches[0].featIndex).toBe('tocado-pelas-fadas')
    expect(matches[0].ability).toBe('cha')
  })

  it('allowFeats false → patch intacto, nada injetado', () => {
    const c = makeChar({ root: { meta: { settings: { allowFeats: false } } } })
    const patch = feyPatch()
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('ASI junto do feat → patch intacto (ASI vence, espelha applyLevelUp)', () => {
    const c = makeChar()
    const patch = feyPatch({ attrBoosts: { str: 2 } })
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('level-up de MULTICLASSE também injeta (diferente do enrich de subclasse)', () => {
    const c = makeChar({ info: { class: 'guerreiro', level: 5, multiclasses: [{ class: 'mago', level: 3 }] } })
    const patch = feyPatch({ multiclassIndex: 0, featChosenAttr: 'int' })
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells }))
    const sp = next.spellcasting.spells.find(s => s.index === 'passo-nebuloso')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('int')
  })

  it('patch sem chosenFeat → intacto', () => {
    const c = makeChar()
    const patch = { newLevel: 4, hpIncrease: 6, attrBoosts: { str: 2 } }
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/feat-spells-levelup.test.js`
Expected: FAIL — `enrichWithFeatSpells is not a function`

- [ ] **Step 3: Implementar enrichWithFeatSpells**

Acrescentar em `featSpells.js`:

```js
/**
 * Enriquece o patch de level-up com as magias do talento recém-escolhido.
 * Novas → `bonusSpells` (applyLevelUp já mescla); já conhecidas →
 * `featSpellMerges` (applyLevelUp aplica proveniência sobre a existente).
 *
 * ATENÇÃO: diferente do enrichWithSubclassSpells, NÃO retorna cedo em
 * multiclassIndex != null — ASI de multiclasse também pode virar talento.
 * Espelha os gates do applyLevelUp (allowFeats, ASI vence feat).
 */
export function enrichWithFeatSpells({ patch, character, srdSpells }) {
  const chosenFeat = patch?.chosenFeat
  if (!chosenFeat) return patch
  const allowFeats = character?.meta?.settings?.allowFeats ?? false
  const hasAsi = !!patch.attrBoosts && Object.values(patch.attrBoosts).some(v => Number(v) > 0)
  if (!allowFeats || hasAsi) return patch
  const def = getFeatSpellDef(chosenFeat.index)
  if (!def) return patch

  const featLike = {
    index: chosenFeat.index,
    name: chosenFeat.name,
    chosenAttr: patch.featChosenAttr ?? chosenFeat.attrBonus?.choices?.[0] ?? null,
    spellChoices: patch.featSpellChoices ?? null,
  }
  const ability = resolveFeatAbility(def, featLike)
  const label = `Talento: ${chosenFeat.name}`
  const existing = new Map((character.spellcasting?.spells ?? []).map(s => [s.index, s]))

  const bonus = []
  const merges = []
  for (const ref of getGrantedSpellRefs(def, featLike)) {
    const cur = existing.get(ref.index)
    if (cur) {
      if (cur.featIndex == null) {
        merges.push({
          index: ref.index, featIndex: chosenFeat.index, featGrant: ref.grantIdx,
          ...(cur.ability == null && ability ? { ability } : {}),
        })
      }
      continue
    }
    const srd = srdSpells?.find(s => s.index === ref.index)
    if (!srd) continue
    bonus.push({
      ...mapSrdSpellToCharacter(srd, { source: 'feat', alwaysPrepared: true, label }),
      featIndex: chosenFeat.index, featGrant: ref.grantIdx,
      ...(ability ? { ability } : {}),
    })
  }

  if (bonus.length === 0 && merges.length === 0) return patch
  return {
    ...patch,
    bonusSpells: [...(patch.bonusSpells ?? []), ...bonus],
    ...(merges.length ? { featSpellMerges: merges } : {}),
  }
}
```

- [ ] **Step 4: Modificar applyLevelUp (rules.js)**

(a) Destructure do patch (~linha 547) — acrescentar os dois campos:

```js
  const {
    newLevel, hpIncrease, attrBoosts,
    multiclassIndex, newChoices, bonusSpells, chosenFeat,
    featChosenAttr, featSpellChoices, featSpellMerges,
  } = patch
```

(b) Entrada do feat em `info.feats` (~linha 612) — acrescentar o spread do `spellChoices`:

```js
      feats: [...(info.feats ?? []), {
        index:       chosenFeat.index,
        name:        chosenFeat.name,
        takenAtLevel: newLevel,
        ...(chosenFeat.attrBonus ? { chosenAttr: featChosenAttr ?? chosenFeat.attrBonus.choices[0] ?? null } : {}),
        ...(featSpellChoices ? { spellChoices: featSpellChoices } : {}),
      }],
```

(c) `mergedSpells` (~linha 646) — trocar `const` por `let` e aplicar os merges:

```js
  let mergedSpells = uniqueBy(
    [...(character.spellcasting?.spells ?? []), ...(bonusSpells ?? [])],
    s => s.index
  )
  // Magias que o personagem JÁ conhecia e que um talento novo também concede:
  // ganham proveniência do talento (merge), nunca duplicam (spec 2026-07-15).
  if (Array.isArray(featSpellMerges) && featSpellMerges.length > 0) {
    const mergeByIdx = new Map(featSpellMerges.map(m => [m.index, m]))
    mergedSpells = mergedSpells.map(s => {
      const m = mergeByIdx.get(s.index)
      if (!m) return s
      const { index: _idx, ...fields } = m
      return { ...s, ...fields }
    })
  }
```

- [ ] **Step 5: Call site em LevelProgression.jsx**

(a) Import no topo:

```js
import { enrichWithFeatSpells } from '../../domain/featSpells'
```

(b) `enrichedApplyLevelUp` (~linha 61):

```js
  function enrichedApplyLevelUp(patch) {
    const enriched = enrichWithSubclassSpells({
      patch, classIndex, chosenFeatures, srdSpells,
    })
    // Talentos com magia (spec 2026-07-15): roda também em level-up de
    // multiclasse — o guard de multiclassIndex é só do enrich de subclasse.
    onApplyLevelUp?.(enrichWithFeatSpells({ patch: enriched, character, srdSpells }))
  }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/feat-spells-levelup.test.js`
Expected: PASS

Regressão dos vizinhos:

Run: `npx vitest run src/test/audit-fixes.test.js src/test/levelProgression-domainSpells.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/domain/featSpells.js src/systems/dnd5e/domain/rules.js src/systems/dnd5e/components/CharacterSheet/LevelProgression.jsx src/test/dnd5e/feat-spells-levelup.test.js
git commit -m "@ feat(feat-spells): enrich no level-up (bonusSpells + featSpellMerges)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: getSpellMathForSpell + CD/ataque por magia em Spells.jsx

**Files:**
- Modify: `src/systems/dnd5e/utils/spellcasting.js`
- Modify: `src/systems/dnd5e/components/CharacterSheet/Spells.jsx`
- Test: `src/test/dnd5e/feat-spell-math.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/test/dnd5e/feat-spell-math.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getSpellMathForSpell } from '../../systems/dnd5e/utils/spellcasting'

describe('getSpellMathForSpell', () => {
  const attrs = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 }

  it('usa spell.ability quando presente (Guerreiro + Fey Touched: CD sai de CAR)', () => {
    expect(getSpellMathForSpell({ ability: 'cha' }, attrs, 2, null))
      .toEqual({ ability: 'cha', mod: 3, save: 13, attack: 5 })
  })

  it('spell.ability vence o atributo global', () => {
    expect(getSpellMathForSpell({ ability: 'cha' }, attrs, 2, 'int').ability).toBe('cha')
  })

  it('sem spell.ability cai no atributo global', () => {
    expect(getSpellMathForSpell({}, attrs, 2, 'int'))
      .toEqual({ ability: 'int', mod: 0, save: 10, attack: 2 })
  })

  it('sem atributo nenhum → null (não-conjurador sem magia de talento)', () => {
    expect(getSpellMathForSpell({}, attrs, 2, null)).toBeNull()
  })

  it('atributo ausente do mapa → score 10', () => {
    expect(getSpellMathForSpell({ ability: 'wis' }, {}, 3, null))
      .toEqual({ ability: 'wis', mod: 0, save: 11, attack: 3 })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/feat-spell-math.test.js`
Expected: FAIL — `getSpellMathForSpell is not a function`

- [ ] **Step 3: Implementar em utils/spellcasting.js**

Acrescentar ao final de `src/systems/dnd5e/utils/spellcasting.js` (perto de `getClassSpellMath`, ~linha 355):

```js
/**
 * CD/ataque/mod de UMA magia. Magias de talento carregam `ability` próprio
 * (spec 2026-07-15) e vencem o atributo global do personagem; as demais caem
 * no `fallbackAbilityKey` (atributo da classe). Retorna null quando não há
 * atributo nenhum (não-conjurador sem magias de talento).
 */
export function getSpellMathForSpell(spell, attributes, profBonus, fallbackAbilityKey = null) {
  const key = spell?.ability ?? fallbackAbilityKey
  if (!key) return null
  const score = attributes?.[key] ?? 10
  const mod = Math.floor((score - 10) / 2)
  return { ability: key, mod, save: 8 + profBonus + mod, attack: profBonus + mod }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/feat-spell-math.test.js`
Expected: PASS

- [ ] **Step 5: Consumir em Spells.jsx**

(a) Import (linha 4) — acrescentar `getSpellMathForSpell`:

```js
import { getSpellcastingRules, getWarlockPactSlots, getClassSpellMath, getSpellSlots, getSpellMathForSpell } from '../../utils/spellcasting'
```

(b) No `handleCast` (~linha 90), substituir o ctx global do `spellRollPlan`:

```js
    // Magias de talento carregam atributo próprio (spec 2026-07-15):
    // CD/ataque/mod derivam da magia clicada, com fallback no global.
    const rowMath = getSpellMathForSpell(spell, attributes, profBonus, spellAbility)
    const plan = spellRollPlan(spell, mech, {
      slotLevel: pact ? pactSlots.slotLevel : slotLevel,
      characterLevel: totalLevel,
      spellAttack: rowMath?.attack ?? spellAttack,
      spellMod: rowMath?.mod ?? spellMod,
      spellDC: rowMath?.save ?? spellSaveDC,
    })
```

(c) No call de `<SpellRow>` (~linha 461), acrescentar a prop:

```js
                abilityOverride={spell.ability && spell.ability !== spellAbility
                  ? getSpellMathForSpell(spell, attributes, profBonus, null)
                  : null}
```

(d) Na assinatura do `SpellRow` (~linha 549), acrescentar `abilityOverride`:

```js
function SpellRow({ spell, onDetail, onRemove, isPrepared = true, showPreparedToggle, onTogglePrepared, isConcentrating, canConcentrate, onToggleConcentration, slotLevels = [], slotMax, usedSlots = {}, canCast = true, hasMechanics, onCast, pactOption, onApplyHealing, onApplyEffect, abilityOverride = null }) {
```

(e) No render do `SpellRow`, logo APÓS `<span className="text-gray-600">{schoolAbbr}</span>` (~linha 622):

```jsx
        {abilityOverride && (
          <span
            className="text-amber-300/90 font-semibold"
            title={`Magia de talento — usa ${abbrOfKey(abilityOverride.ability)} (CD ${abilityOverride.save}, ataque ${formatModifier(abilityOverride.attack)})`}
          >
            CD {abilityOverride.save} · {abbrOfKey(abilityOverride.ability)}
          </span>
        )}
```

(`abbrOfKey` e `formatModifier` já são importados no topo do arquivo.)

- [ ] **Step 6: Regressão da aba de magias**

Run: `npx vitest run src/test --silent 2>&1 | tail -20` — foque em qualquer teste que renderize Spells/SheetV2.
Expected: PASS (nenhuma regressão; a prop nova tem default `null`).

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/utils/spellcasting.js src/systems/dnd5e/components/CharacterSheet/Spells.jsx src/test/dnd5e/feat-spell-math.test.js
git commit -m "@ feat(feat-spells): CD/ataque por magia com ability do talento + badge na linha" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Suíte completa + merge + push

- [ ] **Step 1: Suíte inteira**

Run: `npx vitest run 2>&1 | tail -15`
Expected: tudo verde (flakes conhecidos de timeout em LoginScreen/ResetPasswordScreen na suíte cheia — se falharem SÓ esses, re-rodar isolado pra confirmar).

- [ ] **Step 2: Merge na master + push (deploy automático)**

```bash
git checkout master
git merge --no-ff feat/magias-talento-p1 -m "merge: motor de magias de talento (plano 1) — injecao + CD por magia" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
git branch -d feat/magias-talento-p1
```

- [ ] **Step 3: Sanidade pós-merge**

Run: `git log --oneline -3` — confirmar o merge no topo da master e push feito.

---

## O que este plano NÃO entrega (planos seguintes)

- **Plano 2:** `FeatSpellPicker` inline (wizard + level-up), gating
  (`isASIChoiceComplete`/`useBlockStatus`), retrofit na FeaturesTab —
  conserta o personagem real do dono.
- **Plano 3:** trackers 1×/descanso em `defaultClassFeatureUses`, botão
  "1×/descanso"/"à vontade"/ritual-only no `SpellRow` via `getCastPolicy`,
  política de slots aplicada na UI.
