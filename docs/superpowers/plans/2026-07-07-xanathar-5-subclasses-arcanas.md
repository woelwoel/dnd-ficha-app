# Xanathar Plano 5 — Subclasses arcanas (Bardo, Feiticeiro, Bruxo, Mago)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar as 8 subclasses arcanas finais do XGE — Bardo (Colégio do Glamour, das Espadas, dos Sussurros), Feiticeiro (Alma Favorecida, Adepto das Sombras, Feiticeiro da Tempestade), Bruxo (O Celestial — patrono com lista expandida), Mago (Mago de Guerra). Fecha as **31 subclasses**. Inclui o spike do risco **Alma Favorecida**: o Feiticeiro Alma Favorecida conjura da lista de Clérigo.

**Architecture:** Dados em `xanathar-class-choices-pt.json` (options nas choices `bard_college`/`sorcerous_origin`/`patron`/`arcane_tradition`). O Celestial concede lista expandida → `WARLOCK_PATRON_SPELLS.celestial` (subclassSpells.js). Alma Favorecida → `useClassSpells` ganha `extraClasses` e os 2 call sites (ficha `Spells.jsx`, wizard `SpellsBlock.jsx`) detectam `sorcerous_origin === 'alma-favorecida'` e passam `['clerigo']`.

**Tech Stack:** React, Vitest, JSON em `public/srd-data`.

**Spec:** `.../specs/2026-07-07-xanathar-design.md` · **Roadmap:** `.../plans/2026-07-07-xanathar-roadmap.md`

## Choices-alvo (ids/levels do PHB)

- Bardo `bard_college` (level 3) → `glamour`, `espadas`, `sussurros`
- Feiticeiro `sorcerous_origin` (level 1) → `alma-favorecida`, `adepto-das-sombras`, `feiticeiro-da-tempestade`
- Bruxo `patron` (level 1) → `celestial` (append à choice existente, ao lado de `hexblade`)
- Mago `arcane_tradition` (level 2) → `mago-de-guerra`

## Lista expandida do Celestial (slugs a conferir no catálogo)

`WARLOCK_PATRON_SPELLS.celestial` — tiers [1,3,5,7,9]:
```js
  celestial: [
    ['curar-ferimentos', 'raio-guiador'],      // 1 (Cure Wounds, Guiding Bolt)
    ['esfera-flamejante','restauracao-menor'], // 3 (Flaming Sphere, Lesser Restoration)
    ['luz-do-dia',       'revivificar'],        // 5 (Daylight, Revivify)
    ['guardiao-da-fe',   'muralha-de-fogo'],    // 7 (Guardian of Faith, Wall of Fire)
    ['coluna-de-chamas', 'restauracao-maior'],  // 9 (Flame Strike, Greater Restoration)
  ],
```

## Spike Alma Favorecida (Divine Soul)

`useClassSpells(classIndex, level, { extraClasses = [] } = {})` — a lista oferecida vira união de `classIndex` + `extraClasses`. Memo estável via `extraClasses.join(',')`. Call sites detectam Alma Favorecida:
- `Spells.jsx` (ficha): `character.info?.class === 'feiticeiro' && character.info?.chosenFeatures?.sorcerous_origin === 'alma-favorecida'` → `{ extraClasses: ['clerigo'] }`.
- `SpellsBlock.jsx` (wizard): `draft.class === 'feiticeiro' && draft.chosenFeatures?.sorcerous_origin === 'alma-favorecida'`.

O slug `alma-favorecida` é o MESMO no gate e na option (Task 1). A "afinidade" (magia bônus por alinhamento) fica descrita no card, não modelada como grant.

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `public/srd-data/xanathar-class-choices-pt.json` | + bardo/feiticeiro/mago + option celestial no bruxo |
| `src/systems/dnd5e/hooks/useClassSpells.js` | + `extraClasses` |
| `src/systems/dnd5e/components/CharacterSheet/Spells.jsx` | detecta Alma Favorecida |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/SpellsBlock.jsx` | detecta Alma Favorecida |
| `src/systems/dnd5e/domain/subclassSpells.js` | + `WARLOCK_PATRON_SPELLS.celestial` |
| `src/test/dnd5e/xanathar-subclasses-parse.test.js` | cresce + total 31 |
| `src/test/dnd5e/xanathar-subclass-spells.test.js` | + caso celestial |
| `src/test/useClassSpells-alma-favorecida.test.js` | **criar** (spike) |
| `vite.config.js` | bump v27 → v28 |

Seções do PDF (pág. pymupdf): Bardo p.10-12, Bruxo Celestial p.15-16, Feiticeiro p.31-33, Mago de Guerra p.44-45.

---

## Task 1: Spike Alma Favorecida + Feiticeiro (3 origens)

**Files:** `useClassSpells.js` (+ 2 call sites), `xanathar-class-choices-pt.json`, `useClassSpells-alma-favorecida.test.js` (criar), `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste do spike (falha)** — criar `src/test/useClassSpells-alma-favorecida.test.js` com mock próprio do provider (spells feiticeiro + clerigo):

```js
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClassSpells } from '../systems/dnd5e/hooks/useClassSpells'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({
    spells: [
      { index: 'bola-de-fogo', level: 3, classes: ['feiticeiro', 'mago'] },
      { index: 'curar-ferimentos', level: 1, classes: ['clerigo'] },
    ],
    levels: [{ class: { index: 'sorcerer' }, level: 3, spellcasting: { spell_slots_level_1: 4, spell_slots_level_2: 3, spell_slots_level_3: 2 } }],
    progression: {},
  }),
}))

describe('useClassSpells — Alma Favorecida', () => {
  it('sem extraClasses, feiticeiro não vê magia de clérigo', () => {
    const { result } = renderHook(() => useClassSpells('feiticeiro', 3))
    expect(result.current.classSpells.map(s => s.index)).toEqual(['bola-de-fogo'])
  })
  it('com extraClasses [clerigo], une as duas listas', () => {
    const { result } = renderHook(() => useClassSpells('feiticeiro', 3, { extraClasses: ['clerigo'] }))
    expect(result.current.classSpells.map(s => s.index).sort()).toEqual(['bola-de-fogo', 'curar-ferimentos'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** (o 2º caso: extraClasses ignorado).
- [ ] **Step 3: Implementar `useClassSpells`** — assinatura `(classIndex, level, { extraClasses = [] } = {})`; filtro `const accepted = [classIndex, ...extraClasses]; return allSpells.filter(s => accepted.some(c => s.classes?.includes(c)))`; memo key com `extraClasses.join(',')`.
- [ ] **Step 4: Rodar e ver passar** + `npx vitest run src/test/useClassSpells.test.js` (regressão: chamadas antigas sem 3º arg continuam).
- [ ] **Step 5: Wire call sites** — `Spells.jsx` e `SpellsBlock.jsx` calculam `extraClasses` (const `isAlmaFavorecida` conforme acima) e passam `useClassSpells(..., isAlmaFavorecida ? { extraClasses: ['clerigo'] } : undefined)`.
- [ ] **Step 6: Dados Feiticeiro** — chave `feiticeiro`, choice `sorcerous_origin` (level 1), 3 options parseáveis (desc do PDF). Teste de parse dos 3 (níveis 1/6/14/18):

```js
describe('origens XGE do feiticeiro', () => {
  const feit = choices.feiticeiro?.choices.find(c => c.id === 'sorcerous_origin')
  it.each([['alma-favorecida'], ['adepto-das-sombras'], ['feiticeiro-da-tempestade']])('%s parseia features em 1/6/14/18', (v) => {
    const opt = feit?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [1, 6, 14, 18]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 7: Rodar** parse + spellsFilters + wizardV2-SpellsBlock → PASS. Validar JSON.
- [ ] **Step 8: Commit** — `feat(xanathar): origens do feiticeiro + spike Alma Favorecida (lista de clerigo)`.

---

## Task 2: Bruxo — O Celestial (patrono + lista expandida)

**Files:** `xanathar-class-choices-pt.json` (append à choice `patron`), `subclassSpells.js`, `xanathar-subclass-spells.test.js`.

- [ ] **Step 1: Teste (falha)** — em `xanathar-subclass-spells.test.js`:

```js
describe('lista expandida do Celestial', () => {
  it('concede 2 magias/tier em 1/3/5/7/9, slugs no catálogo', () => {
    for (const lvl of [1, 3, 5, 7, 9]) {
      const r = getSubclassSpellsForLevel({ classIndex: 'bruxo', chosenFeatures: { patron: 'celestial' }, classLevel: lvl })
      expect(r.indices.length, `nv${lvl}`).toBe(2)
      expect(r.alwaysPrepared).toBe(true)
      for (const s of r.indices) expect(catalog.has(s), s).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — `WARLOCK_PATRON_SPELLS.celestial` (tabela acima); append da option `celestial` na choice `patron` do bruxo em `xanathar-class-choices-pt.json` (desc do PDF, features nv 1/6/10/14). O `PATRON_LABEL`/`PATRON_ICON` do `WarlockPactPanel` NÃO precisa de Celestial (não afeta arma de pacto), mas adicionar `celestial: 'O Celestial'` / `celestial: '😇'` mantém o painel informativo consistente.
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): patrono O Celestial + lista expandida`.

---

## Task 3: Bardo — Glamour, Espadas, Sussurros

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste (falha)** — parse dos 3 (níveis 3/6/14):

```js
describe('colégios XGE do bardo', () => {
  const bardo = choices.bardo?.choices.find(c => c.id === 'bard_college')
  it.each([['glamour'], ['espadas'], ['sussurros']])('%s parseia features em 3/6/14', (v) => {
    const opt = bardo?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 6, 14]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — chave `bardo`, choice `bard_college` (level 3), 3 options. Espadas: o Estilo de Luta (Duelo/Duas Armas) fica descrito no card (não é choice separada).
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): colegios do bardo (Glamour/Espadas/Sussurros)`.

---

## Task 4: Mago — Mago de Guerra

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste (falha)** — parse (níveis 2/6/10/14):

```js
describe('tradição XGE do mago', () => {
  const mago = choices.mago?.choices.find(c => c.id === 'arcane_tradition')
  it('mago-de-guerra parseia features em 2/6/10/14', () => {
    const opt = mago?.options.find(o => o.value === 'mago-de-guerra')
    expect(opt).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [2, 6, 10, 14]) expect(levels, `nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — chave `mago`, choice `arcane_tradition` (level 2), 1 option `mago-de-guerra`.
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): tradicao do mago (Mago de Guerra)`.

---

## Task 5: Total 31 + bump SW + verificação + merge

- [ ] **Step 1: Teste de contagem** — em `xanathar-subclasses-parse.test.js`, adicionar:

```js
it('as 31 subclasses do XGE estão presentes', () => {
  expect(subclassOptions.length).toBe(31)
})
```

(o `subclassOptions` já exclui `arcane_shots`/`eldritch_invocations` via NON_SUBCLASS.)

- [ ] **Step 2: Bump** `srd-data-v27` → `v28`.
- [ ] **Step 3: Suíte completa** — `npx vitest run` → PASS.
- [ ] **Step 4: Build** — `npx vite build`.
- [ ] **Step 5: Commit** — `chore(xanathar): bump cache srd-data v27->v28 (subclasses arcanas, 31/31)`.
- [ ] **Step 6: Merge + deploy** — merge `xanathar` na `master` + push.

## Self-review (cobertura da spec)

- 8 subclasses arcanas → Tasks 1-4; total 31 travado → Task 5.
- Celestial (GRUPO B) → Task 2.
- Alma Favorecida (lista de clérigo) → Task 1 spike, slug consistente nos 2 lugares.
- Bump SW → Task 5.
