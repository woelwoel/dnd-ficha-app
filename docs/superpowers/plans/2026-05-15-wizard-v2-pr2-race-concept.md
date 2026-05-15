# Wizard V2 — PR 2: RaceBlock + ConceptBlock

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder "Em construção" dos blocos **Raça** e **Conceito** por componentes funcionais reais, validando o padrão de bloco que será replicado nas PRs seguintes.

**Architecture:** Cada bloco é um componente em `src/components/CharacterWizardV2/blocks/` que recebe `{ draft, updateDraft }` e renderiza dentro do `BlockEditorModal` do shell. Lógica pura de raça (cálculo de bônus etc.) extraída pra `race-helpers.js` testável. `useBlockStatus` ganha regras mais refinadas pra distinguir `parcial` de `completo`.

**Tech Stack:** React, Vitest + RTL, Tailwind (parchment/ink palette).

**Spec:** [`docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md`](../specs/2026-05-15-redesign-character-wizard-design.md)
**PR anterior:** PR 1 (shell + placeholders) — já em master.

---

## Visão geral do PR

Após esta PR, com `?v2=1`:
1. Clicar no card "Conceito" abre modal com 4 campos (nome, jogador, alinhamento, aparência); preencher nome marca o bloco como `completo`.
2. Clicar no card "Raça" abre modal com seletor de raça + sub-raça e todos os adicionais condicionais (ancestral dracônico, truque de mago, bônus livres, perícias raciais).
3. Status do card "Raça" é `parcial` quando faltam escolhas obrigatórias dependentes (ex: escolheu Draconato mas não escolheu ancestral); só vira `completo` quando todas as obrigatórias estão resolvidas.
4. Os outros 6 cards continuam mostrando "Em construção" (placeholder).

Wizard antigo continua intocado.

---

## Estrutura de arquivos

```
src/components/CharacterWizardV2/
├── CharacterWizardV2.jsx                 // MODIFICAR: trocar placeholder por blocos reais
├── blocks/
│   ├── ConceptBlock.jsx                  // novo (~80 linhas)
│   ├── RaceBlock.jsx                     // novo, composição (~120 linhas)
│   ├── race-helpers.js                   // novo, lógica pura (~80 linhas)
│   └── race/
│       ├── RacePicker.jsx                // novo (~80 linhas)
│       ├── DraconicAncestryPicker.jsx    // novo (~50 linhas)
│       ├── HighElfCantripPicker.jsx      // novo (~40 linhas)
│       ├── FreeAbilityPicker.jsx         // novo (~70 linhas)
│       ├── RacialSkillPicker.jsx         // novo (~70 linhas)
│       └── RaceBonusPreview.jsx          // novo (~50 linhas)
└── hooks/
    └── useBlockStatus.js                  // MODIFICAR: regras refinadas pra race

src/test/
├── wizardV2-ConceptBlock.test.jsx        // novo
├── wizardV2-RaceBlock.test.jsx           // novo
├── wizardV2-race-helpers.test.js         // novo
├── wizardV2-useBlockStatus.test.js       // MODIFICAR: novos casos para race parcial
└── e2e/
    └── wizardV2-shell.test.jsx            // MODIFICAR: novos asserts de blocos reais
```

**Total estimado:** ~700 linhas novas em 8 source files + 4 test files.

---

## Convenções

- Reusa tokens Tailwind do shell: `bg-parchment-50/100/200`, `border-parchment-600`, `text-ink-200/300/500`, `font-display tracking-widest`.
- Botões "?" de detalhes usam `DetailsModal` + `TopicList` que já existem em `src/components/`.
- Constantes de raça: `MAGO_CANTRIPS` lista (8 truques de mago em PT) e `DRACONIC_ANCESTORS` (já existe em `src/utils/draconicAncestors.js`).
- `ALIGNMENTS`, `ABILITY_SCORES`, `ABBR_TO_KEY`, `SKILLS` vêm de `src/utils/calculations.js` (já existentes).
- `git push origin HEAD` após cada commit.
- Cada arquivo abaixo de 200 linhas.

---

## Task 1: `ConceptBlock`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/ConceptBlock.jsx`
- Test: `src/test/wizardV2-ConceptBlock.test.jsx`

**Comportamento:**
- Props: `{ draft, updateDraft }`.
- 4 campos: Nome (obrigatório), Nome do Jogador (opcional), Alinhamento (select), Aparência (textarea).
- Cada campo aplica patch via `updateDraft({ [field]: value })`.
- Estilo parchment.

- [ ] **Step 1.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ConceptBlock.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConceptBlock } from '../components/CharacterWizardV2/blocks/ConceptBlock'

const emptyDraft = {
  name: '', playerName: '', alignment: '', appearance: '',
}

describe('ConceptBlock', () => {
  it('renderiza os 4 campos com valores do draft', () => {
    render(<ConceptBlock draft={{
      name: 'Heitor', playerName: 'Gabriel', alignment: 'Leal e Bom', appearance: 'alto',
    }} updateDraft={() => {}} />)
    expect(screen.getByLabelText(/nome do personagem/i)).toHaveValue('Heitor')
    expect(screen.getByLabelText(/nome do jogador/i)).toHaveValue('Gabriel')
    expect(screen.getByLabelText(/alinhamento/i)).toHaveValue('Leal e Bom')
    expect(screen.getByLabelText(/aparência/i)).toHaveValue('alto')
  })

  it('updateDraft é chamado ao digitar nome', async () => {
    const updateDraft = vi.fn()
    render(<ConceptBlock draft={emptyDraft} updateDraft={updateDraft} />)
    await userEvent.type(screen.getByLabelText(/nome do personagem/i), 'A')
    expect(updateDraft).toHaveBeenCalledWith({ name: 'A' })
  })

  it('updateDraft é chamado ao mudar alinhamento', async () => {
    const updateDraft = vi.fn()
    render(<ConceptBlock draft={emptyDraft} updateDraft={updateDraft} />)
    await userEvent.selectOptions(screen.getByLabelText(/alinhamento/i), 'Caótico e Bom')
    expect(updateDraft).toHaveBeenCalledWith({ alignment: 'Caótico e Bom' })
  })

  it('mostra hint de obrigatório quando nome está vazio', () => {
    render(<ConceptBlock draft={emptyDraft} updateDraft={() => {}} />)
    expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
  })

  it('NÃO mostra hint quando nome está preenchido', () => {
    render(<ConceptBlock draft={{ ...emptyDraft, name: 'Heitor' }} updateDraft={() => {}} />)
    expect(screen.queryByText(/nome é obrigatório/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 1.2: Rodar — esperado falhar**

```
npm test -- wizardV2-ConceptBlock
```

- [ ] **Step 1.3: Implementar `ConceptBlock.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/ConceptBlock.jsx
import { ALIGNMENTS } from '../../../utils/calculations'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300 placeholder:text-ink-200 placeholder:italic'

export function ConceptBlock({ draft, updateDraft }) {
  const nameMissing = !draft.name?.trim()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Nome do Personagem <span className="text-red-700">*</span>
        </label>
        <input
          type="text"
          value={draft.name ?? ''}
          onChange={e => updateDraft({ name: e.target.value })}
          placeholder="Ex: Thorin Ironforge"
          className={`${fieldCls} text-base font-display`}
          autoFocus
        />
        {nameMissing && (
          <p className="text-xs text-red-700 mt-1 italic">O nome é obrigatório.</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Nome do Jogador <span className="text-ink-200 normal-case lowercase">(opcional)</span>
        </label>
        <input
          type="text"
          value={draft.playerName ?? ''}
          onChange={e => updateDraft({ playerName: e.target.value })}
          placeholder="Seu nome real"
          className={fieldCls}
        />
      </div>

      <div>
        <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Alinhamento
        </label>
        <select
          value={draft.alignment ?? ''}
          onChange={e => updateDraft({ alignment: e.target.value })}
          className={fieldCls}
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Aparência <span className="text-ink-200 normal-case lowercase">(opcional)</span>
        </label>
        <textarea
          value={draft.appearance ?? ''}
          onChange={e => updateDraft({ appearance: e.target.value })}
          placeholder="Altura, olhos, marcas, estilo..."
          rows={3}
          className={`${fieldCls} resize-none`}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 1.4: Rodar — esperado passar (5/5)**

```
npm test -- wizardV2-ConceptBlock
```

- [ ] **Step 1.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/ConceptBlock.jsx src/test/wizardV2-ConceptBlock.test.jsx
git commit -m "feat(wizardV2): ConceptBlock com 4 campos (nome/jogador/alinhamento/aparência)"
git push origin HEAD
```

---

## Task 2: `race-helpers.js` (lógica pura)

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/race-helpers.js`
- Test: `src/test/wizardV2-race-helpers.test.js`

**Conteúdo:**
- Re-exporta `MAGO_CANTRIPS` (lista de 16 truques em PT, idêntica à do Step2Race antigo).
- `computeBonuses(race, subrace, freeChoices)` — função pura idêntica à do Step2Race antigo.
- `getRaceRequirements(draft, race, subrace)` — devolve `{ requires: { draconicAncestry: bool, highElfCantrip: bool, freeAbility: 0|2, racialSkills: 0|1|2, freeAbilityExclude: 'cha'|null } }` baseado na raça/subraça selecionada.

- [ ] **Step 2.1: Escrever testes failing**

```js
// src/test/wizardV2-race-helpers.test.js
import { describe, it, expect } from 'vitest'
import {
  MAGO_CANTRIPS, computeBonuses, getRaceRequirements,
} from '../components/CharacterWizardV2/blocks/race-helpers'

describe('MAGO_CANTRIPS', () => {
  it('lista 16 truques em português', () => {
    expect(MAGO_CANTRIPS).toHaveLength(16)
    expect(MAGO_CANTRIPS).toContain('Mãos Mágicas')
    expect(MAGO_CANTRIPS).toContain('Prestidigitação')
  })
})

describe('computeBonuses', () => {
  const race = { ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'CON', bonus: 1 }] }
  const subrace = { ability_bonuses: [{ ability: 'INT', bonus: 1 }] }

  it('soma bônus de raça e subraça', () => {
    expect(computeBonuses(race, subrace, [])).toEqual({ str: 2, con: 1, int: 1 })
  })

  it('ignora bônus com "escolha"', () => {
    const r = { ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: '2 à escolha', bonus: 1 }] }
    expect(computeBonuses(r, null, [])).toEqual({ str: 2 })
  })

  it('aplica freeChoices como +1 cada', () => {
    expect(computeBonuses(null, null, ['dex', 'wis'])).toEqual({ dex: 1, wis: 1 })
  })

  it('aceita race ou subrace null', () => {
    expect(computeBonuses(null, null, [])).toEqual({})
  })
})

describe('getRaceRequirements', () => {
  it('humano variante: 2 free abilities + 1 perícia', () => {
    const r = getRaceRequirements({ race: 'humano', subrace: 'tracos-raciais-alternativos' }, null, null)
    expect(r.freeAbility).toBe(2)
    expect(r.racialSkills).toBe(1)
    expect(r.freeAbilityExclude).toBeNull()
  })

  it('meio-elfo: 2 free abilities (exceto CHA) + 2 perícias', () => {
    const r = getRaceRequirements({ race: 'meio-elfo', subrace: '' }, null, null)
    expect(r.freeAbility).toBe(2)
    expect(r.racialSkills).toBe(2)
    expect(r.freeAbilityExclude).toBe('cha')
  })

  it('draconato: requer ancestral dracônico', () => {
    const r = getRaceRequirements({ race: 'draconato', subrace: '' }, null, null)
    expect(r.draconicAncestry).toBe(true)
  })

  it('alto-elfo: requer truque de mago', () => {
    const r = getRaceRequirements({ race: 'elfo', subrace: 'alto-elfo' }, null, null)
    expect(r.highElfCantrip).toBe(true)
  })

  it('raça simples (anão, halfling): zero requisitos extras', () => {
    const r = getRaceRequirements({ race: 'anao', subrace: '' }, null, null)
    expect(r.draconicAncestry).toBe(false)
    expect(r.highElfCantrip).toBe(false)
    expect(r.freeAbility).toBe(0)
    expect(r.racialSkills).toBe(0)
  })
})
```

- [ ] **Step 2.2: Rodar — esperado falhar**

```
npm test -- wizardV2-race-helpers
```

- [ ] **Step 2.3: Implementar `race-helpers.js`**

```js
// src/components/CharacterWizardV2/blocks/race-helpers.js
import { ABBR_TO_KEY } from '../../../utils/calculations'

export const MAGO_CANTRIPS = [
  'Amizade', 'Ataque Certeiro', 'Consertar', 'Espirro Ácido',
  'Globos De Luz', 'Ilusão Menor', 'Luz', 'Mensagem',
  'Mãos Mágicas', 'Prestidigitação', 'Proteção Contra Lâminas',
  'Raio De Fogo', 'Raio De Gelo', 'Rajada De Veneno',
  'Toque Arrepiante', 'Toque Chocante',
]

export function computeBonuses(race, subrace, freeChoices) {
  const map = {}
  const all = [
    ...(race?.ability_bonuses ?? []),
    ...(subrace?.ability_bonuses ?? []),
  ]
  for (const b of all) {
    if (b.ability.includes('escolha')) continue
    const key = ABBR_TO_KEY[b.ability]
    if (key) map[key] = (map[key] ?? 0) + b.bonus
  }
  for (const key of (freeChoices ?? [])) {
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}

/**
 * Devolve quais escolhas extras a combinação raça/subraça exige.
 * Independente de objetos do SRD — usa apenas os índices conhecidos.
 */
export function getRaceRequirements(draft, _race, _subrace) {
  const isHumanVariant = draft.subrace === 'tracos-raciais-alternativos'
  const isMeioElfo     = draft.race === 'meio-elfo'
  const isDraconato    = draft.race === 'draconato'
  const isAltoElfo     = draft.subrace === 'alto-elfo'

  return {
    draconicAncestry: isDraconato,
    highElfCantrip:   isAltoElfo,
    freeAbility:       isHumanVariant ? 2 : isMeioElfo ? 2 : 0,
    freeAbilityExclude: isMeioElfo ? 'cha' : null,
    racialSkills:      isHumanVariant ? 1 : isMeioElfo ? 2 : 0,
  }
}
```

- [ ] **Step 2.4: Rodar — esperado passar (10/10)**

```
npm test -- wizardV2-race-helpers
```

- [ ] **Step 2.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/race-helpers.js src/test/wizardV2-race-helpers.test.js
git commit -m "feat(wizardV2): race-helpers (computeBonuses, getRaceRequirements, MAGO_CANTRIPS)"
git push origin HEAD
```

---

## Task 3: Sub-pickers do RaceBlock

Vamos criar os 5 sub-componentes com TDD leve (1 teste por componente, validando o smoke + 1 interação chave).

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/race/RacePicker.jsx`
- Create: `src/components/CharacterWizardV2/blocks/race/DraconicAncestryPicker.jsx`
- Create: `src/components/CharacterWizardV2/blocks/race/HighElfCantripPicker.jsx`
- Create: `src/components/CharacterWizardV2/blocks/race/FreeAbilityPicker.jsx`
- Create: `src/components/CharacterWizardV2/blocks/race/RacialSkillPicker.jsx`
- Create: `src/components/CharacterWizardV2/blocks/race/RaceBonusPreview.jsx`
- Test: cada um terá um par de testes em `src/test/wizardV2-race-pickers.test.jsx`

- [ ] **Step 3.1: Escrever os testes do conjunto failing**

```jsx
// src/test/wizardV2-race-pickers.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RacePicker } from '../components/CharacterWizardV2/blocks/race/RacePicker'
import { DraconicAncestryPicker } from '../components/CharacterWizardV2/blocks/race/DraconicAncestryPicker'
import { HighElfCantripPicker } from '../components/CharacterWizardV2/blocks/race/HighElfCantripPicker'
import { FreeAbilityPicker } from '../components/CharacterWizardV2/blocks/race/FreeAbilityPicker'
import { RacialSkillPicker } from '../components/CharacterWizardV2/blocks/race/RacialSkillPicker'
import { RaceBonusPreview } from '../components/CharacterWizardV2/blocks/race/RaceBonusPreview'

const races = [
  { index: 'anao', name: 'Anão', subraces: [
    { index: 'anao-da-colina', name: 'Anão da Colina' },
    { index: 'anao-da-montanha', name: 'Anão da Montanha' },
  ] },
  { index: 'humano', name: 'Humano', subraces: [
    { index: 'tracos-raciais-alternativos', name: 'Variante' },
  ] },
]

describe('RacePicker', () => {
  it('lista raças no select e dispara onRaceChange', async () => {
    const onRaceChange = vi.fn()
    render(<RacePicker races={races} race="" subrace="" onRaceChange={onRaceChange} onSubraceChange={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^raça/i), 'humano')
    expect(onRaceChange).toHaveBeenCalledWith('humano')
  })

  it('mostra select de subraça quando raça com subraças está selecionada', () => {
    render(<RacePicker races={races} race="anao" subrace="" onRaceChange={() => {}} onSubraceChange={() => {}} />)
    expect(screen.getByLabelText(/sub-raça/i)).toBeInTheDocument()
  })
})

describe('DraconicAncestryPicker', () => {
  it('renderiza opções e dispara onChange', async () => {
    const onChange = vi.fn()
    render(<DraconicAncestryPicker value="" onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(5)
    await userEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalled()
  })
})

describe('HighElfCantripPicker', () => {
  it('renderiza select com truques de mago', async () => {
    const onChange = vi.fn()
    render(<HighElfCantripPicker value="" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Mãos Mágicas')
    expect(onChange).toHaveBeenCalledWith('Mãos Mágicas')
  })
})

describe('FreeAbilityPicker', () => {
  it('mostra contador atual/total e respeita limite', async () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <FreeAbilityPicker label="Escolha 2" count={2} chosen={[]} onToggle={onToggle} />
    )
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).toHaveBeenCalled()

    rerender(<FreeAbilityPicker label="Escolha 2" count={2} chosen={['str', 'dex']} onToggle={onToggle} />)
    expect(screen.getByText(/2\/2/)).toBeInTheDocument()
  })

  it('exclui atributo quando exclude prop fornecido', () => {
    render(<FreeAbilityPicker label="X" count={2} chosen={[]} exclude="cha" onToggle={() => {}} />)
    // 6 atributos - 1 excluído = 5 botões
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })
})

describe('RacialSkillPicker', () => {
  it('mostra contador e respeita limite', async () => {
    const onToggle = vi.fn()
    render(<RacialSkillPicker label="Escolha 1" count={1} chosen={[]} onToggle={onToggle} />)
    expect(screen.getByText(/0\/1/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onToggle).toHaveBeenCalled()
  })
})

describe('RaceBonusPreview', () => {
  it('renderiza chips de bônus', () => {
    render(<RaceBonusPreview bonuses={[
      { ability: 'FOR', bonus: 2 }, { ability: 'CON', bonus: 1 },
    ]} hasFreeChoice={false} />)
    expect(screen.getByText(/\+2 FOR/i)).toBeInTheDocument()
    expect(screen.getByText(/\+1 CON/i)).toBeInTheDocument()
  })

  it('mostra chip "+1 em 2 atributos à escolha" quando hasFreeChoice', () => {
    render(<RaceBonusPreview bonuses={[]} hasFreeChoice={true} />)
    expect(screen.getByText(/à escolha/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3.2: Rodar — esperado falhar**

```
npm test -- wizardV2-race-pickers
```

- [ ] **Step 3.3: Implementar `RacePicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/RacePicker.jsx
const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function RacePicker({ races, race, subrace, onRaceChange, onSubraceChange }) {
  const selectedRace = races.find(r => r.index === race)
  const hasSubraces = (selectedRace?.subraces?.length ?? 0) > 0
  const optional = selectedRace?.optionalSubrace

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Raça <span className="text-red-700">*</span>
        </label>
        <select
          value={race}
          onChange={e => onRaceChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher raça...</option>
          {races.map(r => (
            <option key={r.index} value={r.index}>{r.name}</option>
          ))}
        </select>
      </div>

      {hasSubraces && (
        <div>
          <label className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Sub-raça {optional
              ? <span className="text-ink-200 normal-case lowercase">(opcional)</span>
              : <span className="text-red-700">*</span>}
          </label>
          <select
            value={subrace}
            onChange={e => onSubraceChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">{optional ? 'Nenhuma (raça base)' : 'Escolher sub-raça...'}</option>
            {selectedRace.subraces.map(sr => (
              <option key={sr.index} value={sr.index}>{sr.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.4: Implementar `DraconicAncestryPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/DraconicAncestryPicker.jsx
import { DRACONIC_ANCESTORS } from '../../../../utils/draconicAncestors'

export function DraconicAncestryPicker({ value, onChange }) {
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        Ancestral Dracônico <span className="text-red-700">*</span>
      </legend>
      <p className="text-[11px] italic text-ink-300 mb-2">
        Define seu tipo de dragão, dano de sopro e resistência.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {DRACONIC_ANCESTORS.map(a => {
          const sel = value === a.value
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => onChange(a.value)}
              className={[
                'text-left px-2.5 py-2 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className="font-display block">{a.label}</span>
              <span className="text-[10px] text-ink-200">{a.damage} · {a.breath} (TR {a.save})</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 3.5: Implementar `HighElfCantripPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/HighElfCantripPicker.jsx
import { MAGO_CANTRIPS } from '../race-helpers'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function HighElfCantripPicker({ value, onChange }) {
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        Truque de Mago <span className="text-red-700">*</span>
      </legend>
      <p className="text-[11px] italic text-ink-300 mb-2">
        Você conhece 1 truque do Mago (Inteligência como atributo de conjuração).
      </p>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={fieldCls}
      >
        <option value="">Escolher truque...</option>
        {MAGO_CANTRIPS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </fieldset>
  )
}
```

- [ ] **Step 3.6: Implementar `FreeAbilityPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/FreeAbilityPicker.jsx
import { ABILITY_SCORES } from '../../../../utils/calculations'

export function FreeAbilityPicker({ label, count, chosen, exclude, onToggle }) {
  const atLimit = chosen.length >= count
  const visible = ABILITY_SCORES.filter(a => a.key !== exclude)

  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        {label}{' '}
        <span className={atLimit ? 'text-emerald-700' : 'text-amber-700'}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-700 ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {visible.map(({ key, name, abbr }) => {
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={[
                'px-2 py-2 rounded-sm border-2 text-xs text-center transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className="font-display block">{abbr}</span>
              <span className="text-[10px] text-ink-200">{name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 3.7: Implementar `RacialSkillPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/RacialSkillPicker.jsx
import { SKILLS } from '../../../../utils/calculations'

export function RacialSkillPicker({ label, count, chosen, onToggle }) {
  const atLimit = chosen.length >= count
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        {label}{' '}
        <span className={atLimit ? 'text-emerald-700' : 'text-amber-700'}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-700 ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {SKILLS.map(({ key, name }) => {
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={[
                'flex items-center gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className={[
                'w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center',
                sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
              ].join(' ')}>
                {sel && <span className="text-parchment-50 text-[8px]">✓</span>}
              </span>
              {name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 3.8: Implementar `RaceBonusPreview.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/race/RaceBonusPreview.jsx
export function RaceBonusPreview({ bonuses, hasFreeChoice }) {
  if (!bonuses?.length && !hasFreeChoice) return null
  return (
    <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
        Bônus de atributo (aplicados):
      </p>
      <div className="flex flex-wrap gap-2">
        {bonuses.map((b, i) => (
          <span key={i} className="text-xs font-display bg-parchment-200 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500">
            +{b.bonus} {b.ability}
          </span>
        ))}
        {hasFreeChoice && (
          <span className="text-xs italic bg-parchment-50 border-2 border-dashed border-ink-300 px-2.5 py-1 rounded-sm text-ink-300">
            +1 em 2 atributos à escolha
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3.9: Rodar todos os testes do conjunto — esperado passar (10/10)**

```
npm test -- wizardV2-race-pickers
```

- [ ] **Step 3.10: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/race/ src/test/wizardV2-race-pickers.test.jsx
git commit -m "feat(wizardV2): 6 sub-pickers do RaceBlock (race, ancestry, cantrip, ability, skill, preview)"
git push origin HEAD
```

---

## Task 4: `RaceBlock` (composição)

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/RaceBlock.jsx`
- Test: `src/test/wizardV2-RaceBlock.test.jsx`

**Comportamento:**
- Props: `{ draft, updateDraft, races }`.
- Usa `RacePicker` + sub-pickers + `RaceBonusPreview`.
- Wire dos handlers: trocar raça reseta sub-raça e escolhas; trocar sub-raça reseta apenas as escolhas dependentes.
- Calcula bônus combinados via `computeBonuses` toda vez que muda algo.
- Chama `getRaceRequirements` pra decidir quais sub-pickers renderizar.

- [ ] **Step 4.1: Escrever testes failing**

```jsx
// src/test/wizardV2-RaceBlock.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaceBlock } from '../components/CharacterWizardV2/blocks/RaceBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const races = [
  { index: 'anao', name: 'Anão',
    ability_bonuses: [{ ability: 'CON', bonus: 2 }],
    subraces: [{ index: 'anao-da-colina', name: 'Anão da Colina',
      ability_bonuses: [{ ability: 'SAB', bonus: 1 }] }],
  },
  { index: 'humano', name: 'Humano',
    ability_bonuses: [],
    optionalSubrace: true,
    subraces: [{ index: 'tracos-raciais-alternativos', name: 'Variante',
      ability_bonuses: [{ ability: '2 à escolha', bonus: 1 }] }],
  },
  { index: 'meio-elfo', name: 'Meio-Elfo',
    ability_bonuses: [
      { ability: 'CAR', bonus: 2 }, { ability: '2 à escolha', bonus: 1 },
    ], subraces: [],
  },
  { index: 'draconato', name: 'Draconato',
    ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'CAR', bonus: 1 }],
    subraces: [],
  },
  { index: 'elfo', name: 'Elfo', ability_bonuses: [{ ability: 'DES', bonus: 2 }],
    subraces: [{ index: 'alto-elfo', name: 'Alto Elfo',
      ability_bonuses: [{ ability: 'INT', bonus: 1 }] }],
  },
]

const empty = { ...INITIAL_DRAFT_V2 }

describe('RaceBlock', () => {
  it('escolher raça atualiza draft com race e racialBonuses', async () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={empty} updateDraft={updateDraft} races={races} />)
    await userEvent.selectOptions(screen.getByLabelText(/^raça/i), 'anao')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      race: 'anao',
      subrace: '',
      racialBonuses: { con: 2 },
      racialAbilityChoices: [],
      racialSkills: [],
      draconicAncestry: '',
      racialCantrip: '',
    }))
  })

  it('Draconato mostra DraconicAncestryPicker', () => {
    render(<RaceBlock draft={{ ...empty, race: 'draconato' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/ancestral dracônico/i)).toBeInTheDocument()
  })

  it('Alto Elfo mostra HighElfCantripPicker', () => {
    render(<RaceBlock draft={{ ...empty, race: 'elfo', subrace: 'alto-elfo' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/truque de mago/i)).toBeInTheDocument()
  })

  it('Meio-Elfo mostra FreeAbilityPicker (2 escolhas, exceto CHA) + RacialSkillPicker (2)', () => {
    render(<RaceBlock draft={{ ...empty, race: 'meio-elfo' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/escolha 2 atributos/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha 2 perícias/i)).toBeInTheDocument()
  })

  it('Humano Variante mostra FreeAbilityPicker (2) + RacialSkillPicker (1)', () => {
    render(<RaceBlock
      draft={{ ...empty, race: 'humano', subrace: 'tracos-raciais-alternativos' }}
      updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/escolha 2 atributos/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha 1 perícia/i)).toBeInTheDocument()
  })

  it('preview mostra bônus de raça simples', () => {
    render(<RaceBlock draft={{ ...empty, race: 'anao' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/\+2 CON/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: Rodar — esperado falhar**

```
npm test -- wizardV2-RaceBlock
```

- [ ] **Step 4.3: Implementar `RaceBlock.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/RaceBlock.jsx
import { RacePicker } from './race/RacePicker'
import { DraconicAncestryPicker } from './race/DraconicAncestryPicker'
import { HighElfCantripPicker } from './race/HighElfCantripPicker'
import { FreeAbilityPicker } from './race/FreeAbilityPicker'
import { RacialSkillPicker } from './race/RacialSkillPicker'
import { RaceBonusPreview } from './race/RaceBonusPreview'
import { computeBonuses, getRaceRequirements } from './race-helpers'

export function RaceBlock({ draft, updateDraft, races }) {
  const selectedRace    = races.find(r => r.index === draft.race) ?? null
  const selectedSubrace = selectedRace?.subraces?.find(s => s.index === draft.subrace) ?? null
  const reqs = getRaceRequirements(draft, selectedRace, selectedSubrace)

  function handleRaceChange(raceIndex) {
    const race = races.find(r => r.index === raceIndex)
    updateDraft({
      race: raceIndex,
      subrace: '',
      racialBonuses: computeBonuses(race, null, []),
      racialAbilityChoices: [],
      racialSkills: [],
      draconicAncestry: '',
      racialCantrip: '',
    })
  }

  function handleSubraceChange(subraceIndex) {
    const subrace = selectedRace?.subraces?.find(s => s.index === subraceIndex)
    updateDraft({
      subrace: subraceIndex,
      racialBonuses: computeBonuses(selectedRace, subrace, []),
      racialAbilityChoices: [],
      racialSkills: [],
      racialCantrip: '',
    })
  }

  function handleAbilityChoiceToggle(key, max) {
    const prev = draft.racialAbilityChoices ?? []
    const next = prev.includes(key)
      ? prev.filter(k => k !== key)
      : prev.length < max ? [...prev, key] : prev
    updateDraft({
      racialAbilityChoices: next,
      racialBonuses: computeBonuses(selectedRace, selectedSubrace, next),
    })
  }

  function handleSkillToggle(key, max) {
    const prev = draft.racialSkills ?? []
    const next = prev.includes(key)
      ? prev.filter(k => k !== key)
      : prev.length < max ? [...prev, key] : prev
    updateDraft({ racialSkills: next })
  }

  const fixedBonuses = [
    ...(selectedRace?.ability_bonuses ?? []),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ].filter(b => !b.ability.includes('escolha'))

  return (
    <div className="flex flex-col gap-4">
      <RacePicker
        races={races}
        race={draft.race}
        subrace={draft.subrace}
        onRaceChange={handleRaceChange}
        onSubraceChange={handleSubraceChange}
      />

      {reqs.draconicAncestry && (
        <DraconicAncestryPicker
          value={draft.draconicAncestry}
          onChange={v => updateDraft({ draconicAncestry: v })}
        />
      )}

      {reqs.highElfCantrip && (
        <HighElfCantripPicker
          value={draft.racialCantrip}
          onChange={v => updateDraft({ racialCantrip: v })}
        />
      )}

      {reqs.freeAbility > 0 && (
        <FreeAbilityPicker
          label={reqs.freeAbilityExclude
            ? `Escolha ${reqs.freeAbility} atributos (exceto Carisma) para +1 cada`
            : `Escolha ${reqs.freeAbility} atributos para +1 cada`}
          count={reqs.freeAbility}
          chosen={draft.racialAbilityChoices ?? []}
          exclude={reqs.freeAbilityExclude}
          onToggle={k => handleAbilityChoiceToggle(k, reqs.freeAbility)}
        />
      )}

      {reqs.racialSkills > 0 && (
        <RacialSkillPicker
          label={`Escolha ${reqs.racialSkills} perícia${reqs.racialSkills > 1 ? 's' : ''}`}
          count={reqs.racialSkills}
          chosen={draft.racialSkills ?? []}
          onToggle={k => handleSkillToggle(k, reqs.racialSkills)}
        />
      )}

      {selectedRace && (
        <RaceBonusPreview
          bonuses={fixedBonuses}
          hasFreeChoice={reqs.freeAbility > 0}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4.4: Rodar — esperado passar (6/6)**

```
npm test -- wizardV2-RaceBlock
```

- [ ] **Step 4.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/RaceBlock.jsx src/test/wizardV2-RaceBlock.test.jsx
git commit -m "feat(wizardV2): RaceBlock compõe sub-pickers + reset cascata + preview"
git push origin HEAD
```

---

## Task 5: Refinar `useBlockStatus` para Race + Concept

**Files:**
- Modify: `src/components/CharacterWizardV2/hooks/useBlockStatus.js`
- Modify: `src/test/wizardV2-useBlockStatus.test.js` (acrescentar casos novos)

**Mudanças:**
- `race` agora pode ser `parcial` quando draft.race está preenchido mas faltam escolhas dependentes (driven by `getRaceRequirements`).
- `concept` permanece igual (só `name` obrigatório).

- [ ] **Step 5.1: Escrever os novos testes failing (acrescentar ao arquivo existente)**

Adicione ao final do `describe('getBlockStatus', ...)` em `src/test/wizardV2-useBlockStatus.test.js`:

```js
  it('race parcial: Draconato escolhido sem ancestral', () => {
    const draft = { ...empty, race: 'draconato' }
    expect(getBlockStatus('race', draft).status).toBe('parcial')
  })

  it('race completo: Draconato com ancestral', () => {
    const draft = { ...empty, race: 'draconato', draconicAncestry: 'red' }
    expect(getBlockStatus('race', draft).status).toBe('completo')
  })

  it('race parcial: Alto Elfo sem truque', () => {
    const draft = { ...empty, race: 'elfo', subrace: 'alto-elfo' }
    expect(getBlockStatus('race', draft).status).toBe('parcial')
  })

  it('race completo: Alto Elfo com truque', () => {
    const draft = { ...empty, race: 'elfo', subrace: 'alto-elfo', racialCantrip: 'Mãos Mágicas' }
    expect(getBlockStatus('race', draft).status).toBe('completo')
  })

  it('race parcial: Meio-Elfo sem 2 atributos livres', () => {
    const draft = { ...empty, race: 'meio-elfo', racialAbilityChoices: ['str'] }
    expect(getBlockStatus('race', draft).status).toBe('parcial')
  })

  it('race parcial: Meio-Elfo com atributos mas sem 2 perícias', () => {
    const draft = { ...empty, race: 'meio-elfo', racialAbilityChoices: ['str', 'dex'] }
    expect(getBlockStatus('race', draft).status).toBe('parcial')
  })

  it('race completo: Meio-Elfo com tudo preenchido', () => {
    const draft = {
      ...empty, race: 'meio-elfo',
      racialAbilityChoices: ['str', 'dex'],
      racialSkills: ['atletismo', 'historia'],
    }
    expect(getBlockStatus('race', draft).status).toBe('completo')
  })

  it('race completo: raça simples (anão) sem requisitos extras', () => {
    expect(getBlockStatus('race', { ...empty, race: 'anao' }).status).toBe('completo')
  })
```

- [ ] **Step 5.2: Rodar — esperado falhar nos novos**

```
npm test -- wizardV2-useBlockStatus
```

- [ ] **Step 5.3: Atualizar `useBlockStatus.js`**

Substituir o case `'race'` no `statusOf` por:

```js
    case 'race': {
      if (!draft.race) return 'vazio'
      const reqs = getRaceRequirements(draft, null, null)
      if (reqs.draconicAncestry && !draft.draconicAncestry) return 'parcial'
      if (reqs.highElfCantrip && !draft.racialCantrip) return 'parcial'
      if (reqs.freeAbility > 0 && (draft.racialAbilityChoices?.length ?? 0) < reqs.freeAbility) return 'parcial'
      if (reqs.racialSkills > 0 && (draft.racialSkills?.length ?? 0) < reqs.racialSkills) return 'parcial'
      return 'completo'
    }
```

E acrescentar o import no topo:

```js
import { getRaceRequirements } from '../blocks/race-helpers'
```

- [ ] **Step 5.4: Rodar todos os testes do hook — esperado passar (19/19)**

```
npm test -- wizardV2-useBlockStatus
```

- [ ] **Step 5.5: Commit + push**

```
git add src/components/CharacterWizardV2/hooks/useBlockStatus.js src/test/wizardV2-useBlockStatus.test.js
git commit -m "feat(wizardV2): race fica parcial quando faltam escolhas dependentes"
git push origin HEAD
```

---

## Task 6: Wire dos blocos no shell

**Files:**
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`

**Mudança:** No render do `BlockEditorModal`, substituir o `<p>` de placeholder por um switch que renderiza o bloco real (Concept ou Race) ou o placeholder (outros). RaceBlock precisa de `races` do `useSrd()`.

- [ ] **Step 6.1: Modificar `CharacterWizardV2.jsx`**

No topo, adicionar imports:

```jsx
import { useSrd } from '../../providers/SrdProvider'
import { ConceptBlock } from './blocks/ConceptBlock'
import { RaceBlock } from './blocks/RaceBlock'
```

Dentro de `WizardGrid`, adicionar `const { races } = useSrd()` (ou ajustar conforme nome real do hook se for diferente — verifique em `src/providers/SrdProvider.jsx`).

Substituir o conteúdo do `<BlockEditorModal>...</BlockEditorModal>` por:

```jsx
<BlockEditorModal
  open={openBlockId !== null}
  title={openBlockId ? LABEL_BY_ID[openBlockId] : ''}
  onClose={() => setOpenBlockId(null)}
>
  {openBlockId === 'concept' && (
    <ConceptBlock draft={draft} updateDraft={updateDraft} />
  )}
  {openBlockId === 'race' && (
    <RaceBlock draft={draft} updateDraft={updateDraft} races={races} />
  )}
  {openBlockId && !['concept', 'race'].includes(openBlockId) && (
    <p className="text-sm text-ink-300 italic text-center py-12">
      Em construção (PR seguinte).
    </p>
  )}
</BlockEditorModal>
```

**Importante:** o destructuring `const { draft, hasChanges, resetDraft } = useDraft(...)` precisa virar `const { draft, updateDraft, hasChanges, resetDraft } = useDraft(...)` para expor `updateDraft`.

- [ ] **Step 6.2: Atualizar o teste E2E do shell**

Em `src/test/e2e/wizardV2-shell.test.jsx`, o teste "clicar em card abre modal placeholder" passa a clicar em um bloco que ainda é placeholder (ex: Antecedente). O teste de Conceito/Raça abre conteúdo real.

Substituir:

```jsx
  it('clicar em card abre modal placeholder', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /raça/i }))
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
  })
```

Por:

```jsx
  it('clicar em card de bloco ainda placeholder mostra "em construção"', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /antecedente/i }))
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
  })

  it('clicar em card Conceito abre ConceptBlock real', async () => {
    render(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    expect(screen.getByLabelText(/nome do personagem/i)).toBeInTheDocument()
  })
```

(Não adicione asserts de Raça aqui — RaceBlock precisa de `races` carregadas pelo SrdProvider, o que requer mock complexo. O teste unitário de RaceBlock já cobre o componente isolado; o E2E "real" fica pra fluxo manual no Step 6.4.)

- [ ] **Step 6.3: Rodar suite V2 — esperado passar**

```
npm test -- wizardV2
```
Esperado: 60+ testes (todos verdes).

- [ ] **Step 6.4: Verificação manual rápida**

```
npm run dev
```

1. `http://localhost:5173/?v2=1` → confirmar (sessionStorage limpo: `localStorage.removeItem('wizard-v2-draft')` no DevTools)
2. Clicar "Conceito" → modal abre com 4 campos; digitar nome marca card como `completo` (ícone ✓)
3. Clicar "Raça" → modal com seletor; escolher Draconato → ancestral dracônico aparece; status do card vai pra `parcial` até escolher ancestral
4. Outros cards continuam mostrando "Em construção"

- [ ] **Step 6.5: Rodar suite completa pra checar zero regressão**

```
npm test
```

Falhas esperadas: as flakes pré-existentes de E2E pesados (bestiary, character-list-mapa). Se cair fora dessas, **investigar antes de commitar**.

- [ ] **Step 6.6: Commit + push**

```
git add src/components/CharacterWizardV2/CharacterWizardV2.jsx src/test/e2e/wizardV2-shell.test.jsx
git commit -m "feat(wizardV2): wire ConceptBlock + RaceBlock no shell"
git push origin HEAD
```

---

## Task 7: Abrir PR

- [ ] **Step 7.1: Confirmar build verde**

```
npm run build
```

- [ ] **Step 7.2: Abrir PR**

```bash
gh pr create --base master --title "feat(wizardV2): PR 2 — RaceBlock + ConceptBlock funcionais" --body "$(cat <<'EOF'
## Summary

Segunda PR do redesign do CharacterWizard — substitui o placeholder de **Raça** e **Conceito** por componentes funcionais reais. Os outros 6 blocos continuam mostrando "Em construção (PR seguinte)".

- `ConceptBlock`: nome, jogador, alinhamento, aparência (estilo parchment)
- `RaceBlock`: composição em 6 sub-pickers (RacePicker, DraconicAncestryPicker, HighElfCantripPicker, FreeAbilityPicker, RacialSkillPicker, RaceBonusPreview) — cada um isolado e testável
- `race-helpers.js`: lógica pura (computeBonuses, getRaceRequirements, MAGO_CANTRIPS)
- `useBlockStatus`: regra refinada — `race` fica `parcial` quando faltam escolhas dependentes (ancestral dracônico, truque de mago, atributos livres, perícias raciais)

## Spec / Plan
- Spec: docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md
- Plano da PR 2: docs/superpowers/plans/2026-05-15-wizard-v2-pr2-race-concept.md

## Test plan
- [x] Suite V2: ~60+ testes verdes (npm test -- wizardV2)
- [x] Build de produção verde (npm run build)
- [x] Manual: ?v2=1 → bloco Conceito funcional, bloco Raça com todos os condicionais (Draconato, Alto Elfo, Meio-Elfo, Humano Variante)

## Próxima PR
PR 3: ClassBlock (refatoração do Step3Class de 1217 linhas em 5 sub-arquivos), single-class apenas, equipamento integrado.
EOF
)"
```

---

## Self-review (antes de fechar a PR)

- [ ] **Spec coverage**: 4 itens da "Visão geral do PR" cobertos? (1: Conceito funcional ✓, 2: Raça com condicionais ✓, 3: status parcial pra Raça ✓, 4: outros ainda placeholder ✓)
- [ ] **Sem placeholders no código**: nenhum "TODO"/"TBD" no diff (texto user-visible "Em construção (PR seguinte)" no modal de outros blocos é intencional)
- [ ] **Consistência de nomes**: `RaceBlock`, `ConceptBlock`, `RacePicker`, `DraconicAncestryPicker`, `HighElfCantripPicker`, `FreeAbilityPicker`, `RacialSkillPicker`, `RaceBonusPreview`, `computeBonuses`, `getRaceRequirements`, `MAGO_CANTRIPS`. Mesmos em todos os arquivos.
- [ ] **Sem regressão**: V2 suite verde + build verde + manual sem `?v2=1` mostra wizard antigo idêntico

---

## Próxima PR (referência)

PR 3: `ClassBlock` — refatoração do `Step3Class.jsx` (1217 linhas) em 5 sub-arquivos (`ClassPicker`, `SubclassChoice`, `ClassEquipment`, `ClassASI`, composição). Single-class apenas; multiclasse fica pra PR 6.
