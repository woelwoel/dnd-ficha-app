# Customizando sua Origem + Fundação de Idiomas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wirar a fundação de idiomas (base PHB que faltava — raça concede idiomas) e adicionar a regra opt-in do Tasha "Customizando sua Origem" (realocar aumentos de atributo e trocar idioma da raça), 100% aditiva e gateada pela fonte.

**Architecture:** Parte A usa os mapas `RACE_LANGUAGES`/`DND_LANGUAGES` que JÁ existem em `utils/calculations.js` (build popula `proficiencies.languages`; RaceBlock exibe + escolha extra). Parte B é opt-in via `meta.settings.flexibleRacialAsi` (já no schema; backend `computeRacialBonuses` já aplica `racialAsiOverride`): toggle no CampaignSetupModal gateado por Tasha + pickers no RaceBlock pra realocar atributos e trocar idioma.

**Tech Stack:** React + Vite, Vitest + @testing-library/react. Base: [spec](../specs/2026-06-24-customizando-origem-design.md).

**Fatos confirmados (não re-derivar):**
- `utils/calculations.js` já exporta `DND_LANGUAGES` (16) e `RACE_LANGUAGES` (mapa raça→idiomas fixos, 9 raças). **Nada de srd-data muda → SEM bump de SW.**
- `computeRacialBonuses(raceIndex, subraceIndex, races, { flexibleAsi, override })` (rules.js): se `flexibleAsi && override && soma≤3`, retorna `{ ...override }`; senão os bônus fixos. JÁ pronto.
- `meta.settings.flexibleRacialAsi` (boolean, default false) e `info.racialAsiOverride` (record, validação soma≤3) JÁ no `characterSchema.js`.
- `RaceBlock` (`components/CharacterWizardV2/blocks/RaceBlock.jsx`): handlers setam `draft.racialBonuses` via `computeBonuses(...)`; tem `draft.racialAbilityChoices`/`racialSkills`. Recebe `draft`/`updateDraft`/`races`.
- `build-character.js`: hoje grava `proficiencies.languages: []`. `draft.settings` vira `meta.settings` no build. `CampaignSetupModal` guarda allowFeats/sources em useState local → `onConfirm` → `initialSettings` → `useDraft`.
- `computeFinalAttributes(draft)` usa `draft.racialBonuses` pros atributos no Wizard.

---

## PARTE A — Fundação de idiomas (base, não-Tasha)

### Task A1: build-character popula idiomas da raça

**Files:**
- Modify: `src/utils/calculations.js` (adicionar `RACE_EXTRA_LANGUAGES`)
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js`
- Test: `src/test/dnd5e/race-languages-build.test.js`

- [ ] **Step 1: Teste que falha**

```js
// src/test/dnd5e/race-languages-build.test.js
import { describe, it, expect } from 'vitest'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const baseDraft = (over = {}) => ({
  ...INITIAL_DRAFT_V2, name: 'L', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  savingThrows: ['str', 'con'], ...over,
})
const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }

describe('build — idiomas da raça', () => {
  it('Anão recebe Comum + Anão em proficiencies.languages', () => {
    const c = buildCharacter(baseDraft({ race: 'anao' }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Anão']))
  })
  it('Humano recebe Comum + o idioma extra escolhido', () => {
    const c = buildCharacter(baseDraft({ race: 'humano', racialLanguages: ['Élfico'] }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Élfico']))
  })
  it('raça sem dados de idioma não quebra (lista vazia)', () => {
    const c = buildCharacter(baseDraft({ race: 'inexistente' }), guerreiro, {})
    expect(Array.isArray(c.proficiencies.languages)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar, ver falhar** — `npm test -- src/test/dnd5e/race-languages-build.test.js` (hoje languages = []).

- [ ] **Step 3: Implementar**
  - Em `calculations.js`, perto de `RACE_LANGUAGES`, adicionar:
    ```js
    /** Idiomas EXTRA à escolha concedidos por raça (PHB). Default 0. */
    export const RACE_EXTRA_LANGUAGES = { humano: 1, 'meio-elfo': 1 }
    ```
  - Em `build-character.js`, importar `RACE_LANGUAGES` de `../../../../utils/calculations` (confirmar o caminho relativo a partir de blocks/) e, onde monta `proficiencies`, trocar `languages: []` por:
    ```js
    languages: [...new Set([
      ...(RACE_LANGUAGES[draft.race] ?? []),
      ...(draft.racialLanguages ?? []),
    ])],
    ```

- [ ] **Step 4: Rodar, ver passar.** Regressão: `npm test -- src/test/ -t "build"`.

- [ ] **Step 5: Commit**
```bash
git add src/utils/calculations.js src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/test/dnd5e/race-languages-build.test.js
git commit -m "feat(dnd5e): build popula idiomas da raça (RACE_LANGUAGES) + escolha extra"
git push
```

### Task A2: RaceBlock exibe idiomas + escolha extra

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx`
- Test: `src/test/dnd5e/RaceBlock-languages.test.jsx`

- [ ] **Step 1: Teste que falha**

```jsx
// src/test/dnd5e/RaceBlock-languages.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RaceBlock } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock'

const races = [
  { index: 'anao', name: 'Anão', ability_bonuses: [{ ability: 'Constituição', bonus: 2 }], speed: 7.5, subraces: [] },
  { index: 'humano', name: 'Humano', ability_bonuses: [{ ability: 'Força', bonus: 1 }], speed: 9, subraces: [] },
]

describe('RaceBlock — idiomas', () => {
  it('Anão mostra os idiomas concedidos (Comum, Anão)', () => {
    render(<RaceBlock draft={{ race: 'anao' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/Comum/)).toBeInTheDocument()
    expect(screen.getByText(/Anão/)).toBeInTheDocument()
  })
  it('Humano oferece escolher 1 idioma extra e grava racialLanguages', () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={{ race: 'humano', racialLanguages: [] }} updateDraft={updateDraft} races={races} />)
    fireEvent.change(screen.getByLabelText(/Idioma extra/i), { target: { value: 'Élfico' } })
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({ racialLanguages: ['Élfico'] }))
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** — em `RaceBlock.jsx`:
  - Importar `RACE_LANGUAGES, DND_LANGUAGES, RACE_EXTRA_LANGUAGES` de `../../../../../utils/calculations` (confirmar profundidade).
  - Derivar: `const langs = RACE_LANGUAGES[draft.race] ?? []`; `const extraCount = RACE_EXTRA_LANGUAGES[draft.race] ?? 0`.
  - Renderizar (quando `draft.race`): um bloco "Idiomas" listando `langs` (read-only). Quando `extraCount > 0`, renderizar `extraCount` `<select aria-label="Idioma extra">` com `<option value="">—</option>` + `DND_LANGUAGES` que não estejam em `langs` nem já escolhidos; ao mudar, `updateDraft({ racialLanguages: [...] })` (array de tamanho ≤ extraCount).
  - Para `extraCount === 1`, um único select que grava `racialLanguages: [valor]` (ou `[]` se vazio).

- [ ] **Step 4: Rodar, ver passar.** Regressão `npm test -- src/test/ -t "RaceBlock"`.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx src/test/dnd5e/RaceBlock-languages.test.jsx
git commit -m "feat(dnd5e): RaceBlock exibe idiomas da raça + escolha de idioma extra"
git push
```

---

## PARTE B — Customizando sua Origem (Tasha, opt-in)

### Task B1: Toggle flexibleRacialAsi (gateado pela fonte) no CampaignSetupModal

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal.jsx`
- Test: `src/test/wizardV2-CampaignSetupModal.test.jsx` (estender)

- [ ] **Step 1: Ler** o `CampaignSetupModal.jsx` — ver como `allowFeats`/`sources` são `useState` locais e entram no objeto `settings` do `submit()`/`onConfirm`. Ver onde o "Caldeirão de Tasha" (sources) é alternado.

- [ ] **Step 2: Teste que falha** — estender `wizardV2-CampaignSetupModal.test.jsx`: com Tasha LIGADO nas fontes, aparece o checkbox "Customizando sua Origem"; ligá-lo faz `onConfirm` receber `settings.flexibleRacialAsi === true`. Com Tasha DESLIGADO, o checkbox NÃO aparece. (Espelhar o teste existente que verifica o objeto `settings` do onConfirm.)

- [ ] **Step 3: Implementar** — adicionar `const [flexibleRacialAsi, setFlexibleRacialAsi] = useState(false)`; renderizar o checkbox "Customizando sua Origem (realocar atributos/idioma)" **somente quando** a fonte Tasha está ativa no estado local de fontes; incluir `flexibleRacialAsi` no objeto `settings` montado no `submit()`. (Se Tasha for desligado depois de ligar o toggle, forçar `flexibleRacialAsi=false` ao montar settings.)

- [ ] **Step 4: Rodar** — `npm test -- src/test/wizardV2-CampaignSetupModal.test.jsx`. Passar.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterWizardV2/CampaignSetupModal.jsx src/test/wizardV2-CampaignSetupModal.test.jsx
git commit -m "feat(dnd5e): toggle Customizando sua Origem na criação (gateado pela fonte Tasha)"
git push
```

### Task B2: RaceBlock — realocar aumentos de atributo

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js` (mapear override)
- Test: `src/test/dnd5e/RaceBlock-flexible-asi.test.jsx`

- [ ] **Step 1: Teste que falha**

```jsx
// src/test/dnd5e/RaceBlock-flexible-asi.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RaceBlock } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock'

const races = [{ index: 'anao', name: 'Anão', ability_bonuses: [{ ability: 'Constituição', bonus: 2 }], speed: 7.5, subraces: [] }]

describe('RaceBlock — Customizando sua Origem (atributos)', () => {
  it('toggle OFF: não mostra realocação de atributos', () => {
    render(<RaceBlock draft={{ race: 'anao', settings: { flexibleRacialAsi: false } }} updateDraft={() => {}} races={races} />)
    expect(screen.queryByText(/Customizando sua Origem/i)).not.toBeInTheDocument()
  })
  it('toggle ON: distribuir +2/+1 grava racialAsiOverride e racialBonuses', () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={{ race: 'anao', settings: { flexibleRacialAsi: true }, racialAsiOverride: {} }} updateDraft={updateDraft} races={races} />)
    // UI: escolher modo +2/+1, atribuir +2 a Força e +1 a Destreza
    fireEvent.click(screen.getByLabelText(/\+2\/\+1/i))
    fireEvent.change(screen.getByLabelText(/Atributo \+2/i), { target: { value: 'str' } })
    fireEvent.change(screen.getByLabelText(/Atributo \+1/i), { target: { value: 'dex' } })
    const calls = updateDraft.mock.calls.map(c => c[0])
    const last = calls[calls.length - 1]
    expect(last.racialAsiOverride).toEqual({ str: 2, dex: 1 })
    expect(last.racialBonuses).toEqual({ str: 2, dex: 1 })
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar** — em `RaceBlock.jsx`, quando `draft.settings?.flexibleRacialAsi === true` e `draft.race`:
  - Renderizar um bloco "Customizando sua Origem" com escolha de modo (`+2/+1` ou `+1/+1/+1`) e selects de atributo (`str/dex/con/int/wis/cha`, distintos) com aria-labels "Atributo +2", "Atributo +1" (modo +2/+1) ou três "Atributo +1 (a/b/c)" (modo +1/+1/+1).
  - Ao completar uma distribuição válida, montar `override` (ex.: `{ str: 2, dex: 1 }`) e `updateDraft({ racialAsiOverride: override, racialBonuses: override })`. (No flexível, `racialBonuses` = override; o `computeFinalAttributes` já usa `racialBonuses`.)
  - Quando o toggle está ON, **ocultar/ignorar** o bloco de bônus fixos da raça (o override substitui). Distribuição incompleta/ inválida: não emitir override (mantém vazio).
  - Em `build-character.js`, incluir no `info` o `racialAsiOverride: draft.racialAsiOverride ?? undefined` (só quando flexível), pra persistir. (O `applyRacialChange` na ficha já lê `info.racialAsiOverride`.)

- [ ] **Step 4: Rodar, ver passar.** Regressão `npm test -- src/test/ -t "RaceBlock"` e `-t "build"`.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/test/dnd5e/RaceBlock-flexible-asi.test.jsx
git commit -m "feat(dnd5e): realocar aumentos de atributo da raça (Customizando sua Origem)"
git push
```

### Task B3: RaceBlock — trocar idioma da raça

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx`
- Modify: `src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js`
- Test: `src/test/dnd5e/race-language-swap.test.js`

- [ ] **Step 1: Teste que falha** (build aplica a troca)

```js
// src/test/dnd5e/race-language-swap.test.js
import { describe, it, expect } from 'vitest'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const draft = (over) => ({
  ...INITIAL_DRAFT_V2, name: 'L', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, savingThrows: ['str', 'con'], ...over,
})
const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }

describe('build — troca de idioma (Customizando sua Origem)', () => {
  it('substitui o idioma fixo pelo escolhido', () => {
    const c = buildCharacter(draft({ race: 'anao', settings: { flexibleRacialAsi: true }, racialLanguageOverride: { 'Anão': 'Dracônico' } }), guerreiro, {})
    expect(c.proficiencies.languages).toContain('Comum')
    expect(c.proficiencies.languages).toContain('Dracônico')
    expect(c.proficiencies.languages).not.toContain('Anão')
  })
  it('sem override (ou toggle off): mantém os idiomas fixos', () => {
    const c = buildCharacter(draft({ race: 'anao' }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Anão']))
  })
})
```

- [ ] **Step 2: Rodar, ver falhar.**

- [ ] **Step 3: Implementar**
  - Em `build-character.js`, ao montar `languages`, aplicar o override do idioma quando `draft.settings?.flexibleRacialAsi` e `draft.racialLanguageOverride`:
    ```js
    const baseLangs = RACE_LANGUAGES[draft.race] ?? []
    const swap = (draft.settings?.flexibleRacialAsi && draft.racialLanguageOverride) || {}
    const swapped = baseLangs.map(l => swap[l] ?? l)
    languages: [...new Set([...swapped, ...(draft.racialLanguages ?? [])])],
    ```
  - Em `RaceBlock.jsx`, quando `draft.settings?.flexibleRacialAsi` e há `langs`: pra cada idioma `fixed` (exceto o que não faz sentido trocar, mas mantenha simples — todos trocáveis), um `<select aria-label="Trocar <idioma>">` com `<option value="">(manter)</option>` + `DND_LANGUAGES`; ao escolher, `updateDraft({ racialLanguageOverride: { ...prev, [idioma]: novo } })` (ou remover a chave ao voltar pra "manter").

- [ ] **Step 4: Rodar, ver passar.** Regressão build/RaceBlock.

- [ ] **Step 5: Commit**
```bash
git add src/systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock.jsx src/systems/dnd5e/components/CharacterWizardV2/blocks/build-character.js src/test/dnd5e/race-language-swap.test.js
git commit -m "feat(dnd5e): trocar idioma da raça (Customizando sua Origem)"
git push
```

---

## Verificação final

- [ ] `npm test` — suíte inteira verde.
- [ ] `npm run build` — limpo (sem mudança de srd-data; sem bump de SW).
- [ ] `npm run dev` — **Tasha OFF**: criar ficha tem idiomas de raça (novo) mas SEM realocação/troca; atributos fixos como hoje. **Tasha ON + toggle ON**: realocar +2/+1 ou +1/+1/+1 e trocar idioma; ficha reflete. **Tasha ON + toggle OFF**: igual ao OFF.
- [ ] Invariante: com o toggle OFF, atributos e idiomas batem com a Parte A pura (nada de Tasha aplicado).

## Fora desta fase

- Realocar perícia/ferramenta da raça; trocar tipo de criatura / traços (Tasha).
- Gerenciar idioma/realocação na Ficha pós-criação (só no Wizard por ora).
