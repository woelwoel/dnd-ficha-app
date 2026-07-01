# Features de Subclasse por Nível + Rastreadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quebrar o blob de texto das features de subclasse em cards por nível na ficha, mandar ações de subclasse pra aba Combate, e gerar rastreadores de uso automáticos (padrões seguros) — para todas as ~70 subclasses (PHB + Tasha).

**Architecture:** Um novo módulo de domínio puro (`subclassFeatures.js`) parseia a `desc` da opção de subclasse (formato `• Nv N — Nome: desc`, 100% consistente) em features estruturadas e detecta usos limitados. A UI (`FeaturesTab`) consome isso para emitir cards por nível; `defaultClassFeatureUses` consome para emitir trackers no sistema de persistência/recarga existente.

**Tech Stack:** React, Vitest, JSON SRD em `public/srd-data`.

**Referência:** `docs/superpowers/specs/2026-06-30-features-subclasse-por-nivel-design.md`

---

## Fase 1 — Módulo de domínio `subclassFeatures.js` (puro, testado)

Sem integração com UI. Risco zero. Entrega o parser + detecção de usos + montagem de cards, tudo testável isoladamente.

### Task 1: `parseSubclassFeatures` — divide o blob em features por nível

**Files:**
- Create: `src/systems/dnd5e/domain/subclassFeatures.js`
- Test: `src/test/dnd5e/subclassFeatures-parse.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dnd5e/subclassFeatures-parse.test.js
import { describe, it, expect } from 'vitest'
import { parseSubclassFeatures } from '../../systems/dnd5e/domain/subclassFeatures'

describe('parseSubclassFeatures', () => {
  it('formato PHB limpo: bullets "Nv N — Nome: desc" viram features nomeadas', () => {
    const desc = [
      'Escola de Evocação — dano. Magos que destroem.',
      '',
      'Features por nível:',
      '• Nv 2 — Escriba Evocador: copiar magias de Evocação custa metade.',
      '• Nv 2 — Reformar Magia: protege aliados na área.',
      '• Nv 6 — Evocador Atento: soma mod. INT ao dano de uma criatura.',
      '• Nv 14 — Sobrecarga: 1×/desc. longo lança magia +2.',
    ].join('\n')
    const { summary, features } = parseSubclassFeatures(desc)
    expect(summary).toMatch(/Escola de Evocação/)
    expect(features).toHaveLength(4)
    expect(features[0]).toEqual({ level: 2, name: 'Escriba Evocador', desc: 'copiar magias de Evocação custa metade.' })
    expect(features[2]).toEqual({ level: 6, name: 'Evocador Atento', desc: 'soma mod. INT ao dano de uma criatura.' })
  })

  it('formato Tasha denso (sem "Nome:" curto): name = null, desc = bullet inteiro', () => {
    const desc = [
      'Algo nas profundezas fez um pacto com você.',
      'Features por nível:',
      '• Nv 1 — Lista Expandida de Magias (círculos 1–5). Tentáculo das Profundezas: ação bônus. Usos = bônus de proficiência.',
    ].join('\n')
    const { features } = parseSubclassFeatures(desc)
    expect(features).toHaveLength(1)
    expect(features[0].level).toBe(1)
    expect(features[0].name).toBeNull()
    expect(features[0].desc).toMatch(/Tentáculo das Profundezas/)
  })

  it('desc sem seção "Features por nível": features vazio, summary = tudo', () => {
    const { summary, features } = parseSubclassFeatures('Texto solto sem bullets.')
    expect(features).toEqual([])
    expect(summary).toBe('Texto solto sem bullets.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-parse.test.js`
Expected: FAIL — "parseSubclassFeatures is not a function" / módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/dnd5e/domain/subclassFeatures.js

/**
 * Parser das features de subclasse, que vivem como blob de texto na `desc` da
 * opção escolhida (formato `• Nv N — Nome: desc`, 100% consistente em PHB+Tasha).
 * Ver docs/superpowers/specs/2026-06-30-features-subclasse-por-nivel-design.md.
 */

/** Texto antes desta marca = flavor da subclasse; depois = bullets por nível. */
const SECTION_MARKER = /Features?\s+por\s+n[íi]vel\s*:?/i

// "Nv 6 — resto" / "Nível 6 - resto" (aceita travessão —, – ou -).
const BULLET_HEAD = /^N(?:v|ível)\s*(\d+)\s*[—–-]\s*([\s\S]*)$/i

// "Nome: desc" com Nome curto e sem ponto no meio (formato PHB limpo).
const NAMED = /^([^:.]{1,40}):\s*([\s\S]+)$/

export function parseSubclassFeatures(optionDesc = '') {
  const text = String(optionDesc)
  const m = text.match(SECTION_MARKER)
  const summary = (m ? text.slice(0, m.index) : text).trim()
  const body = m ? text.slice(m.index + m[0].length) : ''

  const features = []
  for (const chunk of body.split('•').map(s => s.trim()).filter(Boolean)) {
    const head = chunk.match(BULLET_HEAD)
    if (!head) continue
    const level = Number(head[1])
    const rest = head[2].trim()
    const named = rest.match(NAMED)
    if (named) {
      features.push({ level, name: named[1].trim(), desc: named[2].trim() })
    } else {
      features.push({ level, name: null, desc: rest })
    }
  }
  return { summary, features }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-parse.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/subclassFeatures.js src/test/dnd5e/subclassFeatures-parse.test.js
git commit -m "feat(subclass): parseSubclassFeatures divide blob em features por nivel"
```

---

### Task 2: Guard de cobertura — todas as 70 opções de subclasse parseiam

**Files:**
- Test: `src/test/dnd5e/subclassFeatures-coverage.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dnd5e/subclassFeatures-coverage.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseSubclassFeatures } from '../../systems/dnd5e/domain/subclassFeatures'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const SUB_IDS = new Set(['primal_path','bard_college','divine_domain','druid_circle',
  'martial_archetype','monastic_tradition','sacred_oath','ranger_archetype',
  'roguish_archetype','sorcerous_origin','arcane_tradition','patron','artificer_specialization'])

function subclassOptions() {
  const out = []
  for (const file of ['phb-class-choices-pt.json','tasha-class-choices-pt.json']) {
    const cat = read(file)
    for (const cls of Object.keys(cat))
      for (const ch of cat[cls].choices ?? [])
        if (SUB_IDS.has(ch.id))
          for (const o of ch.options ?? []) out.push({ cls, id: ch.id, value: o.value, desc: o.desc })
  }
  return out
}

describe('parseSubclassFeatures — cobertura das 70 opções reais', () => {
  it('toda opção de subclasse produz ≥1 feature sem desc vazia', () => {
    const bad = []
    for (const o of subclassOptions()) {
      const { features } = parseSubclassFeatures(o.desc)
      if (features.length === 0) { bad.push(`${o.cls}/${o.value}: 0 features`); continue }
      for (const f of features)
        if (!f.desc || !f.desc.trim() || !Number.isInteger(f.level) || f.level < 1 || f.level > 20)
          bad.push(`${o.cls}/${o.value}: feature inválida (nv ${f.level})`)
    }
    expect(bad).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails (ou expõe opções problemáticas)**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-coverage.test.js`
Expected: PASS se o parser cobre tudo; se FALHAR, a lista `bad` mostra exatamente quais opções têm formato divergente — ajustar os regexes da Task 1 (não os dados) até passar.

- [ ] **Step 3: (Se necessário) ajustar o parser**

Se alguma opção falhar, inspecionar a `desc` dela e generalizar `BULLET_HEAD`/`SECTION_MARKER` na Task 1. Não editar os JSONs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-coverage.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/test/dnd5e/subclassFeatures-coverage.test.js src/systems/dnd5e/domain/subclassFeatures.js
git commit -m "test(subclass): guard de que as 70 opcoes parseiam em features validas"
```

---

### Task 3: `detectFeatureUses` — rastreadores só de padrões seguros

**Files:**
- Modify: `src/systems/dnd5e/domain/subclassFeatures.js`
- Test: `src/test/dnd5e/subclassFeatures-uses.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dnd5e/subclassFeatures-uses.test.js
import { describe, it, expect } from 'vitest'
import { detectFeatureUses } from '../../systems/dnd5e/domain/subclassFeatures'

const ctx = { attributes: { cha: 16, int: 14 }, profBonus: 3 }

describe('detectFeatureUses — só padrões de alta confiança', () => {
  it('"Usos = bônus de proficiência" → max=prof, recarga conforme descanso citado', () => {
    expect(detectFeatureUses('Tentáculo. Usos = bônus de proficiência, recuperados num descanso longo.', ctx))
      .toEqual({ max: 3, recharge: 'long' })
  })
  it('"1×/descanso curto" → max=1, short', () => {
    expect(detectFeatureUses('Presença Feérica. 1×/descanso curto ou longo.', ctx))
      .toEqual({ max: 1, recharge: 'short' })
  })
  it('"uma vez ... descanso longo" → max=1, long', () => {
    expect(detectFeatureUses('Você pode fazer isso uma vez e recupera após um descanso longo.', ctx))
      .toEqual({ max: 1, recharge: 'long' })
  })
  it('"igual ao seu modificador de Carisma" (com "usos") → max=mod CHA', () => {
    expect(detectFeatureUses('Usos iguais ao seu modificador de Carisma, recupera em descanso longo.', ctx))
      .toEqual({ max: 3, recharge: 'long' })
  })
  it('NÃO dispara em "+bônus de proficiência de dano" (sem "usos =")', () => {
    expect(detectFeatureUses('Ira do Gênio: +bônus de proficiência de dano do tipo do gênio.', ctx)).toBeNull()
  })
  it('NÃO dispara em "1×/turno" nem texto sem uso', () => {
    expect(detectFeatureUses('Ao acertar 1×/turno, soma dano.', ctx)).toBeNull()
    expect(detectFeatureUses('Você ganha visão no escuro a 18 metros.', ctx)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-uses.test.js`
Expected: FAIL — "detectFeatureUses is not a function".

- [ ] **Step 3: Write minimal implementation (append ao módulo)**

```js
// src/systems/dnd5e/domain/subclassFeatures.js  (adicionar imports no topo + função)
import { getModifier, ATTR_NAME_TO_KEY } from '../../../utils/calculations'

const ATTR_PT = 'Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma'

/**
 * Detecta usos limitados a partir do texto da feature. Conservador de propósito:
 * só padrões de alta confiança; sem match → null (feature só-texto, sem tracker).
 */
export function detectFeatureUses(text = '', { attributes = {}, profBonus = 2 } = {}) {
  const t = String(text)
  // Recarga: "descanso curto" (inclui "curto ou longo") → short; senão long.
  const recharge = /descanso\s+curto/i.test(t) ? 'short' : 'long'
  // Indício de que o número é de USOS (e não dano/alcance/etc.).
  const isUses = /(usos?\s*=|usos?\s+iguais?|igual ao|vezes igual|uma vez)/i.test(t)

  // 1) bônus de proficiência usos
  if (isUses && /b[oô]nus\s+de\s+profici[êe]ncia/i.test(t)) {
    return { max: Math.max(1, profBonus), recharge }
  }
  // 2) "1×/descanso..." ou "uma vez ... descanso..."
  if (/1\s*[×x]\s*\/?\s*desc/i.test(t) || /uma vez[\s\S]*?descanso/i.test(t)) {
    return { max: 1, recharge }
  }
  // 3) modificador de atributo (com indício de usos)
  const mod = t.match(new RegExp(`m[oó]d(?:ificador)?\\.?\\s+(?:de\\s+)?(${ATTR_PT})`, 'i'))
  if (isUses && mod) {
    const name = mod[1].charAt(0).toUpperCase() + mod[1].slice(1).toLowerCase()
    const key = ATTR_NAME_TO_KEY[name]
    return { max: Math.max(1, getModifier(attributes?.[key] ?? 10)), recharge }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-uses.test.js`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/subclassFeatures.js src/test/dnd5e/subclassFeatures-uses.test.js
git commit -m "feat(subclass): detectFeatureUses para rastreadores seguros"
```

---

### Task 4: `getSubclassFeatureCards` — orquestra cards por nível com id estável

**Files:**
- Modify: `src/systems/dnd5e/domain/subclassFeatures.js`
- Test: `src/test/dnd5e/subclassFeatures-cards.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dnd5e/subclassFeatures-cards.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getSubclassFeatureCards, SUBCLASS_CHOICE_IDS } from '../../systems/dnd5e/domain/subclassFeatures'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const phb = read('phb-class-choices-pt.json')

describe('getSubclassFeatureCards', () => {
  it('expõe o conjunto de ids de choices de subclasse', () => {
    expect(SUBCLASS_CHOICE_IDS.has('arcane_tradition')).toBe(true)
    expect(SUBCLASS_CHOICE_IDS.has('patron')).toBe(true)
  })

  it('Mago Evocador nv5: mostra features de nv ≤5, esconde nv6+', () => {
    const cards = getSubclassFeatureCards({
      classIndex: 'mago',
      chosenFeatures: { arcane_tradition: 'evocacao' },
      classChoices: phb,
      level: 5,
      classLabel: 'Mago',
    })
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.every(c => c.level <= 5)).toBe(true)
    expect(cards.some(c => c.level === 6)).toBe(false)
    // id estável e único
    const ids = cards.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toMatch(/^mago-sub-evocacao-/)
    // source legível
    expect(cards[0].source).toBe('Mago · Evocação')
  })

  it('sem subclasse escolhida: nenhum card', () => {
    expect(getSubclassFeatureCards({
      classIndex: 'mago', chosenFeatures: {}, classChoices: phb, level: 10, classLabel: 'Mago',
    })).toEqual([])
  })

  it('fallback de nome usa "<rótulo da opção> (Nv N)" quando bullet é denso', () => {
    const tasha = read('tasha-class-choices-pt.json')
    const cards = getSubclassFeatureCards({
      classIndex: 'bruxo', chosenFeatures: { patron: 'insondavel' },
      classChoices: tasha, level: 1, classLabel: 'Bruxo',
    })
    expect(cards.length).toBeGreaterThan(0)
    expect(cards[0].name).toMatch(/\(Nv 1\)/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-cards.test.js`
Expected: FAIL — "getSubclassFeatureCards is not a function".

- [ ] **Step 3: Write minimal implementation (append ao módulo)**

```js
// src/systems/dnd5e/domain/subclassFeatures.js  (adicionar)

/** Ids de choices que representam SELEÇÃO de subclasse (PHB + Tasha + Artífice). */
export const SUBCLASS_CHOICE_IDS = new Set([
  'primal_path', 'bard_college', 'divine_domain', 'druid_circle',
  'martial_archetype', 'monastic_tradition', 'sacred_oath', 'ranger_archetype',
  'roguish_archetype', 'sorcerous_origin', 'arcane_tradition', 'patron',
  'artificer_specialization',
])

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * Cards de feature de subclasse da classe, até `level`. Lê a opção escolhida no
 * catálogo, parseia, filtra por nível e devolve cards com id estável e único.
 * @returns {Array<{id,name,desc,level,source}>}
 */
export function getSubclassFeatureCards({ classIndex, chosenFeatures, classChoices, level, classLabel }) {
  const choices = classChoices?.[classIndex]?.choices ?? []
  const out = []
  for (const ch of choices) {
    if (!SUBCLASS_CHOICE_IDS.has(ch.id)) continue
    const chosen = chosenFeatures?.[ch.id]
    if (!chosen) continue
    const opt = (ch.options ?? []).find(o => o.value === chosen)
    if (!opt) continue
    const { features } = parseSubclassFeatures(opt.desc)
    const seen = {}
    for (const f of features) {
      if (f.level > level) continue
      const name = f.name ?? `${opt.name} (Nv ${f.level})`
      let id = `${classIndex}-sub-${slug(chosen)}-${f.level}-${slug(name)}`
      if (seen[id]) id = `${id}-${(seen[id] += 1)}`   // desempate em colisão
      else seen[id] = 1
      out.push({ id, name, desc: f.desc, level: f.level, source: `${classLabel ?? classIndex} · ${opt.name}` })
    }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dnd5e/subclassFeatures-cards.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/subclassFeatures.js src/test/dnd5e/subclassFeatures-cards.test.js
git commit -m "feat(subclass): getSubclassFeatureCards com id estavel e filtro por nivel"
```

---

## Fase 2 — Exibição na ficha (cards por nível + aba Combate)

Resolve discoverability (Gap 2) e surfacing de ações de subclasse (Gap 3).

### Task 5: FeaturesTab emite cards de subclasse por nível

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx`
- Test: `src/test/FeaturesTab-subclass.test.jsx`

**Contexto da mudança** (em `FeaturesTab.jsx`, dentro do `useMemo`, ~linhas 453-584):
1. Importar `getSubclassFeatureCards` e `SUBCLASS_CHOICE_IDS` de `../../domain/subclassFeatures`.
2. Computar o conjunto de `featureName`s de subclasse da classe (e de cada multiclasse) — usados pra PULAR a feature de seleção no caminho antigo (anti-duplo-render).
3. No `.map` de `classFeatures` e `multiFeatures`, quando `f.name` for um featureName de subclasse, retornar `null` e filtrar (a feature vem agora dos cards parseados).
4. Adicionar `subclassCards` (primário) e por multiclasse a `classFeaturesAll`, com `combat: detectActionType(desc) ? 'essencial' : undefined` (mesmo critério dos traços raciais → ação detectada vai pra aba Combate).

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/FeaturesTab-subclass.test.jsx
// Segue o padrão de FeaturesTab-paladino-real.test.jsx: mocka useSrd com
// progressão + classChoices REAIS (sem SrdProvider/fetch).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeaturesTab } from '../systems/dnd5e/components/CharacterSheet/FeaturesTab'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import classChoices from '../../public/srd-data/phb-class-choices-pt.json'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({ progression, races: [], classChoices }),
  useLazySrdDataset: () => [],
}))

describe('FeaturesTab — features de subclasse por nível', () => {
  it('Mago Evocador nv10: features de subclasse aparecem como cards próprios (não um blob)', () => {
    const character = { info: { class: 'mago', level: 10, race: '', multiclasses: [], feats: [], chosenFeatures: { arcane_tradition: 'evocacao' } } }
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Evocador Atento (nv6) e Magia Empoderada (nv10) são passivas → aba Habilidades
    fireEvent.click(screen.getByText('Habilidades'))
    expect(screen.getByText(/Evocador Atento/)).toBeInTheDocument()   // nv6
    expect(screen.getByText(/Magia Empoderada/)).toBeInTheDocument()  // nv10
    // não deve existir um card único "Tradição Arcana: Evocação" (caminho antigo)
    expect(screen.queryByText(/Tradição Arcana: Evoca/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/FeaturesTab-subclass.test.jsx`
Expected: FAIL — hoje aparece o blob "Tradição Arcana: Evocação", não cards por nível.

- [ ] **Step 3: Implement — pular seleção + injetar cards**

Em `FeaturesTab.jsx`:

```jsx
// (topo) adicionar import
import { getSubclassFeatureCards, SUBCLASS_CHOICE_IDS } from '../../domain/subclassFeatures'
```

```jsx
// dentro do useMemo, ANTES de montar classFeatures:
const subclassFeatureNames = (ci) => new Set(
  (classChoices?.[ci]?.choices ?? [])
    .filter(ch => SUBCLASS_CHOICE_IDS.has(ch.id) && ch.featureName)
    .map(ch => ch.featureName)
)
const primarySubNames = subclassFeatureNames(classIndex)
```

```jsx
// no flatMap de classFeatures: pular a feature de SELEÇÃO de subclasse
const classFeatures = collapseScalingFeatures(levelsUpTo.flatMap(lvl =>
  (lvl.features ?? [])
    .filter(f => !primarySubNames.has(f.name))   // ← anti-duplo-render
    .map(f => { /* ...igual ao atual... */ })
))
```

```jsx
// idem em multiFeatures: const mcSubNames = subclassFeatureNames(mc.class)
// e .filter(f => !mcSubNames.has(f.name)) antes do .map
```

```jsx
// helper local para virar card de subclasse com tag de combate por heurística:
const toSubclassCard = (c) => ({
  ...c,
  combat: detectActionType(c.desc) !== null ? 'essencial' : undefined,
  placeholder: false,
})
const subclassCards = getSubclassFeatureCards({
  classIndex, chosenFeatures, classChoices, level, classLabel: classData?.name ?? classIndex,
}).map(toSubclassCard)
const multiSubclassCards = (info?.multiclasses ?? []).flatMap(mc =>
  getSubclassFeatureCards({
    classIndex: mc.class, chosenFeatures: mc.chosenFeatures ?? chosenFeatures,
    classChoices, level: mc.level, classLabel: progression?.[mc.class]?.name ?? mc.class,
  }).map(toSubclassCard)
)
```

```jsx
// incluir nos baldes:
const classFeaturesAll = [...classFeatures, ...subChoiceFeatures, ...additionFeatures, ...subclassCards]
// e adicionar ...multiSubclassCards junto de multiFeatures no enriched:
const enriched = [...classFeaturesAll, ...multiFeatures, ...multiSubclassCards].filter(f => !f.placeholder)
```

> `detectActionType` já está importado no arquivo. `classData`/`progression`/`info` já existem no escopo do useMemo. Manter `info?.chosenFeatures` nas deps (já está).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/FeaturesTab-subclass.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run regression on existing FeaturesTab tests**

Run: `npx vitest run src/test/FeaturesTab-combat.test.jsx src/test/FeaturesTab-paladino-real.test.jsx`
Expected: PASS (ajustar asserts SE algum esperava o blob antigo de subclasse — nesse caso, atualizar pro novo card por nível, documentando no commit).

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx src/test/FeaturesTab-subclass.test.jsx
git commit -m "feat(ficha): features de subclasse viram cards por nivel + acoes vao pra Combate"
```

---

### Task 6: Verificação visual no app (preview)

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o preview e abrir uma ficha com subclasse**

Seguir o workflow de preview do projeto. Abrir/!criar uma ficha de Mago Evocador nv10 (ou usar uma ficha existente com subclasse) e ir na aba Habilidades.

- [ ] **Step 2: Confirmar visualmente**

Esperado: "Evocador Atento (Nv 6)", "Magia Empoderada (Nv 10)" etc. aparecem como cards separados, cada um com seu nível; nenhum blob gigante. Tirar screenshot pro usuário.

- [ ] **Step 3: (sem commit — etapa de verificação)**

---

## Fase 3 — Rastreadores de subclasse (persistência + recarga)

Resolve Gap 1. Parte mais sensível (toca o sistema de `featureUses`). `defaultClassFeatureUses` ganha um 2º parâmetro opcional `classChoices`; quando presente, emite trackers de subclasse com o MESMO id dos cards.

### Task 7: `defaultClassFeatureUses(character, classChoices)` emite trackers de subclasse

**Files:**
- Modify: `src/systems/dnd5e/domain/rules.js` (função `defaultClassFeatureUses`, ~linha 781; import no topo ~linha 7)
- Test: `src/test/dnd5e/subclass-feature-uses-integration.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/test/dnd5e/subclass-feature-uses-integration.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const classChoices = { ...read('phb-class-choices-pt.json') }
// merge tasha (mesma união do app é suficiente p/ teste: só precisamos da chave bruxo)
Object.assign(classChoices, (() => {
  const t = read('tasha-class-choices-pt.json'); const out = { ...classChoices }
  for (const k of Object.keys(t)) {
    if (!out[k]) { out[k] = t[k]; continue }
    out[k] = { ...out[k], choices: [...out[k].choices] }
    for (const ech of t[k].choices) {
      const ex = out[k].choices.find(c => c.id === ech.id)
      if (ex) ex.options = [...ex.options, ...ech.options]; else out[k].choices.push(ech)
    }
  }
  return out
})())

describe('defaultClassFeatureUses + subclasse', () => {
  it('SEM classChoices: comportamento atual (nenhum tracker de subclasse)', () => {
    const char = { info: { class: 'bruxo', level: 6, chosenFeatures: { patron: 'insondavel' } }, attributes: { cha: 16 } }
    const uses = defaultClassFeatureUses(char)
    expect(uses.some(u => u.id.startsWith('bruxo-sub-insondavel'))).toBe(false)
  })

  it('COM classChoices: Bruxo Insondável nv6 ganha tracker do Tentáculo (prof usos)', () => {
    const char = { info: { class: 'bruxo', level: 6, chosenFeatures: { patron: 'insondavel' } }, attributes: { cha: 16 } }
    const uses = defaultClassFeatureUses(char, classChoices)
    const tentacle = uses.find(u => u.id.startsWith('bruxo-sub-insondavel-1'))
    expect(tentacle).toBeTruthy()
    expect(tentacle.max).toBe(3)        // prof nv6 = +3
    expect(tentacle.recharge).toBeDefined()
  })

  it('COM classChoices: Mago Evocador não ganha tracker fantasma', () => {
    const char = { info: { class: 'mago', level: 10, chosenFeatures: { arcane_tradition: 'evocacao' } }, attributes: { int: 16 } }
    const uses = defaultClassFeatureUses(char, classChoices)
    expect(uses.some(u => u.id.startsWith('mago-sub-evocacao'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/dnd5e/subclass-feature-uses-integration.test.js`
Expected: FAIL — o 2º teste falha (sem trackers de subclasse ainda).

- [ ] **Step 3: Implement**

Em `rules.js`, ajustar o import (~linha 7) e a função:

```js
// import (adicionar getProficiencyBonus e o módulo novo)
import { getModifier, getProficiencyBonus, SKILLS, calculateMaxHpFromHitDice, racialHpPerLevel } from '../../../utils/calculations'
import { getSubclassFeatureCards, detectFeatureUses } from './subclassFeatures'
```

```js
// assinatura
export function defaultClassFeatureUses(character, classChoices = null) {
```

```js
// DENTRO do loop `for (const { class: cls, level, chosen } of classes)`, ao final
// (depois dos blocos hardcoded existentes), adicionar:
    if (classChoices) {
      const profBonus = getProficiencyBonus(character.info?.level ?? level)
      const cards = getSubclassFeatureCards({
        classIndex: cls, chosenFeatures: chosen, classChoices, level,
        classLabel: cls,
      })
      for (const card of cards) {
        const u = detectFeatureUses(card.desc, { attributes: character.attributes ?? {}, profBonus })
        if (u) out.push({ id: card.id, name: card.name, max: u.max, used: 0, recharge: u.recharge, source: cls })
      }
    }
```

> `profBonus` vem do nível TOTAL do personagem (`character.info.level`), não do nível na classe — correto pra multiclasse. `cls` aqui já cobre primário + cada multiclasse (o loop itera os dois).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/dnd5e/subclass-feature-uses-integration.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Run regression on rules/featureUses tests**

Run: `npx vitest run src/test/dnd5e/ -t "featureUses" ; npx vitest run src/test/WarlockPactPanel.test.jsx`
Expected: PASS (a assinatura nova é retrocompatível — `classChoices` default null).

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/domain/rules.js src/test/dnd5e/subclass-feature-uses-integration.test.js
git commit -m "feat(ficha): defaultClassFeatureUses emite trackers de subclasse (opt-in via classChoices)"
```

---

### Task 8: Ligar `classChoices` no CharacterSheet e o gasto/recarga no SheetContent

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx` (~linha 125 e ~226)
- Modify: `src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx` (~linha 184-216, render do FeaturesTab)
- Modify: `src/hooks/useCharacter.js` (~445-462, `spendFeatureUse`/`regainFeatureUse`)
- Test: `src/test/useCharacter-featureuses.test.js` (criar se não existir cobertura)

**Por quê:** os trackers de subclasse só entram em `defaultClassFeatureUses` quando recebe `classChoices`. CharacterSheet (que tem `useSrd`) precisa passá-lo no memo de `featureUses`. E `spendFeatureUse`/`regainFeatureUse` (em `useCharacter`, sem SRD) re-derivam os defaults SEM classChoices — então passam a aceitar a lista já mesclada como argumento, fornecida pelo SheetContent (que tem `featureUses` em escopo). Assim o id do tracker de subclasse existe na lista no momento do gasto e persiste.

- [ ] **Step 1: Write the failing test**

```js
// src/test/useCharacter-featureuses.test.js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../hooks/useCharacter'

describe('useCharacter — spend/regain aceitam lista explícita', () => {
  it('spendFeatureUse(id, list) usa a lista passada e persiste o uso', () => {
    const base = { info: { class: 'bruxo', level: 6 }, combat: { classFeatureUses: [] }, attributes: {} }
    const { result } = renderHook(() => useCharacter(base))
    const list = [{ id: 'bruxo-sub-insondavel-1-x', name: 'Tentáculo', max: 3, used: 0, recharge: 'long', source: 'bruxo' }]
    act(() => result.current.spendFeatureUse('bruxo-sub-insondavel-1-x', list))
    const saved = result.current.character.combat.classFeatureUses.find(u => u.id === 'bruxo-sub-insondavel-1-x')
    expect(saved.used).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/useCharacter-featureuses.test.js`
Expected: FAIL — hoje `spendFeatureUse` ignora o 2º arg e re-deriva sem o id de subclasse, então `saved` é undefined.

- [ ] **Step 3: Implement — `useCharacter` aceita lista explícita**

Em `useCharacter.js`, trocar as duas closures:

```js
const spendFeatureUse = useCallback((id, list = null) => {
  setCharacter(prev => {
    const base = list ?? mergeFeatureUses(prev.combat?.classFeatureUses ?? [], defaultClassFeatureUses(prev))
    const next = base.map(u => u.id === id ? { ...u, used: Math.min(u.max, (u.used ?? 0) + 1) } : u)
    return { ...prev, combat: { ...prev.combat, classFeatureUses: next } }
  })
}, [setCharacter])

const regainFeatureUse = useCallback((id, list = null) => {
  setCharacter(prev => {
    const base = list ?? mergeFeatureUses(prev.combat?.classFeatureUses ?? [], defaultClassFeatureUses(prev))
    const next = base.map(u => u.id === id ? { ...u, used: Math.max(0, (u.used ?? 0) - 1) } : u)
    return { ...prev, combat: { ...prev.combat, classFeatureUses: next } }
  })
}, [setCharacter])
```

- [ ] **Step 4: Implement — CharacterSheet passa `classChoices`**

Em `CharacterSheet.jsx`:

```jsx
// ~linha 125: adicionar classChoices ao destructure do useSrd
const { races, classes, backgrounds, classChoices } = useSrd()
```

```jsx
// ~linha 225: memo de featureUses passa classChoices + dep
const featureUses = useMemo(
  () => mergeFeatureUses(character.combat?.classFeatureUses ?? [], defaultClassFeatureUses(character, classChoices)),
  [character, classChoices],
)
```

- [ ] **Step 5: Implement — SheetContent injeta a lista no spend/regain do FeaturesTab**

Em `SheetContent.jsx`, no render do `FeaturesTab` (~184-216), trocar `onSpend={spendFeatureUse}` / `onRegain={regainFeatureUse}` por wrappers que passam `featureUses`:

```jsx
onSpend={(id) => spendFeatureUse(id, featureUses)}
onRegain={(id) => regainFeatureUse(id, featureUses)}
// idem onSpendFeatureUse/onRegainFeatureUse no bloco de combate:
onSpendFeatureUse={(id) => spendFeatureUse(id, featureUses)}
onRegainFeatureUse={(id) => regainFeatureUse(id, featureUses)}
```

> `featureUses` já está destructurado no SheetContent (linha 85).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/test/useCharacter-featureuses.test.js`
Expected: PASS.

- [ ] **Step 7: Verificação visual (preview)**

Abrir ficha de Bruxo Insondável nv6+ → aba Recursos: deve aparecer "Tentáculo das Profundezas (Nv 1)" com 3 caixinhas; gastar 1 e confirmar que persiste; descanso longo recarrega. Screenshot pro usuário.

- [ ] **Step 8: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx src/hooks/useCharacter.js src/test/useCharacter-featureuses.test.js
git commit -m "feat(ficha): trackers de subclasse ligados (classChoices no memo + spend/regain com lista)"
```

---

### Task 9: Suíte completa + verificação final

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: tudo verde. Flakes de timeout pré-existentes (spells/rest/bestiary/wizardV2-*/character-list-mapa) — se aparecerem, rodar isolados pra confirmar que não são regressão (ver memória `tasha-fontes`).

- [ ] **Step 2: Lint dos arquivos tocados**

Run: `npx eslint src/systems/dnd5e/domain/subclassFeatures.js src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx src/systems/dnd5e/components/CharacterSheet/CharacterSheet.jsx src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx src/hooks/useCharacter.js src/systems/dnd5e/domain/rules.js`
Expected: sem erros novos.

- [ ] **Step 3: Build**

Run: `npx vite build`
Expected: build limpo. (Nenhuma mudança em `public/srd-data` → sem bump de cache SW.)

- [ ] **Step 4: Commit (se houver ajuste de lint)**

```bash
git add -A && git commit -m "chore(subclass): ajustes finais de lint da feature de cards por nivel"
```

---

## Notas de fechamento

- **Sem bump de cache SW:** nenhuma mudança em `public/srd-data` (só código).
- **Retrocompat:** `defaultClassFeatureUses(character)` sem 2º arg mantém o comportamento atual — protege qualquer caller/teste fora do CharacterSheet.
- **Limitações aceitas** (do spec): 1 card por nível em bullets densos de Tasha; tracker pega só o padrão dominante do nível; naming Tasha cai em "<Subclasse> (Nv N)"; recarga default `'long'` quando ambíguo.
- **Decisão de tier de combate:** features de subclasse com ação detectada por texto entram como `'essencial'`, espelhando a convenção já usada pros traços raciais sem tag.
