# Tasha — Features Opcionais de Classe (C1: infra + piloto) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o modelo de "feature opcional de Tasha" (opt-in que liga uma substituição ou uma adição) e prová-lo no Patrulheiro (2 substituições) + Druida (1 adição), com toggle na ficha, gating por fonte e sem virar pendência obrigatória.

**Architecture:** As features opcionais são entradas em `tasha-class-choices-pt.json` marcadas com `optional: true`. **Substituições** carregam `featureName` (nome da feature-base na progressão) e reusam o `resolveChosenFeature` já existente (troca name/desc da feature-base quando ligadas). **Adições** carregam `addsFeature: true` (sem feature-base) e são injetadas como card próprio. Um módulo de domínio puro (`optionalFeatures.js`) concentra a lógica testável; `FeaturesTab` ganha uma seção "Variantes de Tasha" com toggles e injeta as adições escolhidas. O wizard ignora choices `optional` (elas vivem só na ficha).

**Tech Stack:** React + Vite, Vitest (`npx vitest run <arquivo>`), dados em `public/srd-data/*.json`, service worker Workbox (cache `srd-data-vN` em `vite.config.js`).

---

## Contexto de arquivos (leia antes de começar)

- `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx` — renderiza features. `resolveChosenFeature` (l.289) já troca uma feature-base pela opção escolhida quando um choice tem `featureName === f.name`. `PendingChoicesSection` (l.315) lista escolhas obrigatórias incompletas. O `useMemo` principal (l.391) monta `classFeatures`, `subChoiceFeatures` (l.493, injeção de escolhas `requires`) e `enriched`.
- `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js` — `getLeveledChoices` (l.91) lista choices até o nível; alimenta o wizard e `useBlockStatus`.
- `src/systems/dnd5e/components/CharacterWizardV2/hooks/useBlockStatus.js:33` — `leveledChoices.every(c => isChoiceDone(...))`; é onde um choice opcional quebraria a conclusão do bloco de classe.
- `src/systems/dnd5e/domain/sources.js` — `filterChoiceBySources(choice, chosenFeatures, activeSources)` filtra `options` por fonte (PHB sempre incluso; já-escolhido preservado).
- `src/systems/dnd5e/domain/mergeClassChoices.js` — carimba `source:'tasha'` nas `options` de TODO choice extra (inclusive ids novos). **Não** grave `source` nem `optional` nas options no JSON cru; `optional` vai no choice.
- `activeSources` do personagem na ficha = `character.meta?.settings?.sources ?? ['phb']` (ver `LevelProgression.jsx:37`).
- `onSetChosenFeature(choiceId, value)` grava `chosenFeatures[choiceId]=value`; passar `''` desliga (resolveChosenFeature trata falsy como não-escolhido).
- Nomes-base exatos na progressão (`public/srd-data/phb-class-progression-pt.json`): Patrulheiro nv1 = `"Inimigo Favorito"`, `"Explorador Natural"`; Druida nv2 = `"Forma Selvagem"`.

---

## Task 1: Módulo de domínio `optionalFeatures.js`

**Files:**
- Create: `src/systems/dnd5e/domain/optionalFeatures.js`
- Test: `src/test/dnd5e/optional-features-domain.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/optional-features-domain.test.js
import { describe, it, expect } from 'vitest'
import {
  isOptionalChoice, isAdditionChoice, getOptionalVariants, getChosenAdditions,
} from '../../systems/dnd5e/domain/optionalFeatures'

// Simula choices JÁ mesclados (options carimbadas com source pelo mergeClassChoices)
const subst = {
  id: 'ranger_deft_explorer', featureName: 'Explorador Natural', optional: true, level: 1,
  options: [{ value: 'habil', name: 'Hábil', desc: 'x'.repeat(50), source: 'tasha' }],
}
const addition = {
  id: 'druid_wild_companion', addsFeature: true, optional: true, level: 2,
  options: [{ value: 'companheiro_animal', name: 'Companheiro Animal', desc: 'y'.repeat(50), category: 'magia', source: 'tasha' }],
}
const required = {
  id: 'ranger_archetype', featureName: 'Arquétipo do Patrulheiro', level: 3,
  options: [{ value: 'cacador', name: 'Caçador', desc: 'z'.repeat(50) }],
}
const clazz = { choices: [subst, addition, required] }

describe('optionalFeatures — classificadores', () => {
  it('isOptionalChoice só marca quem tem optional:true', () => {
    expect(isOptionalChoice(subst)).toBe(true)
    expect(isOptionalChoice(addition)).toBe(true)
    expect(isOptionalChoice(required)).toBe(false)
  })
  it('isAdditionChoice: adição é optional sem featureName (ou addsFeature)', () => {
    expect(isAdditionChoice(addition)).toBe(true)
    expect(isAdditionChoice(subst)).toBe(false)   // tem featureName → substituição
    expect(isAdditionChoice(required)).toBe(false)
  })
})

describe('getOptionalVariants — lista pro toggle, gated por fonte e nível', () => {
  it('com Tasha ativo, devolve as 2 opcionais até o nível', () => {
    const v = getOptionalVariants(clazz, 20, ['phb', 'tasha'])
    expect(v.map(c => c.id)).toEqual(['ranger_deft_explorer', 'druid_wild_companion'])
  })
  it('sem Tasha, options de tasha somem → nenhuma variante', () => {
    const v = getOptionalVariants(clazz, 20, ['phb'])
    expect(v).toHaveLength(0)
  })
  it('respeita o teto de nível', () => {
    const v = getOptionalVariants(clazz, 1, ['phb', 'tasha'])
    expect(v.map(c => c.id)).toEqual(['ranger_deft_explorer'])
  })
})

describe('getChosenAdditions — adições ligadas viram card', () => {
  it('devolve a adição escolhida com category da option', () => {
    const cards = getChosenAdditions(clazz, 20, { druid_wild_companion: 'companheiro_animal' })
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ name: 'Companheiro Animal', category: 'magia' })
  })
  it('substituições NÃO entram aqui (são tratadas por resolveChosenFeature)', () => {
    const cards = getChosenAdditions(clazz, 20, { ranger_deft_explorer: 'habil' })
    expect(cards).toHaveLength(0)
  })
  it('adição não-escolhida não vira card', () => {
    expect(getChosenAdditions(clazz, 20, {})).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/optional-features-domain.test.js`
Expected: FAIL — `optionalFeatures` não existe.

- [ ] **Step 3: Implementar o módulo**

```js
// src/systems/dnd5e/domain/optionalFeatures.js
/**
 * Features OPCIONAIS de classe (Caldeirão de Tasha).
 *
 * Uma feature opcional é uma escolha `optional: true` que o jogador liga/desliga
 * na ficha (default = desligada). Dois tipos:
 *  - SUBSTITUIÇÃO: carrega `featureName` (nome da feature-base na progressão).
 *    Quando ligada, `resolveChosenFeature` (FeaturesTab) troca name/desc da base.
 *  - ADIÇÃO: `addsFeature: true` (sem `featureName`). Quando ligada, é injetada
 *    como card próprio via `getChosenAdditions`.
 *
 * Módulo puro (sem React) para ser testável isoladamente.
 */
import { filterChoiceBySources } from './sources'

export function isOptionalChoice(choice) {
  return !!choice?.optional
}

/** Adição = opcional, sem feature-base pra trocar (addsFeature ou sem featureName). */
export function isAdditionChoice(choice) {
  return isOptionalChoice(choice) && (!!choice.addsFeature || !choice.featureName)
}

/**
 * Variantes opcionais oferecíveis pro toggle: optional, dentro do nível e com
 * pelo menos uma option de fonte ativa. `options` já vêm filtradas por fonte.
 */
export function getOptionalVariants(classChoicesForClass, level, activeSources) {
  return (classChoicesForClass?.choices ?? [])
    .filter(isOptionalChoice)
    .filter(c => (c.level ?? 0) <= level)
    .map(c => filterChoiceBySources(c, {}, activeSources))
    .filter(c => Array.isArray(c.options) && c.options.length > 0)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
}

/**
 * Adições LIGADAS, prontas pra virar card de feature. Substituições são
 * ignoradas aqui (quem as renderiza é o resolveChosenFeature).
 */
export function getChosenAdditions(classChoicesForClass, level, chosenFeatures = {}) {
  const out = []
  for (const c of classChoicesForClass?.choices ?? []) {
    if (!isAdditionChoice(c)) continue
    if ((c.level ?? 0) > level) continue
    const val = chosenFeatures?.[c.id]
    if (!val) continue
    const opt = (c.options ?? []).find(o => o.value === val)
    if (!opt) continue
    out.push({
      id: `${c.id}-${val}`,
      name: opt.name,
      desc: opt.desc,
      level: c.level,
      combat: opt.combat,
      category: opt.category,
      actionType: opt.actionType,
    })
  }
  return out
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/optional-features-domain.test.js`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/optionalFeatures.js src/test/dnd5e/optional-features-domain.test.js
git commit -m "feat(tasha): domínio de features opcionais (classificadores + seletores)"
```

---

## Task 2: Wizard ignora choices `optional` (anti-regressão)

`getLeveledChoices` alimenta o wizard e `useBlockStatus`. Sem este guard, um Patrulheiro com Tasha nunca completaria o bloco de classe (escolha opcional incompleta = `parcial`).

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js:91-101`
- Test: `src/test/dnd5e/leveled-choices-optional.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/leveled-choices-optional.test.js
import { describe, it, expect } from 'vitest'
import { getLeveledChoices } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'

const clazz = {
  choices: [
    { id: 'req', level: 1, options: [{ value: 'a', name: 'A' }] },
    { id: 'opt', level: 1, optional: true, options: [{ value: 'b', name: 'B', source: 'tasha' }] },
  ],
}

describe('getLeveledChoices ignora choices optional', () => {
  it('não devolve a escolha opcional mesmo com Tasha ativa', () => {
    const ids = getLeveledChoices(clazz, 5, {}, ['phb', 'tasha']).map(c => c.id)
    expect(ids).toEqual(['req'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/leveled-choices-optional.test.js`
Expected: FAIL — devolve `['req','opt']`.

- [ ] **Step 3: Adicionar o filtro em `getLeveledChoices`**

Em `class-helpers.js`, na função `getLeveledChoices`, adicione `.filter(c => !c.optional)` logo após o `.filter(c => c.level <= level)`:

```js
export function getLeveledChoices(classChoicesData, level, chosenFeatures = {}, activeSources) {
  return (classChoicesData?.choices ?? [])
    .filter(c => c.level <= level)
    .filter(c => !c.optional) // opcionais de Tasha vivem só na ficha, nunca no fluxo obrigatório do wizard
    .filter(c => {
      if (!c.requires) return true
      return Object.entries(c.requires).every(([k, v]) => chosenFeatures?.[k] === v)
    })
    .map(c => filterChoiceBySources(c, chosenFeatures, activeSources))
    .filter(c => !Array.isArray(c.options) || c.options.length > 0)
    .sort((a, b) => a.level - b.level)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/leveled-choices-optional.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js src/test/dnd5e/leveled-choices-optional.test.js
git commit -m "fix(tasha): wizard ignora choices optional (não viram pendência obrigatória)"
```

---

## Task 3: Dados — features opcionais do Patrulheiro e Druida + bump de cache

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json`
- Modify: `vite.config.js` (cache `srd-data-v13` → `v14`)
- Test: `src/test/dnd5e/tasha-optional-class-features.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// src/test/dnd5e/tasha-optional-class-features.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'
import { isOptionalChoice, isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'))
const prog = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-progression-pt.json'), 'utf-8'))

function choice(cls, id) {
  return tasha[cls]?.choices.find(c => c.id === id)
}
function baseFeatureNames(cls) {
  return (prog[cls]?.levels ?? []).flatMap(l => (l.features ?? []).map(f => f.name))
}

describe('Patrulheiro — substituições opcionais (Hábil, Inimigo Eleito)', () => {
  const CASOS = [
    { id: 'ranger_deft_explorer', featureName: 'Explorador Natural', value: 'habil', level: 1 },
    { id: 'ranger_favored_enemy_opt', featureName: 'Inimigo Favorito', value: 'inimigo_eleito', level: 1 },
  ]
  for (const { id, featureName, value, level } of CASOS) {
    it(`${id}: optional, com featureName que casa a feature-base e nível ${level}`, () => {
      const c = choice('patrulheiro', id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isOptionalChoice(c)).toBe(true)
      expect(isAdditionChoice(c)).toBe(false)
      expect(c.featureName).toBe(featureName)
      expect(c.level).toBe(level)
      expect(c.options.map(o => o.value)).toEqual([value])
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      // featureName precisa casar EXATAMENTE um nome na progressão, senão a troca não acontece
      expect(baseFeatureNames('patrulheiro')).toContain(featureName)
    })
  }
})

describe('Druida — adição opcional (Companheiro Animal)', () => {
  it('druid_wild_companion: optional + addsFeature, sem featureName, nível 2', () => {
    const c = choice('druida', 'druid_wild_companion')
    expect(c, 'druid_wild_companion ausente').toBeTruthy()
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.featureName).toBeUndefined()
    expect(c.level).toBe(2)
    expect(c.options.map(o => o.value)).toEqual(['companheiro_animal'])
    expect(c.options[0].category).toBe('magia')
  })
})

describe('options das opcionais NÃO gravam source no cru; merge carimba tasha', () => {
  it('cru sem source; mesclado com source tasha', () => {
    for (const id of ['ranger_deft_explorer', 'ranger_favored_enemy_opt']) {
      for (const o of choice('patrulheiro', id).options) expect(o.source).toBeUndefined()
    }
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const c = merged.patrulheiro.choices.find(x => x.id === 'ranger_deft_explorer')
    expect(c.options.every(o => o.source === 'tasha')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-class-features.test.js`
Expected: FAIL — choices ausentes.

- [ ] **Step 3: Adicionar os choices ao JSON**

Em `public/srd-data/tasha-class-choices-pt.json`, dentro do objeto da classe `patrulheiro`, no array `choices`, acrescente estes dois objetos (mantenha os existentes). Se a classe `patrulheiro` ainda não existir no arquivo, crie `"patrulheiro": { "choices": [ ... ] }`.

```json
{
  "id": "ranger_deft_explorer",
  "featureName": "Explorador Natural",
  "optional": true,
  "level": 1,
  "options": [
    {
      "value": "habil",
      "name": "Hábil",
      "desc": "Substitui Explorador Natural. Você é um explorador e sobrevivente inigualável, na natureza e ao lidar com pessoas. Você adquire o benefício Astuto e ganha benefícios adicionais no 6º e no 10º nível.\n\n• Astuto (nv 1): escolha uma de suas perícias proficientes; seu bônus de proficiência é dobrado em qualquer teste de habilidade que use essa perícia. Você também aprende dois idiomas adicionais à sua escolha.\n• Peregrino (nv 6): seu deslocamento de caminhada aumenta em 1,5 m, e você ganha deslocamento de escalada e natação iguais a esse deslocamento.\n• Incansável (nv 10): como uma ação, você ganha pontos de vida temporários iguais a 1d8 + seu modificador de Sabedoria (mínimo de 1). Pode usar um número de vezes igual ao seu bônus de proficiência, recuperando todos os usos em um descanso longo. Ao terminar um descanso curto, reduz seu nível de exaustão em 1."
    }
  ]
},
{
  "id": "ranger_favored_enemy_opt",
  "featureName": "Inimigo Favorito",
  "optional": true,
  "level": 1,
  "options": [
    {
      "value": "inimigo_eleito",
      "name": "Inimigo Eleito",
      "desc": "Substitui Inimigo Favorito (e interage com Matador de Inimigos). Quando você acerta uma criatura com uma jogada de ataque, pode invocar seu vínculo místico para marcá-la como seu inimigo favorito por 1 minuto ou até perder a concentração (como uma magia de concentração). Na primeira vez em cada um de seus turnos em que você acerta e causa dano ao alvo marcado — inclusive ao marcá-lo — o dano aumenta em 1d4 (1d6 no 6º nível, 1d8 no 14º). Você pode marcar um inimigo um número de vezes igual ao seu bônus de proficiência, recuperando todos os usos em um descanso longo."
    }
  ]
}
```

Dentro do objeto da classe `druida`, no array `choices`, acrescente:

```json
{
  "id": "druid_wild_companion",
  "addsFeature": true,
  "optional": true,
  "level": 2,
  "options": [
    {
      "value": "companheiro_animal",
      "name": "Companheiro Animal",
      "category": "magia",
      "desc": "Você adquire a habilidade de invocar um espírito em forma animal. Como uma ação, você pode gastar um uso de sua Forma Selvagem para conjurar a magia Convocar Familiar, sem componentes materiais. Conjurado assim, o familiar é uma fada (em vez de fera) e desaparece após um número de horas igual a metade do seu nível de druida."
    }
  ]
}
```

- [ ] **Step 4: Bump do cache do service worker**

Em `vite.config.js`, ache `cacheName: 'srd-data-v13'` e troque para `'srd-data-v14'`. (Mudou JSON em `public/srd-data` → cache precisa bumpar, senão o SW serve dado antigo.)

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/tasha-optional-class-features.test.js`
Expected: PASS. Se falhar por JSON inválido, valide com `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/tasha-class-choices-pt.json','utf-8'))"`.

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json vite.config.js src/test/dnd5e/tasha-optional-class-features.test.js
git commit -m "feat(tasha): features opcionais do Patrulheiro (Hábil, Inimigo Eleito) + Druida (Companheiro Animal)"
```

---

## Task 4: FeaturesTab — seção "Variantes de Tasha", injeção de adições, pendência só p/ obrigatórias

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx`

Quatro mudanças cirúrgicas. Não altere a lógica de combate/categoria existente.

- [ ] **Step 1: Importar o domínio**

Logo após o import de `featureCategories` (l.8-11), adicione:

```js
import { isOptionalChoice, getChosenAdditions, getOptionalVariants } from '../../domain/optionalFeatures'
```

- [ ] **Step 2: `PendingChoicesSection` ignora opcionais**

Em `PendingChoicesSection`, nos dois laços que montam `allEntries` (o da classe primária e o de multiclasses), pule choices opcionais. Troque:

```js
    for (const ch of classChoices?.[classIndex]?.choices ?? []) {
      allEntries.push({ choice: ch, scopeLevel: characterLevel, scopeLabel: null })
    }
```
por:
```js
    for (const ch of classChoices?.[classIndex]?.choices ?? []) {
      if (isOptionalChoice(ch)) continue // opcionais de Tasha não são pendência
      allEntries.push({ choice: ch, scopeLevel: characterLevel, scopeLabel: null })
    }
```

E no laço de multiclasses, troque:
```js
    for (const ch of classChoices?.[mc.class]?.choices ?? []) {
      allEntries.push({ choice: ch, scopeLevel: mc.level, scopeLabel: mc.class })
    }
```
por:
```js
    for (const ch of classChoices?.[mc.class]?.choices ?? []) {
      if (isOptionalChoice(ch)) continue
      allEntries.push({ choice: ch, scopeLevel: mc.level, scopeLabel: mc.class })
    }
```

- [ ] **Step 3: Injetar adições escolhidas como cards**

No `useMemo` principal, logo após o bloco que monta `subChoiceFeatures` e antes de `const classFeaturesAll = [...classFeatures, ...subChoiceFeatures]` (l.517), adicione a coleta das adições e inclua-a no array:

```js
    /* ── Adições opcionais de Tasha LIGADAS (sem feature-base; viram card) ── */
    const additionFeatures = getChosenAdditions(classChoices?.[classIndex], level, chosenFeatures)
      .map(f => ({ ...f, source: classData?.name ?? classIndex, placeholder: false }))

    const classFeaturesAll = [...classFeatures, ...subChoiceFeatures, ...additionFeatures]
```

(Substitui a linha `const classFeaturesAll = [...classFeatures, ...subChoiceFeatures]`.)

- [ ] **Step 4: Componente da seção de toggles**

Adicione este componente logo antes de `export function FeaturesTab` (depois de `PendingChoicesSection`):

```jsx
/* ══════════════════════════════════════════════════════════════════
   VARIANTES OPCIONAIS DE TASHA (opt-in: liga substituição ou adição)
   ══════════════════════════════════════════════════════════════════ */
function OptionalVariantsSection({ classIndex, level, activeSources, chosenFeatures, classChoices, onSetChosenFeature }) {
  const [openId, setOpenId] = useState(null)
  const variants = getOptionalVariants(classChoices?.[classIndex], level, activeSources)
  if (variants.length === 0) return null

  return (
    <section className="border border-indigo-700/50 bg-indigo-950/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden>✦</span>
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
          Variantes de Tasha <span className="text-indigo-500 font-normal normal-case">({variants.length})</span>
        </h3>
      </div>
      <p className="text-[13px] text-indigo-200/70 leading-relaxed">
        Características opcionais do Caldeirão de Tasha. Cada uma é liga/desliga — substituem ou
        adicionam uma característica. Combine com seu mestre antes de usar.
      </p>
      <div className="space-y-1.5">
        {variants.map(choice => {
          const opt = choice.options[0]
          const on = chosenFeatures?.[choice.id] === opt.value
          const isOpen = openId === choice.id
          return (
            <div key={choice.id} className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-800/60">
                <button onClick={() => setOpenId(isOpen ? null : choice.id)} className="flex items-center gap-2 min-w-0 text-left">
                  <span className="text-indigo-400 shrink-0">{isOpen ? '▾' : '▸'}</span>
                  <span className="text-sm font-semibold text-gray-100 truncate">{opt.name}</span>
                  <span className="text-xs text-gray-500 ml-1">Nv {choice.level}{choice.featureName ? ` · substitui ${choice.featureName}` : ' · adiciona'}</span>
                </button>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? 'Desligar' : 'Ligar'} ${opt.name}`}
                  onClick={() => onSetChosenFeature(choice.id, on ? '' : opt.value)}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-2 bg-gray-900/40">
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{opt.desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Renderizar a seção na vista Habilidades**

Na vista `activeFilter === 'habilidades'`, logo após o bloco `{onSetChosenFeature && (<PendingChoicesSection .../>)}` (l.678-687), adicione:

```jsx
          {onSetChosenFeature && (
            <OptionalVariantsSection
              classIndex={classIndex}
              level={level}
              activeSources={character.meta?.settings?.sources ?? ['phb']}
              chosenFeatures={info?.chosenFeatures ?? {}}
              classChoices={classChoices}
              onSetChosenFeature={onSetChosenFeature}
            />
          )}
```

- [ ] **Step 6: Verificar suíte + build**

Run: `npx vitest run src/test/dnd5e/optional-features-domain.test.js src/test/dnd5e/tasha-optional-class-features.test.js src/test/dnd5e/leveled-choices-optional.test.js`
Expected: PASS.

Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx
git commit -m "feat(tasha): seção Variantes de Tasha na ficha (toggle de substituição/adição)"
```

---

## Task 5: Verificação ponta-a-ponta + suíte cheia

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte cheia**

Run: `npx vitest run`
Expected: tudo verde (contagem ≥ a baseline atual + os novos testes). Se algum teste pré-existente quebrar por causa de novas choices, investigue antes de relaxar.

- [ ] **Step 2: Sanidade no preview (Patrulheiro com Tasha)**

Suba o preview, crie/abra um Patrulheiro nv 10 com Tasha ativo, vá em Habilidades:
- A seção "Variantes de Tasha" mostra Hábil e Inimigo Eleito.
- Ligar "Hábil" → o card de "Explorador Natural" vira "Explorador Natural: Hábil" com a descrição nova.
- Ligar "Inimigo Eleito" → "Inimigo Favorito" troca.
- Desligar volta ao PHB.
- Sem Tasha ativo, a seção some.
- O bloco de classe no wizard continua completando normalmente (sem pendência travada).

Para um Druida nv 2 com Tasha, ligar "Companheiro Animal" faz aparecer um card novo em Magia & Recursos.

- [ ] **Step 3: Atualizar memória**

Atualize `C:\Users\gvfar\.claude\projects\C--Users-gvfar-git-dnd-ficha-app\memory\project_tasha_fontes.md` registrando o sub-projeto C1 (modelo de feature opcional + piloto Patrulheiro/Druida, cache v13→v14), e que C2…Cn (fan-out por classe) seguem como dado.

---

## Self-review (cobertura do desenho)

- **Substituições (Patrulheiro)** → Task 3 (dados, featureName casa progressão) + reuso de `resolveChosenFeature` (sem código novo) + Task 4 (toggle).
- **Adições (Druida Companheiro Animal)** → Task 1 (`getChosenAdditions`) + Task 4 step 3 (injeção) + toggle.
- **Não virar pendência** → Task 4 step 2 (`PendingChoicesSection` pula optional).
- **Não quebrar wizard** → Task 2 (`getLeveledChoices` pula optional).
- **Gating por fonte** → Task 1 (`getOptionalVariants` via `filterChoiceBySources`) + Task 4 step 5 (passa `activeSources`).
- **UI de toggle** → Task 4 step 4-5 (`OptionalVariantsSection`).
- **Cache SW** → Task 3 step 4 (v13→v14).
- **Fora de escopo (declarado):** listas de magias expandidas; demais classes (C2…Cn); multiclasse para adições opcionais (só classe primária no C1).
