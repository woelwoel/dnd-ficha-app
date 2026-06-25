# Subclasses de Tasha — Keystone + Bárbaro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a infra de merge multi-fonte de `classChoices` (que hoje colidiria via `Object.assign` raso) e prová-la entregando as subclasses **Caminho da Besta** e **Caminho da Magia Selvagem** do bárbaro, gateadas pela fonte `tasha`.

**Architecture:** Merge profundo por classe num módulo puro novo (`mergeClassChoices`), plugado no compositor do `SrdProvider`. Filtro de opções por fonte ativa num helper puro compartilhado (`filterChoiceBySources`), consumido tanto pelo wizard (`getLeveledChoices`) quanto pela ficha (`LevelUpPanel`). SourceBadge nos dois renderizadores de opção. Conteúdo do bárbaro vive em prosa por nível no `desc` (igual ao Berserker), sem magias concedidas.

**Tech Stack:** React, Vitest + @testing-library/react, JSON de dados em `public/srd-data`, Vite (PWA/Workbox).

**Spec:** `docs/superpowers/specs/2026-06-25-subclasses-tasha-barbaro-design.md`

**Comando de teste:** `npx vitest run <arquivo>` (rodar um arquivo) / `npx vitest run` (tudo).

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/systems/dnd5e/domain/mergeClassChoices.js` | Merge profundo de catálogos de class-choices por fonte | **Criar** |
| `src/systems/dnd5e/domain/sources.js` | + `filterChoiceBySources` (filtro de opções de 1 choice, preserva escolhido) | Modificar |
| `src/systems/dnd5e/data/SrdProvider.jsx` | Compositor passa a usar `mergeClassChoices` em `classChoices` | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js` | `getLeveledChoices` ganha `activeSources` + filtra opções | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/ClassBlock.jsx` | Recebe e repassa `activeSources` (primário + multiclasse) | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx` | Passa `activeSources` ao `ClassBlock` | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/hooks/useBlockStatus.js` | `getLeveledChoices` com `activeSources` do draft | Modificar |
| `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx` | Filtra `choicesForLevel` por fonte | Modificar |
| `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx` | SourceBadge na opção (wizard) | Modificar |
| `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpChoicePicker.jsx` | SourceBadge na opção (ficha) | Modificar |
| `public/srd-data/tasha-class-choices-pt.json` | + chave `barbaro` (Besta + Magia Selvagem + subescolha) | Modificar |
| `vite.config.js` | Bump `srd-data-v10` → `srd-data-v11` | Modificar |
| Vários `src/test/...` | Testes unit/componente/schema | Criar/Modificar |

**Limitação conhecida (fora de escopo):** o `LevelUpPanel` da ficha não aplica `requires` (subescolha condicional). Isso já vale hoje para o totem do PHB; a subescolha de Besta herda o mesmo comportamento. Gating por `requires` continua funcionando no wizard (via `getLeveledChoices`). Tratar `requires` na ficha é trabalho de outro sub-projeto.

---

## Task 1: Módulo puro `mergeClassChoices`

**Files:**
- Create: `src/systems/dnd5e/domain/mergeClassChoices.js`
- Test: `src/test/dnd5e/mergeClassChoices.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/test/dnd5e/mergeClassChoices.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const phb = {
  barbaro: {
    choices: [
      { level: 3, id: 'primal_path', featureName: 'Caminho Primitivo',
        options: [{ value: 'berserker', name: 'Berserker' }] },
    ],
  },
}
const tasha = {
  // classe só-Tasha
  artifice: { choices: [{ level: 3, id: 'spec', options: [{ value: 'alquimista', name: 'Alquimista' }] }] },
  // classe em colisão
  barbaro: {
    choices: [
      { level: 3, id: 'primal_path', options: [{ value: 'besta', name: 'Caminho da Besta' }] },
      { level: 3, id: 'barbaro_beast_form', requires: { primal_path: 'besta' },
        options: [{ value: 'mordida', name: 'Mordida' }] },
    ],
  },
}

describe('mergeClassChoices', () => {
  it('classe só-Tasha entra inteira com opções carimbadas', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    expect(out.artifice.choices[0].options[0]).toMatchObject({ value: 'alquimista', source: 'tasha' })
  })

  it('colisão de mesmo id concatena options e carimba só as de Tasha', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    const opts = out.barbaro.choices.find(c => c.id === 'primal_path').options
    expect(opts.map(o => o.value)).toEqual(['berserker', 'besta'])
    expect(opts.find(o => o.value === 'berserker').source).toBeUndefined()
    expect(opts.find(o => o.value === 'besta').source).toBe('tasha')
  })

  it('choice só-Tasha é anexado à classe existente', () => {
    const out = mergeClassChoices(phb, tasha, 'tasha')
    const beast = out.barbaro.choices.find(c => c.id === 'barbaro_beast_form')
    expect(beast).toBeTruthy()
    expect(beast.requires).toEqual({ primal_path: 'besta' })
    expect(beast.options[0].source).toBe('tasha')
  })

  it('não muta as entradas originais', () => {
    mergeClassChoices(phb, tasha, 'tasha')
    expect(phb.barbaro.choices[0].options).toHaveLength(1)
    expect(phb.barbaro.choices[0].options[0].source).toBeUndefined()
  })

  it('extra vazio devolve cópia equivalente do phb', () => {
    const out = mergeClassChoices(phb, {}, 'tasha')
    expect(out.barbaro.choices[0].options.map(o => o.value)).toEqual(['berserker'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/mergeClassChoices.test.js`
Expected: FAIL — `mergeClassChoices` não existe / "Failed to resolve import".

- [ ] **Step 3: Implementar**

Create `src/systems/dnd5e/domain/mergeClassChoices.js`:

```js
import { tagSource } from './sources'

/**
 * Mescla catálogos de class-choices de múltiplas fontes num único objeto.
 *
 * - Classe presente só na fonte extra (ex.: `artifice`) → entra inteira, com
 *   `options` carimbadas com `code`.
 * - Classe em colisão (ex.: `barbaro`) → para cada `choice` da fonte extra:
 *   se já existe `choice` de mesmo `id`, concatena as `options` (carimbadas);
 *   senão, anexa o `choice` inteiro.
 * - PHB nunca é carimbado: ausência de `source` numa opção = phb (básico).
 *
 * Pura: não muta `phb` nem `extra`. `tagSource` preserva `source` já presente.
 */
export function mergeClassChoices(phb, extra, code = 'tasha') {
  const out = {}
  for (const [cls, data] of Object.entries(phb ?? {})) {
    out[cls] = {
      ...data,
      choices: (data.choices ?? []).map(ch => ({ ...ch, options: [...(ch.options ?? [])] })),
    }
  }
  for (const [cls, data] of Object.entries(extra ?? {})) {
    const extraChoices = (data.choices ?? []).map(ch => ({
      ...ch,
      options: tagSource(ch.options ?? [], code),
    }))
    if (!out[cls]) {
      out[cls] = { ...data, choices: extraChoices }
      continue
    }
    for (const ech of extraChoices) {
      const existing = out[cls].choices.find(c => c.id === ech.id)
      if (existing) existing.options = [...existing.options, ...ech.options]
      else out[cls].choices.push(ech)
    }
  }
  return out
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/mergeClassChoices.test.js`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/mergeClassChoices.js src/test/dnd5e/mergeClassChoices.test.js
git commit -m "feat(dnd5e): mergeClassChoices — merge profundo de class-choices por fonte"
```

---

## Task 2: Plugar `mergeClassChoices` no SrdProvider

**Files:**
- Modify: `src/systems/dnd5e/data/SrdProvider.jsx` (import + estratégia de composição de `classChoices`)
- Test: `src/test/dnd5e/SrdProvider-composed.test.jsx` (estender)

- [ ] **Step 1: Escrever a asserção que falha**

Em `src/test/dnd5e/SrdProvider-composed.test.jsx`, troque o mock de `phb-class-choices` e `tasha-class-choices` para que **colidam** na classe `druida`, e adicione uma asserção de concatenação. Substitua as duas linhas do mock:

```js
      u.includes('phb-class-choices')       ? { druida: { choices: [{ level: 2, id: 'circle', options: [{ value: 'terra', name: 'Terra' }] }] } } :
      u.includes('tasha-class-choices')     ? { druida: { choices: [{ level: 2, id: 'circle', options: [{ value: 'estrelas', name: 'Estrelas' }] }] }, artifice: { choices: [] } } :
```

E adicione no `Probe` a leitura das opções do círculo do druida:

```jsx
      <div data-testid="druid-circle">
        {(classChoices?.druida?.choices?.[0]?.options ?? []).map(o => `${o.value}:${o.source ?? 'phb'}`).join(',')}
      </div>
```

E adicione uma asserção dentro do `waitFor`:

```js
      expect(screen.getByTestId('druid-circle').textContent).toBe('terra:phb,estrelas:tasha')
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/SrdProvider-composed.test.jsx`
Expected: FAIL — com `Object.assign` raso, `classChoices.druida` vira só a versão de Tasha (`estrelas`), então `druid-circle` não bate.

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/data/SrdProvider.jsx`:

3a. Adicionar o import no topo (logo após o import de `tagSource`):

```js
import { mergeClassChoices } from '../domain/mergeClassChoices'
```

3b. Trocar a entrada `classChoices` do `COMPOSED` (a `strategy` muda de `'object'` para `'classChoices'`):

```js
  classChoices: { strategy: 'classChoices', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha']] },
```

3c. Em `loadComposed`, antes do `if (def.strategy === 'array')`, adicionar o ramo novo:

```js
  if (def.strategy === 'classChoices') {
    const map = Object.fromEntries(loaded) // { phb: <obj>, tasha: <obj> }
    return mergeClassChoices(map.phb, map.tasha, 'tasha')
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/SrdProvider-composed.test.jsx`
Expected: PASS — `druid-circle` = `terra:phb,estrelas:tasha`, `choices` segue `artifice,druida`.

- [ ] **Step 5: Regressão do artífice**

Run: `npx vitest run src/test/dnd5e/artificer-integration.test.js src/test/dnd5e/tasha-artificer-schema.test.js`
Expected: PASS — artífice (classe só-Tasha) continua intacto.

- [ ] **Step 6: Commit**

```bash
git add src/systems/dnd5e/data/SrdProvider.jsx src/test/dnd5e/SrdProvider-composed.test.jsx
git commit -m "feat(dnd5e): SrdProvider compõe classChoices com merge profundo multi-fonte"
```

---

## Task 3: Helper puro `filterChoiceBySources`

**Files:**
- Modify: `src/systems/dnd5e/domain/sources.js`
- Test: `src/test/dnd5e/filterChoiceBySources.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/test/dnd5e/filterChoiceBySources.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { filterChoiceBySources } from '../../systems/dnd5e/domain/sources'

const choice = {
  id: 'primal_path',
  options: [
    { value: 'berserker', name: 'Berserker' },              // phb (sem source)
    { value: 'besta', name: 'Besta', source: 'tasha' },
    { value: 'magia-selvagem', name: 'Magia Selvagem', source: 'tasha' },
  ],
}

describe('filterChoiceBySources', () => {
  it('sem activeSources oferece só PHB', () => {
    const r = filterChoiceBySources(choice, {}, undefined)
    expect(r.options.map(o => o.value)).toEqual(['berserker'])
  })

  it('com tasha ativo oferece phb + tasha', () => {
    const r = filterChoiceBySources(choice, {}, ['tasha'])
    expect(r.options.map(o => o.value)).toEqual(['berserker', 'besta', 'magia-selvagem'])
  })

  it('preserva a opção já escolhida mesmo com a fonte desligada (valor string)', () => {
    const r = filterChoiceBySources(choice, { primal_path: 'besta' }, undefined)
    expect(r.options.map(o => o.value)).toEqual(['berserker', 'besta'])
  })

  it('preserva escolhidos em multiSelect array', () => {
    const multi = { id: 'manobras', options: choice.options }
    const r = filterChoiceBySources(multi, { manobras: ['besta'] }, undefined)
    expect(r.options.map(o => o.value)).toContain('besta')
  })

  it('preserva escolhidos em multiSelect string "a,b" (formato da ficha)', () => {
    const multi = { id: 'manobras', options: choice.options }
    const r = filterChoiceBySources(multi, { manobras: 'besta,magia-selvagem' }, undefined)
    expect(r.options.map(o => o.value)).toEqual(
      expect.arrayContaining(['berserker', 'besta', 'magia-selvagem']),
    )
  })

  it('não muta a choice original', () => {
    filterChoiceBySources(choice, {}, ['tasha'])
    expect(choice.options).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/filterChoiceBySources.test.js`
Expected: FAIL — `filterChoiceBySources` não exportado.

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/domain/sources.js`, adicionar ao final do arquivo:

```js
/**
 * Filtra as `options` de UMA choice pelas fontes ativas, SEMPRE preservando
 * a(s) opção(ões) já escolhida(s) em `chosenFeatures[choice.id]` — conteúdo já
 * escolhido nunca some, mesmo que a fonte tenha sido desligada depois.
 *
 * Aceita o valor escolhido como: string única, string "a,b" (multiSelect da
 * ficha) ou array (multiSelect do wizard). Pura: não muta `choice`.
 */
export function filterChoiceBySources(choice, chosenFeatures, activeSources) {
  if (!choice || !Array.isArray(choice.options)) return choice
  const offered = filterCatalogBySources(choice.options, activeSources)
  const raw = chosenFeatures?.[choice.id]
  const chosenVals = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.length
      ? raw.split(',').filter(Boolean)
      : raw != null && raw !== ''
        ? [raw]
        : []
  if (chosenVals.length === 0) return { ...choice, options: offered }
  const offeredSet = new Set(offered.map(o => o.value))
  const preserved = choice.options.filter(o => chosenVals.includes(o.value) && !offeredSet.has(o.value))
  return { ...choice, options: [...offered, ...preserved] }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/filterChoiceBySources.test.js`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/sources.js src/test/dnd5e/filterChoiceBySources.test.js
git commit -m "feat(dnd5e): filterChoiceBySources — filtra opções de choice por fonte, preserva escolhido"
```

---

## Task 4: `getLeveledChoices` ganha `activeSources`

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js`
- Test: `src/test/wizardV2-class-helpers.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Em `src/test/wizardV2-class-helpers.test.js`, dentro do `describe('getLeveledChoices', ...)`, adicionar:

```js
  it('filtra opções de subclasse pela fonte ativa', () => {
    const data = { choices: [
      { level: 3, id: 'primal_path', options: [
        { value: 'berserker', name: 'Berserker' },
        { value: 'besta', name: 'Besta', source: 'tasha' },
      ] },
    ] }
    const semTasha = getLeveledChoices(data, 5, {}, undefined)
    expect(semTasha[0].options.map(o => o.value)).toEqual(['berserker'])
    const comTasha = getLeveledChoices(data, 5, {}, ['tasha'])
    expect(comTasha[0].options.map(o => o.value)).toEqual(['berserker', 'besta'])
  })

  it('omite choice que fica sem opções e sem nada escolhido', () => {
    const data = { choices: [
      { level: 3, id: 'so_tasha', options: [{ value: 'x', name: 'X', source: 'tasha' }] },
    ] }
    expect(getLeveledChoices(data, 5, {}, undefined)).toHaveLength(0)
    expect(getLeveledChoices(data, 5, { so_tasha: 'x' }, undefined)).toHaveLength(1)
  })

  it('continua respeitando requires', () => {
    const data = { choices: [
      { level: 3, id: 'primal_path', options: [{ value: 'besta', name: 'Besta', source: 'tasha' }] },
      { level: 3, id: 'beast_form', requires: { primal_path: 'besta' },
        options: [{ value: 'mordida', name: 'Mordida', source: 'tasha' }] },
    ] }
    const semEscolha = getLeveledChoices(data, 5, {}, ['tasha'])
    expect(semEscolha.map(c => c.id)).toEqual(['primal_path'])
    const comEscolha = getLeveledChoices(data, 5, { primal_path: 'besta' }, ['tasha'])
    expect(comEscolha.map(c => c.id)).toEqual(['primal_path', 'beast_form'])
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/wizardV2-class-helpers.test.js`
Expected: FAIL — sem o 4º parâmetro, `semTasha[0].options` ainda traz `besta`.

- [ ] **Step 3: Implementar**

Em `src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js`:

3a. Adicionar o import no topo do arquivo:

```js
import { filterChoiceBySources } from '../../../domain/sources'
```

3b. Substituir a função `getLeveledChoices` inteira por:

```js
export function getLeveledChoices(classChoicesData, level, chosenFeatures = {}, activeSources) {
  return (classChoicesData?.choices ?? [])
    .filter(c => c.level <= level)
    .filter(c => {
      if (!c.requires) return true
      return Object.entries(c.requires).every(([k, v]) => chosenFeatures?.[k] === v)
    })
    .map(c => filterChoiceBySources(c, chosenFeatures, activeSources))
    .filter(c => (c.options?.length ?? 0) > 0)
    .sort((a, b) => a.level - b.level)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/wizardV2-class-helpers.test.js`
Expected: PASS — incluindo os testes antigos (dados PHB sem `source` continuam todos oferecidos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers.js src/test/wizardV2-class-helpers.test.js
git commit -m "feat(dnd5e): getLeveledChoices filtra opções por fonte ativa"
```

---

## Task 5: Plumbar `activeSources` no wizard (ClassBlock + status)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/ClassBlock.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/hooks/useBlockStatus.js`

> Sem teste novo dedicado aqui: é fiação. A cobertura vem do teste de componente (Task 7) e dos unit já escritos. Validação = render do wizard nos testes existentes não quebra.

- [ ] **Step 1: `ClassBlock` aceita e usa `activeSources`**

Em `ClassBlock.jsx`:

1a. Na desestruturação de props (linha ~18-21), adicionar `activeSources = ['phb'],`:

```js
export function ClassBlock({
  draft, updateDraft, classes, offeredClasses, classChoices = {}, classProgression = {}, feats = [],
  classEquipment = {}, weaponsArmor = {}, multiclassData = {}, activeSources = ['phb'],
}) {
```

1b. Na chamada do primário (linha ~75), passar `activeSources`:

```js
  const leveledChoices = getLeveledChoices(classChoices[draft.class], draft.level, draft.chosenFeatures, activeSources)
```

1c. Na chamada da multiclasse (linha ~205), passar `activeSources`:

```js
                const mcLeveledChoices = getLeveledChoices(
                  classChoices[mc.class],
                  mc.level,
                  mc.chosenFeatures ?? {},
                  activeSources,
                )
```

- [ ] **Step 2: `CharacterWizardV2` passa `activeSources` ao `ClassBlock`**

Em `CharacterWizardV2.jsx`, no render do `ClassBlock` (linha ~298-305), adicionar a prop (a const `activeSources` já existe na linha ~88):

```jsx
          <ClassBlock
            draft={draft} updateDraft={updateDraft}
            classes={classes ?? []} offeredClasses={offeredClasses}
            classChoices={classChoices ?? {}}
            classProgression={classProgression ?? {}} feats={feats ?? []}
            classEquipment={classEquipment ?? {}} weaponsArmor={weaponsArmor ?? {}}
            multiclassData={multiclassData ?? {}}
            activeSources={activeSources}
          />
```

- [ ] **Step 3: `useBlockStatus` usa `activeSources` do draft**

Em `useBlockStatus.js`, na linha ~32, passar as fontes do draft:

```js
      const leveledChoices = getLeveledChoices(classChoices?.[draft.class], draft.level ?? 1, draft.chosenFeatures, draft.settings?.sources ?? ['phb'])
```

- [ ] **Step 4: Rodar a suíte do wizard pra garantir que nada quebrou**

Run: `npx vitest run src/test/wizardV2-ClassBlock-multiclass.test.jsx src/test/wizardV2-class-helpers.test.js`
Expected: PASS — fiação não altera comportamento PHB.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/ClassBlock.jsx src/systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2.jsx src/systems/dnd5e/components/CharacterWizardV2/hooks/useBlockStatus.js
git commit -m "feat(dnd5e): plumbar activeSources no ClassBlock e status do wizard"
```

---

## Task 6: Filtrar opções por fonte na ficha (`LevelUpPanel`)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx`

> O `LevelUpPanel` já recebe `activeSources`. Falta aplicar o filtro às opções.

- [ ] **Step 1: Estender o import de `sources`**

Linha 7 — trocar:

```js
import { filterCatalogBySources } from '../../../domain/sources'
```

por:

```js
import { filterCatalogBySources, filterChoiceBySources } from '../../../domain/sources'
```

- [ ] **Step 2: Filtrar `choicesForLevel`**

Linha ~51 — trocar:

```js
  const choicesForLevel = (levelChoices ?? []).filter(c => c.level === nextLevel)
```

por:

```js
  const choicesForLevel = (levelChoices ?? [])
    .filter(c => c.level === nextLevel)
    .map(c => filterChoiceBySources(c, currentChosenFeatures, activeSources))
    .filter(c => (c.options?.length ?? 0) > 0)
```

- [ ] **Step 3: Rodar a suíte de level-up pra garantir que nada quebrou**

Run: `npx vitest run src/test/dnd5e`
Expected: PASS — nenhum teste de level-up depende de opção de Tasha; PHB intacto.

- [ ] **Step 4: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpPanel.jsx
git commit -m "feat(dnd5e): LevelUpPanel filtra opções de subclasse por fonte ativa"
```

---

## Task 7: SourceBadge nos renderizadores de opção

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx`
- Modify: `src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpChoicePicker.jsx`
- Test: `src/test/dnd5e/subclass-source-badge.test.jsx`

- [ ] **Step 1: Escrever o teste de componente que falha**

Create `src/test/dnd5e/subclass-source-badge.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChosenFeaturePicker } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker'

const choice = {
  id: 'primal_path',
  featureName: 'Caminho Primitivo',
  prompt: 'Escolha',
  options: [
    { value: 'berserker', name: 'Berserker' },
    { value: 'besta', name: 'Caminho da Besta', source: 'tasha' },
  ],
}

describe('ChosenFeaturePicker — SourceBadge', () => {
  it('mostra selo TCE na opção de Tasha e nada na de PHB', () => {
    render(<ChosenFeaturePicker choice={choice} value="" onChange={vi.fn()} />)
    expect(screen.getByText('Caminho da Besta')).toBeInTheDocument()
    // o selo TCE aparece exatamente uma vez (só na opção de Tasha)
    expect(screen.getAllByText('TCE')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/subclass-source-badge.test.jsx`
Expected: FAIL — nenhum `TCE` é renderizado.

- [ ] **Step 3: Implementar no `ChosenFeaturePicker`**

3a. Adicionar import no topo:

```js
import { SourceBadge } from '../../../SourceBadge'
```

3b. Na linha ~79, trocar:

```jsx
                <span className="font-display block">{opt.name}</span>
```

por:

```jsx
                <span className="font-display block">
                  {opt.name} <SourceBadge source={opt.source} />
                </span>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/subclass-source-badge.test.jsx`
Expected: PASS.

- [ ] **Step 5: Implementar no `LevelUpChoicePicker` (ficha)**

5a. Adicionar import no topo (após o import de `CantripsGrantPicker`):

```js
import { SourceBadge } from '../../SourceBadge'
```

5b. Na linha ~61 (ramo multi), trocar:

```jsx
                  <span className="font-semibold text-sm">{opt.name}</span>
```

por:

```jsx
                  <span className="font-semibold text-sm">{opt.name} <SourceBadge source={opt.source} /></span>
```

5c. Na linha ~86 (ramo single), trocar:

```jsx
                <span className="font-semibold text-sm">{opt.name}</span>
```

por:

```jsx
                <span className="font-semibold text-sm">{opt.name} <SourceBadge source={opt.source} /></span>
```

- [ ] **Step 6: Rodar a suíte da ficha pra garantir que nada quebrou**

Run: `npx vitest run src/test/dnd5e/subclass-source-badge.test.jsx src/test/dnd5e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx src/systems/dnd5e/components/CharacterSheet/levelProgression/LevelUpChoicePicker.jsx src/test/dnd5e/subclass-source-badge.test.jsx
git commit -m "feat(dnd5e): SourceBadge nas opções de subclasse (wizard + ficha)"
```

---

## Task 8: Dados — Bárbaro de Tasha

**Files:**
- Modify: `public/srd-data/tasha-class-choices-pt.json`
- Test: `src/test/dnd5e/tasha-barbaro-schema.test.js`

- [ ] **Step 1: Escrever o teste de schema que falha**

Create `src/test/dnd5e/tasha-barbaro-schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const data = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)

describe('tasha-class-choices — bárbaro', () => {
  it('tem a chave barbaro com o choice primal_path', () => {
    expect(data.barbaro).toBeTruthy()
    const primalPath = data.barbaro.choices.find(c => c.id === 'primal_path')
    expect(primalPath).toBeTruthy()
    expect(primalPath.options.map(o => o.value).sort()).toEqual(['besta', 'magia-selvagem'])
  })

  it('opções não carregam source no arquivo cru (carimbo é em runtime, igual ao artífice)', () => {
    // Convenção: tasha-class-choices NÃO grava `source`; o SrdProvider carimba
    // 'tasha' na composição via tagSource. Cobertura do carimbo runtime fica no
    // SrdProvider-composed.test. Aqui só garantimos que o arquivo segue a convenção.
    for (const cls of Object.values(data)) {
      for (const choice of cls.choices ?? []) {
        for (const opt of choice.options ?? []) {
          expect(opt.source).toBeUndefined()
        }
      }
    }
  })

  it('a subescolha Forma da Besta requer primal_path = besta e tem 3 armas naturais', () => {
    const beast = data.barbaro.choices.find(c => c.id === 'barbaro_beast_form')
    expect(beast.requires).toEqual({ primal_path: 'besta' })
    expect(beast.options.map(o => o.value).sort()).toEqual(['cauda', 'garras', 'mordida'])
  })

  it('values únicos dentro de cada choice e desc não-vazio', () => {
    for (const cls of Object.values(data)) {
      for (const choice of cls.choices ?? []) {
        const vals = (choice.options ?? []).map(o => o.value)
        expect(new Set(vals).size).toBe(vals.length)
        for (const opt of choice.options ?? []) {
          expect((opt.desc ?? '').length).toBeGreaterThan(20)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/tasha-barbaro-schema.test.js`
Expected: FAIL — `data.barbaro` é `undefined` (só existe `artifice`).

- [ ] **Step 3: Adicionar a chave `barbaro` ao JSON**

Em `public/srd-data/tasha-class-choices-pt.json`, adicionar a chave `"barbaro"` como nova propriedade do objeto raiz (irmã de `"artifice"`). O bloco abaixo é o conteúdo a inserir:

```json
"barbaro": {
  "choices": [
    {
      "level": 3,
      "id": "primal_path",
      "featureName": "Caminho Primitivo",
      "prompt": "Escolha seu Caminho Primitivo",
      "options": [
        {
          "value": "besta",
          "name": "Caminho da Besta",
          "combat": "essencial",
          "desc": "Caminho da Besta canaliza uma fera interior que se manifesta em armas naturais durante a Fúria.\n\nFeatures por nível:\n• Nv 3 — Forma da Besta: ao entrar em Fúria, você manifesta uma arma natural (escolha a cada Fúria; o padrão é escolhido aqui). Mordida (1d8 perfurante; ao acertar, recupera PV = metade do seu nível de bárbaro, 1×/turno), Garras (1d6 cortante; ao usar a ação de Ataque com elas, faz 1 ataque adicional de garra) ou Cauda (1d8 cortante, alcance 3m; como reação ao ser atingido, +1d8 na CA contra aquele ataque). As armas naturais contam como mágicas.\n• Nv 6 — Alma Bestial: suas armas naturais contam como mágicas para superar resistência. Ao terminar um descanso curto ou longo, ganha um benefício à escolha: nadar e respirar na água, escalar superfícies difíceis sem teste, ou saltar distâncias maiores.\n• Nv 10 — Fúria Infecciosa: ao acertar uma criatura com sua arma natural, pode forçá-la a um TR de Sabedoria (CD = 8 + mod. CON + proficiência). Falha: ela usa a reação para atacar outra criatura à sua escolha, ou sofre 2d12 de dano psíquico. Usos = mod. de Constituição por descanso longo.\n• Nv 14 — Convocar a Caçada: ao entrar em Fúria, até CHA criaturas à sua escolha a 9m ganham PV temporários e, 1×/turno, +1d6 de dano ao acertar um ataque enquanto você estiver enfurecido."
        },
        {
          "value": "magia-selvagem",
          "name": "Caminho da Magia Selvagem",
          "combat": "essencial",
          "desc": "Caminho da Magia Selvagem extrai magia caótica da própria Fúria, produzindo surtos imprevisíveis.\n\nFeatures por nível:\n• Nv 3 — Consciência Mágica: como ação, percebe magia, aberrações, celestiais, corruptores e elementais a 18m por 1 minuto (não através de cobertura total). Usos = bônus de proficiência por descanso longo. Surto Mágico: ao entrar em Fúria, role 1d8 na tabela de Surto Mágico — o efeito mágico aleatório dura enquanto a Fúria durar.\n• Nv 6 — Magia Reforçadora: como ação bônus, toca uma criatura (ou você) por 1 minuto. Ela ganha, à sua escolha: um dado extra ao recuperar um espaço de magia, OU +1d3 nas rolagens de ataque e testes de habilidade. Usos = bônus de proficiência por descanso longo.\n• Nv 10 — Reação Instável: enquanto enfurecido, ao sofrer dano, pode usar a reação para rolar na tabela de Surto Mágico e aplicar o efeito imediatamente.\n• Nv 14 — Surto Controlado: ao rolar Surto Mágico, role 2d8 e escolha qual dos dois resultados usar."
        }
      ]
    },
    {
      "level": 3,
      "id": "barbaro_beast_form",
      "featureName": "Forma da Besta (nv 3)",
      "prompt": "Escolha a arma natural que se manifesta ao entrar em Fúria",
      "requires": { "primal_path": "besta" },
      "options": [
        {
          "value": "mordida",
          "name": "Mordida",
          "desc": "1d8 de dano perfurante. Ao acertar no seu turno, recupera PV igual à metade do seu nível de bárbaro (arredondado pra baixo), 1×/turno. Útil para sustentar a linha de frente."
        },
        {
          "value": "garras",
          "name": "Garras",
          "desc": "1d6 de dano cortante. Quando usa a ação de Ataque com as garras, faz um ataque adicional de garra como parte da mesma ação. Melhor saída de dano por turno."
        },
        {
          "value": "cauda",
          "name": "Cauda",
          "desc": "1d8 de dano cortante com alcance de 3m. Como reação ao ser atingido por um ataque, adiciona 1d8 à sua CA contra aquele ataque (podendo transformar acerto em erro). Opção defensiva/alcance."
        }
      ]
    }
  ]
},
```

> **Atenção de sintaxe JSON:** inserir esse bloco ANTES da chave `"artifice"` (ou depois, com a vírgula no lugar certo). O objeto raiz deve permanecer JSON válido — sem vírgula sobrando após a última chave.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/tasha-barbaro-schema.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Validar JSON e regressão composta**

Run: `node -e "require('./public/srd-data/tasha-class-choices-pt.json'); console.log('JSON ok')"`
Expected: `JSON ok`

Run: `npx vitest run src/test/dnd5e/SrdProvider-composed.test.jsx src/test/dnd5e/tasha-artificer-schema.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/srd-data/tasha-class-choices-pt.json src/test/dnd5e/tasha-barbaro-schema.test.js
git commit -m "feat(dnd5e): subclasses de Tasha do bárbaro (Besta + Magia Selvagem)"
```

---

## Task 9: Bump do cache do SW + verificação final

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Bump do `cacheName` do srd-data**

Em `vite.config.js`, linha ~76, trocar:

```js
              cacheName: 'srd-data-v10',
```

por:

```js
              cacheName: 'srd-data-v11',
```

- [ ] **Step 2: Suíte completa**

Run: `npx vitest run`
Expected: PASS na suíte inteira (fora flakes conhecidos de timeout em `LoginScreen`/`ResetPasswordScreen`, documentados na memória — se aparecerem, re-rodar só esses arquivos).

- [ ] **Step 3: Build sanity**

Run: `npx vite build`
Expected: build conclui sem erro (gera `dist/`).

- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "chore(dnd5e): bump cache srd-data v10->v11 (barbaro Tasha)"
```

---

## Verificação manual (preview) sugerida após a Task 9

1. `npx vite` (ou o fluxo de preview do projeto).
2. Criar personagem Bárbaro nível 3 com Tasha **desligado** → Caminho Primitivo só mostra Berserker/Totem.
3. Ligar Tasha → aparecem Caminho da Besta e Caminho da Magia Selvagem com selo **TCE**.
4. Escolher Caminho da Besta → surge a subescolha "Forma da Besta (nv 3)" com Mordida/Garras/Cauda.
5. Desligar Tasha com Besta já escolhida → a opção escolhida permanece visível (não some).

---

## Self-review (cobertura do spec)

- Dados bárbaro (spec §1) → Task 8.
- Merge profundo (spec §2, A1) → Tasks 1–2.
- Filtro por fonte (spec §3, B1) → Tasks 3–6 (wizard helper + plumbing + ficha).
- SourceBadge (spec §4) → Task 7.
- Sem mudança de progressão (spec §5) → respeitado (nenhuma task toca progression).
- Cache do SW (spec §6/§7) → Task 9.
- Testes (spec) → cada task tem TDD; schema em Task 8; composto estendido em Task 2.
