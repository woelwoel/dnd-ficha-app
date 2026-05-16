# Wizard V2 — PR 3a: ClassBlock (sem equipamento)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Substituir o placeholder do bloco **Classe** por componente funcional (single-class apenas, sem equipamento). Refatora ~990 linhas do `Step3Class.jsx` em 6 arquivos pequenos.

**Architecture:** `ClassBlock` compõe `ClassPicker` + `LevelProgressionList` + `ClassStatsCards`. A `LevelProgressionList` itera por nível e renderiza `ASIOrFeatPicker` (nos níveis de ASI) e `ChosenFeaturePicker` (nas escolhas leveladas como Tradição Arcana, Caminho do Patrulheiro etc.). Lógica pura em `class-helpers.js`. `useBlockStatus` ganha regras finas pra detectar `parcial` vs `completo`.

**Spec:** [`docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md`](../specs/2026-05-15-redesign-character-wizard-design.md)
**PR anterior:** PR 2 (RaceBlock + ConceptBlock) — em master.
**Branch:** `claude/wizard-v2-pr3a` (já criada).

**Out-of-scope (vai pra PR 3b):**
- ClassEquipment (escolha de equipamento inicial vs ouro, com integração ao antecedente)
- WeaponPicker

**Out-of-scope (vai pra PR 6):** Multiclasse.

---

## Visão geral

Após esta PR, com `?v2=1`:
1. Card "Classe" abre modal com seletor de classe + nível inicial.
2. Para cada nível 1..N, mostra features e pickers de escolha (com badges de bônus de cantrips/magias).
3. Em níveis de ASI, mostra `ASIOrFeatPicker` (+2 atributos OU 1 talento se `settings.allowFeats`).
4. Quando uma escolha gera bônus de cantrips (Pacto do Tomo etc.), mostra `CantripsGrantPicker`.
5. Cards de stats (PV, bônus de proficiência, dado de vida) e badges de salvaguardas + perícias disponíveis.
6. Card mostra `parcial` enquanto faltam escolhas, `completo` quando tudo resolvido.
7. **Equipamento ainda mostra placeholder dentro do modal** ("Equipamento na PR 3b") — a aba Equipamento ainda não existe como bloco separado; equipamento continua junto com Classe per spec, mas implementação fica pra PR 3b.

Wizard antigo intocado.

---

## Estrutura de arquivos

```
src/components/CharacterWizardV2/
├── CharacterWizardV2.jsx             // MODIFICAR: trocar placeholder de class por ClassBlock
├── blocks/
│   ├── ClassBlock.jsx                // novo, composição (~120 linhas)
│   ├── class-helpers.js              // novo, lógica pura (~80 linhas)
│   └── class/
│       ├── ClassPicker.jsx           // novo (~80 linhas)
│       ├── LevelProgressionList.jsx  // novo (~140 linhas)
│       ├── ASIOrFeatPicker.jsx       // novo (~180 linhas, refatorado do antigo)
│       ├── ChosenFeaturePicker.jsx   // novo (~100 linhas)
│       └── ClassStatsCards.jsx       // novo (~70 linhas)
└── hooks/
    └── useBlockStatus.js             // MODIFICAR: regras finas pra class

src/test/
├── wizardV2-class-helpers.test.js
├── wizardV2-ClassPicker.test.jsx
├── wizardV2-ChosenFeaturePicker.test.jsx
├── wizardV2-ASIOrFeatPicker.test.jsx
├── wizardV2-LevelProgressionList.test.jsx
├── wizardV2-ClassStatsCards.test.jsx
├── wizardV2-ClassBlock.test.jsx
├── wizardV2-useBlockStatus.test.js   // MODIFICAR: novos casos
└── e2e/wizardV2-shell.test.jsx        // MODIFICAR: novo assert pra Classe
```

---

## Convenções

- Mesmas da PR 2 (parchment/ink, font-display, etc.).
- `git push origin HEAD` após cada commit.
- Cada arquivo abaixo de ~200 linhas.

---

## Task 1: `class-helpers.js`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class-helpers.js`
- Test: `src/test/wizardV2-class-helpers.test.js`

**API:**
- `isASIChoiceComplete(choice)` — true se ASI tem 2 pontos atribuídos OU feat tem index + (se aplicável) atributo escolhido. Idêntico ao do Step3Class antigo (linhas 19-32).
- `isChoiceDone(choice, value)` — true se single-choice tem valor OU multi-choice tem `multiSelect` itens.
- `getLeveledChoices(classChoicesData, level)` — array de choices ordenadas por nível, filtradas até `level`.
- `computeBonusCantripsNeeded(leveledChoices, chosenFeatures)` — soma `grants.bonusCantrips` das opções selecionadas.
- `getASILevels(progressionData, level)` — array de níveis (≤level) que têm feature "Aumento de Atributo".
- `getProgressionLevels(progressionData, level)` — todos os níveis de 1..level com seus dados (features etc.).

- [ ] **Step 1.1: Escrever testes failing**

```js
// src/test/wizardV2-class-helpers.test.js
import { describe, it, expect } from 'vitest'
import {
  isASIChoiceComplete, isChoiceDone, getLeveledChoices,
  computeBonusCantripsNeeded, getASILevels, getProgressionLevels,
} from '../components/CharacterWizardV2/blocks/class-helpers'

describe('isASIChoiceComplete', () => {
  it('false sem choice', () => expect(isASIChoiceComplete(null)).toBe(false))
  it('asi: true se total = 2', () => {
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 2 } })).toBe(true)
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 1, dex: 1 } })).toBe(true)
  })
  it('asi: false se total < 2', () => {
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 1 } })).toBe(false)
    expect(isASIChoiceComplete({ type: 'asi', bonuses: {} })).toBe(false)
  })
  it('feat: false sem featIndex', () => {
    expect(isASIChoiceComplete({ type: 'feat' })).toBe(false)
  })
  it('feat: true com featIndex e sem bonus secundário', () => {
    expect(isASIChoiceComplete({ type: 'feat', featIndex: 'tough' })).toBe(true)
  })
  it('feat: false com attrBonus de múltiplas escolhas mas sem featChosenAttr', () => {
    expect(isASIChoiceComplete({
      type: 'feat', featIndex: 'lucky',
      featAttrBonus: { amount: 1, choices: ['str', 'dex'] },
    })).toBe(false)
  })
  it('feat: true com featChosenAttr definido', () => {
    expect(isASIChoiceComplete({
      type: 'feat', featIndex: 'lucky',
      featAttrBonus: { amount: 1, choices: ['str', 'dex'] },
      featChosenAttr: 'str',
    })).toBe(true)
  })
})

describe('isChoiceDone', () => {
  it('single choice sem valor: false', () => {
    expect(isChoiceDone({ id: 'x' }, undefined)).toBe(false)
    expect(isChoiceDone({ id: 'x' }, '')).toBe(false)
  })
  it('single choice com valor: true', () => {
    expect(isChoiceDone({ id: 'x' }, 'option-a')).toBe(true)
  })
  it('multi choice abaixo do limite: false', () => {
    expect(isChoiceDone({ id: 'x', multiSelect: 2 }, ['a'])).toBe(false)
  })
  it('multi choice no limite: true', () => {
    expect(isChoiceDone({ id: 'x', multiSelect: 2 }, ['a', 'b'])).toBe(true)
  })
})

describe('getLeveledChoices', () => {
  it('filtra até o nível e ordena por level', () => {
    const data = { choices: [
      { id: 'a', level: 5 },
      { id: 'b', level: 1 },
      { id: 'c', level: 3 },
      { id: 'd', level: 7 },
    ]}
    const r = getLeveledChoices(data, 5)
    expect(r.map(c => c.id)).toEqual(['b', 'c', 'a'])
  })
  it('retorna [] se data null', () => {
    expect(getLeveledChoices(null, 10)).toEqual([])
  })
})

describe('computeBonusCantripsNeeded', () => {
  const choices = [
    { id: 'pact', level: 3, options: [
      { value: 'tome', grants: { bonusCantrips: 3 } },
      { value: 'blade', grants: {} },
    ]},
    { id: 'multi', level: 1, multiSelect: 2, options: [
      { value: 'a', grants: { bonusCantrips: 1 } },
      { value: 'b', grants: { bonusCantrips: 1 } },
      { value: 'c', grants: {} },
    ]},
  ]

  it('zero quando nada escolhido', () => {
    expect(computeBonusCantripsNeeded(choices, {})).toBe(0)
  })
  it('soma single grant', () => {
    expect(computeBonusCantripsNeeded(choices, { pact: 'tome' })).toBe(3)
  })
  it('soma multi grants', () => {
    expect(computeBonusCantripsNeeded(choices, { multi: ['a', 'b'] })).toBe(2)
  })
  it('combinação', () => {
    expect(computeBonusCantripsNeeded(choices, { pact: 'tome', multi: ['a', 'c'] })).toBe(4)
  })
})

describe('getASILevels', () => {
  it('lista níveis com feature "Aumento de Atributo" até level', () => {
    const data = { levels: [
      { level: 1, features: [{ name: 'X' }] },
      { level: 4, features: [{ name: 'Aumento de Atributo' }] },
      { level: 8, features: [{ name: 'Aumento de Atributo' }] },
      { level: 12, features: [{ name: 'Aumento de Atributo' }] },
    ]}
    expect(getASILevels(data, 5)).toEqual([4])
    expect(getASILevels(data, 8)).toEqual([4, 8])
  })
  it('[] se data null', () => expect(getASILevels(null, 10)).toEqual([]))
})

describe('getProgressionLevels', () => {
  it('filtra até level e ordena', () => {
    const data = { levels: [
      { level: 3, features: [] },
      { level: 1, features: [] },
      { level: 5, features: [] },
    ]}
    const r = getProgressionLevels(data, 3)
    expect(r.map(l => l.level)).toEqual([1, 3])
  })
  it('[] se data null', () => expect(getProgressionLevels(null, 5)).toEqual([]))
})
```

- [ ] **Step 1.2: Rodar — esperado falhar**

```
npm test -- wizardV2-class-helpers
```

- [ ] **Step 1.3: Implementar `class-helpers.js`**

```js
// src/components/CharacterWizardV2/blocks/class-helpers.js

export function isASIChoiceComplete(choice) {
  if (!choice) return false
  if (choice.type === 'asi') {
    const total = Object.values(choice.bonuses ?? {}).reduce((s, v) => s + v, 0)
    return total === 2
  }
  if (choice.type === 'feat') {
    if (!choice.featIndex) return false
    const choices = choice.featAttrBonus?.choices ?? []
    if (choices.length > 1) return !!choice.featChosenAttr
    return true
  }
  return false
}

export function isChoiceDone(choice, value) {
  if (choice?.multiSelect) {
    return Array.isArray(value) && value.length >= choice.multiSelect
  }
  return !!value
}

export function getLeveledChoices(classChoicesData, level) {
  return (classChoicesData?.choices ?? [])
    .filter(c => c.level <= level)
    .sort((a, b) => a.level - b.level)
}

export function computeBonusCantripsNeeded(leveledChoices, chosenFeatures) {
  return leveledChoices.reduce((sum, c) => {
    const val = chosenFeatures?.[c.id]
    if (c.multiSelect) {
      const vals = Array.isArray(val) ? val : []
      return sum + vals.reduce((s, v) =>
        s + (c.options.find(o => o.value === v)?.grants?.bonusCantrips ?? 0), 0)
    }
    const opt = c.options.find(o => o.value === val)
    return sum + (opt?.grants?.bonusCantrips ?? 0)
  }, 0)
}

export function getProgressionLevels(progressionData, level) {
  return (progressionData?.levels ?? [])
    .filter(l => l.level <= level)
    .sort((a, b) => a.level - b.level)
}

export function getASILevels(progressionData, level) {
  return getProgressionLevels(progressionData, level)
    .filter(l => l.features?.some(f => f.name === 'Aumento de Atributo'))
    .map(l => l.level)
}
```

- [ ] **Step 1.4: Rodar — esperado passar (~22/22)**

```
npm test -- wizardV2-class-helpers
```

- [ ] **Step 1.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class-helpers.js src/test/wizardV2-class-helpers.test.js
git commit -m "feat(wizardV2): class-helpers (isASIChoiceComplete, getLeveledChoices, etc.)"
git push origin HEAD
```

---

## Task 2: `ClassPicker.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/ClassPicker.jsx`
- Test: `src/test/wizardV2-ClassPicker.test.jsx`

**Comportamento:**
- Props: `{ classes, classIndex, level, onClassChange, onLevelChange }`.
- Dois selects: Classe (lista classes) e Nível (1-20).
- `onClassChange(index)` recebe o index escolhido; `onLevelChange(num)` recebe o número.

- [ ] **Step 2.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ClassPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassPicker } from '../components/CharacterWizardV2/blocks/class/ClassPicker'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro' },
  { index: 'mago', name: 'Mago' },
]

describe('ClassPicker', () => {
  it('lista classes e dispara onClassChange', async () => {
    const onClassChange = vi.fn()
    render(<ClassPicker classes={classes} classIndex="" level={1} onClassChange={onClassChange} onLevelChange={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    expect(onClassChange).toHaveBeenCalledWith('mago')
  })

  it('lista 20 níveis e dispara onLevelChange com number', async () => {
    const onLevelChange = vi.fn()
    render(<ClassPicker classes={classes} classIndex="guerreiro" level={1} onClassChange={() => {}} onLevelChange={onLevelChange} />)
    const levelSelect = screen.getByLabelText(/nível inicial/i)
    expect(levelSelect.querySelectorAll('option')).toHaveLength(20)
    await userEvent.selectOptions(levelSelect, '5')
    expect(onLevelChange).toHaveBeenCalledWith(5)
  })

  it('reflete classIndex e level via prop', () => {
    render(<ClassPicker classes={classes} classIndex="mago" level={3} onClassChange={() => {}} onLevelChange={() => {}} />)
    expect(screen.getByLabelText(/^classe/i)).toHaveValue('mago')
    expect(screen.getByLabelText(/nível inicial/i)).toHaveValue('3')
  })
})
```

- [ ] **Step 2.2: Rodar — esperado falhar**

- [ ] **Step 2.3: Implementar `ClassPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/class/ClassPicker.jsx
const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function ClassPicker({ classes, classIndex, level, onClassChange, onLevelChange }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="class-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Classe <span className="text-red-700">*</span>
        </label>
        <select
          id="class-select"
          value={classIndex}
          onChange={e => onClassChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher classe...</option>
          {classes.map(c => (
            <option key={c.index} value={c.index}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="level-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Nível Inicial
        </label>
        <select
          id="level-select"
          value={level}
          onChange={e => onLevelChange(Number(e.target.value))}
          className={fieldCls}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.4: Rodar — esperado passar (3/3)**

- [ ] **Step 2.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class/ClassPicker.jsx src/test/wizardV2-ClassPicker.test.jsx
git commit -m "feat(wizardV2): ClassPicker (classe + nível 1-20)"
git push origin HEAD
```

---

## Task 3: `ChosenFeaturePicker.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx`
- Test: `src/test/wizardV2-ChosenFeaturePicker.test.jsx`

**Comportamento:**
- Props: `{ choice, value, onChange }`.
  - `choice = { id, featureName, prompt, multiSelect?, options: [{ value, name, grants? }] }`.
  - `value` é string (single) ou array (multi).
  - `onChange(newValue)` — para single recebe o value; para multi recebe o novo array.
- Renderiza título da feature + prompt + lista de opções com radio (single) ou checkbox (multi).
- Mostra contador atual/total quando `multiSelect`.
- Mostra badges "+N truques" / "+magia" se a opção tem grants.

- [ ] **Step 3.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ChosenFeaturePicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChosenFeaturePicker } from '../components/CharacterWizardV2/blocks/class/ChosenFeaturePicker'

const singleChoice = {
  id: 'pact',
  featureName: 'Pacto Bruxo',
  prompt: 'Escolha um pacto.',
  options: [
    { value: 'blade', name: 'Pacto da Lâmina' },
    { value: 'tome',  name: 'Pacto do Tomo', grants: { bonusCantrips: 3 } },
    { value: 'chain', name: 'Pacto da Corrente', grants: { spells: ['find familiar'] } },
  ],
}

const multiChoice = {
  id: 'metamagic',
  featureName: 'Metamagia',
  prompt: 'Escolha 2.',
  multiSelect: 2,
  options: [
    { value: 'twin', name: 'Gêmea' },
    { value: 'subtle', name: 'Sutil' },
    { value: 'careful', name: 'Cuidadosa' },
  ],
}

describe('ChosenFeaturePicker single', () => {
  it('renderiza título e prompt', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/pacto bruxo/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha um pacto/i)).toBeInTheDocument()
  })

  it('chama onChange com value ao clicar opção', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /pacto da lâmina/i }))
    expect(onChange).toHaveBeenCalledWith('blade')
  })

  it('mostra badge "+3 truques" quando opção tem grants.bonusCantrips', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/\+3 truques/i)).toBeInTheDocument()
  })

  it('mostra badge "+magia" quando opção tem grants.spells', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/\+magia/i)).toBeInTheDocument()
  })
})

describe('ChosenFeaturePicker multi', () => {
  it('mostra contador 0/2 sem seleção', () => {
    render(<ChosenFeaturePicker choice={multiChoice} value={[]} onChange={() => {}} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('mostra contador 2/2 e desabilita não-selecionadas no limite', () => {
    render(<ChosenFeaturePicker choice={multiChoice} value={['twin', 'subtle']} onChange={() => {}} />)
    expect(screen.getByText(/2\/2/)).toBeInTheDocument()
  })

  it('toggle adiciona valor', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={multiChoice} value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /gêmea/i }))
    expect(onChange).toHaveBeenCalledWith(['twin'])
  })

  it('toggle remove valor já selecionado', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={multiChoice} value={['twin']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /gêmea/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 3.2: Rodar — esperado falhar**

- [ ] **Step 3.3: Implementar `ChosenFeaturePicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx
export function ChosenFeaturePicker({ choice, value, onChange }) {
  const isMulti = !!choice.multiSelect
  const selected = isMulti
    ? (Array.isArray(value) ? value : [])
    : (value ?? '')
  const atLimit = isMulti && selected.length >= choice.multiSelect

  function isSelected(v) {
    return isMulti ? selected.includes(v) : selected === v
  }

  function handleClick(v) {
    if (isMulti) {
      const isSel = selected.includes(v)
      if (isSel) {
        onChange(selected.filter(x => x !== v))
      } else if (selected.length < choice.multiSelect) {
        onChange([...selected, v])
      }
    } else {
      onChange(v)
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2 border-t-2 border-parchment-600/50">
      <div className="flex items-baseline gap-2">
        <p className="text-xs font-display tracking-widest uppercase text-ink-500">
          {choice.featureName} <span className="text-red-700">*</span>
        </p>
        {isMulti && (
          <span className={[
            'text-[10px] font-display',
            selected.length >= choice.multiSelect ? 'text-emerald-700' : 'text-amber-700',
          ].join(' ')}>
            ({selected.length}/{choice.multiSelect})
          </span>
        )}
      </div>
      {choice.prompt && (
        <p className="text-[11px] italic text-ink-300">{choice.prompt}</p>
      )}
      <div className="flex flex-col gap-1">
        {choice.options.map(opt => {
          const sel = isSelected(opt.value)
          const disabled = isMulti && !sel && atLimit
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && handleClick(opt.value)}
              className={[
                'flex items-center gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              {isMulti ? (
                <span className={[
                  'w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center',
                  sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')}>
                  {sel && <span className="text-parchment-50 text-[8px]">✓</span>}
                </span>
              ) : (
                <span className={[
                  'w-3 h-3 rounded-full border-2 shrink-0',
                  sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')} />
              )}
              <span className="font-display flex-1">{opt.name}</span>
              {opt.grants?.bonusCantrips > 0 && (
                <span className="text-[10px] bg-parchment-100 border-2 border-parchment-600 px-1.5 py-0.5 rounded-sm text-ink-300 shrink-0">
                  +{opt.grants.bonusCantrips} truques
                </span>
              )}
              {opt.grants?.spells?.length > 0 && (
                <span className="text-[10px] bg-parchment-100 border-2 border-parchment-600 px-1.5 py-0.5 rounded-sm text-ink-300 shrink-0">
                  +magia
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3.4: Rodar — esperado passar (8/8)**

- [ ] **Step 3.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker.jsx src/test/wizardV2-ChosenFeaturePicker.test.jsx
git commit -m "feat(wizardV2): ChosenFeaturePicker (single + multi com grants badges)"
git push origin HEAD
```

---

## Task 4: `ASIOrFeatPicker.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx`
- Test: `src/test/wizardV2-ASIOrFeatPicker.test.jsx`

**Comportamento:**
- Props: `{ currentChoice, allowFeats, feats, onChoose }`.
- Modo ASI: 6 atributos com botões +/-, total = 2 distribuído.
- Modo Feat (se `allowFeats`): toggle + busca + lista + picker secundário de atributo (se feat dá +1 à escolha).
- `onChoose(choiceObj)` — recebe `{ type: 'asi', bonuses }` OU `{ type: 'feat', featIndex, featName, featAttrBonus, featChosenAttr }`.

Refatoração do `ASIOrFeatPicker` antigo (Step3Class linhas 411-601). Mantém comportamento, troca estilo pra parchment.

- [ ] **Step 4.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ASIOrFeatPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ASIOrFeatPicker } from '../components/CharacterWizardV2/blocks/class/ASIOrFeatPicker'

const feats = [
  { index: 'tough', name: 'Tough' },
  { index: 'lucky', name: 'Lucky' },
  { index: 'resilient', name: 'Resilient', attrBonus: { amount: 1, choices: ['str', 'dex', 'con', 'int', 'wis', 'cha'] } },
]

describe('ASIOrFeatPicker — modo ASI', () => {
  it('inicia em ASI por default', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={false} feats={[]} onChoose={() => {}} />)
    expect(screen.getByText(/pontos restantes/i)).toBeInTheDocument()
  })

  it('mostra restantes = 2 quando vazio', () => {
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={false} feats={[]} onChoose={() => {}} />)
    const text = screen.getByText(/pontos restantes/i).textContent
    expect(text).toMatch(/2/)
  })

  it('clicar + em FOR adiciona +1 e chama onChoose', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={false} feats={[]} onChoose={onChoose} />)
    // busca o + da linha de FOR
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    await userEvent.click(plusButtons[0])
    expect(onChoose).toHaveBeenCalledWith({ type: 'asi', bonuses: { str: 1 } })
  })
})

describe('ASIOrFeatPicker — modo Feat', () => {
  it('toggle Talento aparece quando allowFeats=true', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={true} feats={feats} onChoose={() => {}} />)
    expect(screen.getByRole('button', { name: /talento/i })).toBeInTheDocument()
  })

  it('NÃO mostra toggle Talento quando allowFeats=false', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={false} feats={feats} onChoose={() => {}} />)
    expect(screen.queryByRole('button', { name: /talento/i })).not.toBeInTheDocument()
  })

  it('clicar Talento switcha pro modo feat', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={true} feats={feats} onChoose={onChoose} />)
    await userEvent.click(screen.getByRole('button', { name: /^talento$/i }))
    expect(onChoose).toHaveBeenCalledWith({ type: 'feat', featIndex: null, featName: null })
  })

  it('selecionar feat sem attrBonus dispara onChoose com featIndex', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'feat', featIndex: null }} allowFeats={true} feats={feats} onChoose={onChoose} />)
    await userEvent.click(screen.getByRole('button', { name: /^tough$/i }))
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({
      type: 'feat', featIndex: 'tough', featName: 'Tough',
    }))
  })

  it('busca filtra feats', async () => {
    render(<ASIOrFeatPicker currentChoice={{ type: 'feat', featIndex: null }} allowFeats={true} feats={feats} onChoose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/buscar talento/i), 'luck')
    expect(screen.queryByRole('button', { name: /^tough$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lucky$/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: Rodar — esperado falhar**

- [ ] **Step 4.3: Implementar `ASIOrFeatPicker.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx
import { useState } from 'react'
import { isASIChoiceComplete } from '../class-helpers'

const ATTR_ABR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }
const ATTRS_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function ASIOrFeatPicker({ currentChoice, allowFeats, feats, onChoose }) {
  const [featSearch, setFeatSearch] = useState('')

  const mode = currentChoice?.type ?? 'asi'
  const bonuses = (mode === 'asi' ? currentChoice?.bonuses : null) ?? {}
  const totalSpent = Object.values(bonuses).reduce((s, v) => s + v, 0)
  const remaining = 2 - totalSpent
  const isDone = isASIChoiceComplete(currentChoice)

  function switchMode(newMode) {
    if (newMode === 'asi') onChoose({ type: 'asi', bonuses: {} })
    else onChoose({ type: 'feat', featIndex: null, featName: null })
  }

  function adjustBonus(attr, delta) {
    const cur = bonuses[attr] ?? 0
    const next = cur + delta
    if (next < 0 || next > 2) return
    if (delta > 0 && remaining <= 0) return
    const nb = { ...bonuses }
    if (next === 0) delete nb[attr]
    else nb[attr] = next
    onChoose({ type: 'asi', bonuses: nb })
  }

  const filteredFeats = (feats ?? []).filter(f =>
    f.name.toLowerCase().includes(featSearch.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-2 pt-2 border-t-2 border-parchment-600/50">
      <div className="flex items-center gap-2">
        <p className="text-xs font-display tracking-widest uppercase text-ink-500 flex-1">
          Aumento de Atributo {allowFeats ? 'ou Talento' : ''} <span className="text-red-700">*</span>
        </p>
        {isDone && <span className="text-[10px] text-emerald-700 font-display">✓</span>}
      </div>

      {allowFeats && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => switchMode('asi')}
            className={[
              'flex-1 py-1 text-[10px] rounded-sm border-2 font-display tracking-wide transition-colors',
              mode === 'asi'
                ? 'border-ink-500 bg-parchment-200 text-ink-500'
                : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
            ].join(' ')}
          >
            +2 Atributos
          </button>
          <button
            type="button"
            onClick={() => switchMode('feat')}
            className={[
              'flex-1 py-1 text-[10px] rounded-sm border-2 font-display tracking-wide transition-colors',
              mode === 'feat'
                ? 'border-ink-500 bg-parchment-200 text-ink-500'
                : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
            ].join(' ')}
          >
            Talento
          </button>
        </div>
      )}

      {mode === 'asi' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] italic text-ink-300">
            Pontos restantes:{' '}
            <span className={remaining === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {remaining}
            </span>
            {' '}/ 2 — distribua +2 em um atributo ou +1/+1 em dois
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ATTRS_ORDER.map(attr => {
              const bonus = bonuses[attr] ?? 0
              const canInc = remaining > 0 && bonus < 2
              const canDec = bonus > 0
              return (
                <div key={attr} className={[
                  'flex items-center gap-1 px-2 py-1.5 rounded-sm border-2',
                  bonus > 0 ? 'border-ink-500 bg-parchment-200' : 'border-parchment-600 bg-parchment-50',
                ].join(' ')}>
                  <span className="text-[10px] font-display text-ink-300 w-6 shrink-0">{ATTR_ABR[attr]}</span>
                  <button
                    type="button"
                    onClick={() => adjustBonus(attr, -1)}
                    disabled={!canDec}
                    aria-label={`-1 ${ATTR_ABR[attr]}`}
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[11px] bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 text-ink-500 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className={[
                    'text-[11px] font-display flex-1 text-center',
                    bonus > 0 ? 'text-ink-500' : 'text-ink-200',
                  ].join(' ')}>
                    {bonus > 0 ? `+${bonus}` : '0'}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustBonus(attr, 1)}
                    disabled={!canInc}
                    aria-label="+"
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[11px] bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 text-ink-500 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'feat' && (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Buscar talento..."
            value={featSearch}
            onChange={e => setFeatSearch(e.target.value)}
            className="w-full px-2.5 py-1 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-0.5">
            {filteredFeats.length === 0 && (
              <p className="text-[10px] text-ink-200 italic text-center py-3">Nenhum talento encontrado.</p>
            )}
            {filteredFeats.map(feat => {
              const isSelected = currentChoice?.type === 'feat' && currentChoice.featIndex === feat.index
              return (
                <button
                  key={feat.index}
                  type="button"
                  onClick={() => {
                    const attrBonus = feat.attrBonus ?? null
                    const autoAttr = attrBonus && attrBonus.choices?.length === 1
                      ? attrBonus.choices[0]
                      : null
                    onChoose({
                      type: 'feat',
                      featIndex: feat.index,
                      featName: feat.name,
                      featAttrBonus: attrBonus,
                      featChosenAttr: autoAttr,
                    })
                  }}
                  className={[
                    'flex items-start gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                    isSelected
                      ? 'border-ink-500 bg-parchment-200 text-ink-500'
                      : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                  ].join(' ')}
                >
                  <span className={[
                    'w-3 h-3 rounded-full border-2 shrink-0 mt-0.5',
                    isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                  ].join(' ')} />
                  <span className="flex-1 min-w-0">
                    <span className="font-display block">
                      {feat.name}
                      {feat.attrBonus && (
                        <span className="ml-1.5 text-[9px] text-ink-300 italic">
                          +{feat.attrBonus.amount} {feat.attrBonus.choices.map(c => ATTR_ABR[c]).join('/')}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {currentChoice?.type === 'feat' && currentChoice.featAttrBonus && (currentChoice.featAttrBonus.choices?.length ?? 0) > 1 && (
            <div className="mt-2 pt-2 border-t-2 border-parchment-600/50 flex flex-col gap-1.5">
              <p className="text-[10px] font-display text-ink-500">
                Onde aplicar +{currentChoice.featAttrBonus.amount}? <span className="text-red-700">*</span>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {currentChoice.featAttrBonus.choices.map(attrKey => {
                  const isSel = currentChoice.featChosenAttr === attrKey
                  return (
                    <button
                      key={attrKey}
                      type="button"
                      onClick={() => onChoose({ ...currentChoice, featChosenAttr: attrKey })}
                      className={[
                        'px-2.5 py-1 text-[11px] rounded-sm border-2 font-display transition-colors',
                        isSel
                          ? 'border-ink-500 bg-parchment-200 text-ink-500'
                          : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                      ].join(' ')}
                    >
                      {ATTR_ABR[attrKey]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4.4: Rodar — esperado passar (8/8)**

- [ ] **Step 4.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class/ASIOrFeatPicker.jsx src/test/wizardV2-ASIOrFeatPicker.test.jsx
git commit -m "feat(wizardV2): ASIOrFeatPicker (refactor do antigo, estilo parchment)"
git push origin HEAD
```

---

## Task 5: `LevelProgressionList.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx`
- Test: `src/test/wizardV2-LevelProgressionList.test.jsx`

**Comportamento:**
- Props: `{ level, progressionLevels, leveledChoices, draft, onFeatureChoice, onASIChoice, allowFeats, feats }`.
- Itera de 1 a `level`. Para cada nível:
  - Se não tem features nem choices → renderiza linha minimalista "Sem novas características".
  - Senão renderiza card com:
    - Lista de features (badges, exceto "Aumento de Atributo")
    - `ASIOrFeatPicker` se nível é de ASI
    - `ChosenFeaturePicker` para cada choice deste nível

- [ ] **Step 5.1: Escrever testes failing**

```jsx
// src/test/wizardV2-LevelProgressionList.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LevelProgressionList } from '../components/CharacterWizardV2/blocks/class/LevelProgressionList'

const draft = {
  chosenFeatures: {},
  asiChoices: {},
  settings: { allowFeats: false },
}

const progressionLevels = [
  { level: 1, features: [{ name: 'Estilo de Combate' }] },
  { level: 2, features: [] },  // sem features novas
  { level: 3, features: [{ name: 'Caminho Marcial' }] },
  { level: 4, features: [{ name: 'Aumento de Atributo' }] },
]

const leveledChoices = [
  { id: 'fighting-style', level: 1, featureName: 'Estilo de Combate', prompt: '...', options: [
    { value: 'archery', name: 'Arqueirismo' },
    { value: 'defense', name: 'Defesa' },
  ]},
]

describe('LevelProgressionList', () => {
  it('renderiza um card por nível com conteúdo', () => {
    render(<LevelProgressionList
      level={4} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/Nível 1/)).toBeInTheDocument()
    expect(screen.getByText(/Nível 3/)).toBeInTheDocument()
    expect(screen.getByText(/Nível 4/)).toBeInTheDocument()
  })

  it('nível sem features mostra linha minimalista', () => {
    render(<LevelProgressionList
      level={2} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/sem novas características|evolução de slots/i)).toBeInTheDocument()
  })

  it('nível com choice renderiza ChosenFeaturePicker', () => {
    render(<LevelProgressionList
      level={1} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/estilo de combate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /arqueirismo/i })).toBeInTheDocument()
  })

  it('nível com ASI renderiza ASIOrFeatPicker', () => {
    render(<LevelProgressionList
      level={4} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/aumento de atributo/i)).toBeInTheDocument()
    expect(screen.getByText(/pontos restantes/i)).toBeInTheDocument()
  })

  it('clicar opção dispara onFeatureChoice com (id, value, multiSelect)', async () => {
    const userEvent = await import('@testing-library/user-event').then(m => m.default)
    const onFeatureChoice = vi.fn()
    render(<LevelProgressionList
      level={1} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={onFeatureChoice} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /defesa/i }))
    expect(onFeatureChoice).toHaveBeenCalledWith('fighting-style', 'defense', undefined)
  })
})
```

- [ ] **Step 5.2: Rodar — esperado falhar**

- [ ] **Step 5.3: Implementar `LevelProgressionList.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx
import { ASIOrFeatPicker } from './ASIOrFeatPicker'
import { ChosenFeaturePicker } from './ChosenFeaturePicker'
import { isASIChoiceComplete, isChoiceDone } from '../class-helpers'

export function LevelProgressionList({
  level, progressionLevels, leveledChoices,
  draft, onFeatureChoice, onASIChoice, allowFeats, feats,
}) {
  return (
    <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
      {Array.from({ length: level }, (_, i) => i + 1).map(lvl => {
        const lvlData = progressionLevels.find(l => l.level === lvl)
        const features = lvlData?.features ?? []
        const lvlChoices = leveledChoices.filter(c => c.level === lvl)
        const hasASI = features.some(f => f.name === 'Aumento de Atributo')
        const asiChoice = draft.asiChoices?.[lvl]
        const asiDone = hasASI && isASIChoiceComplete(asiChoice)
        const asiPending = hasASI && !asiDone
        const hasContent = features.length > 0 || lvlChoices.length > 0
        const lvlChoicesDone = lvlChoices.length > 0 && lvlChoices.every(c => isChoiceDone(c, draft.chosenFeatures?.[c.id]))
        const lvlChoicesPending = lvlChoices.length > 0 && !lvlChoicesDone
        const lvlPending = lvlChoicesPending || asiPending
        const lvlDone = (lvlChoices.length === 0 || lvlChoicesDone) && (!hasASI || asiDone) && (lvlChoices.length > 0 || hasASI)

        if (!hasContent) {
          return (
            <div key={lvl} className="flex items-center gap-2 px-3 py-1 rounded-sm bg-parchment-50/50 border border-parchment-600/40">
              <span className="text-[10px] font-display text-ink-200 w-10 shrink-0">Nv.{lvl}</span>
              <span className="text-[10px] italic text-ink-200">
                {lvlData ? 'Evolução de slots / habilidades' : 'Sem novas características'}
              </span>
            </div>
          )
        }

        return (
          <div
            key={lvl}
            className={[
              'rounded-sm border-2 p-3 flex flex-col gap-2 transition-colors',
              lvlPending ? 'border-amber-700 bg-amber-50' :
              lvlDone    ? 'border-emerald-700 bg-emerald-50' :
                           'border-parchment-600 bg-parchment-50',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-display tracking-widest uppercase text-ink-500">Nível {lvl}</span>
              {lvlPending && <span className="text-[10px] text-amber-700 font-display">⚠ Escolha</span>}
              {lvlDone && <span className="text-[10px] text-emerald-700 font-display">✓ Feito</span>}
            </div>

            {features.filter(f => f.name !== 'Aumento de Atributo').length > 0 && (
              <div className="flex flex-wrap gap-1">
                {features.filter(f => f.name !== 'Aumento de Atributo').map((f, fi) => (
                  <span key={fi} className="text-[10px] bg-parchment-100 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            {hasASI && (
              <ASIOrFeatPicker
                currentChoice={asiChoice}
                allowFeats={allowFeats}
                feats={feats}
                onChoose={choice => onASIChoice(lvl, choice)}
              />
            )}

            {lvlChoices.map(choice => (
              <ChosenFeaturePicker
                key={choice.id}
                choice={choice}
                value={draft.chosenFeatures?.[choice.id]}
                onChange={newValue => onFeatureChoice(choice.id, newValue, choice.multiSelect)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

**Atenção ao callback do ChosenFeaturePicker:** o LevelProgression chama `onFeatureChoice(id, newValue, multiSelect)`. Mas o ChosenFeaturePicker já foi escrito pra fazer toggle internamente e devolver o array completo (no multi) ou o value (no single). Aqui simplesmente repassamos.

O test do Step 5.1 espera `onFeatureChoice('fighting-style', 'defense', undefined)` — OK porque single-choice, `multiSelect` é undefined.

- [ ] **Step 5.4: Rodar — esperado passar (5/5)**

- [ ] **Step 5.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class/LevelProgressionList.jsx src/test/wizardV2-LevelProgressionList.test.jsx
git commit -m "feat(wizardV2): LevelProgressionList (loop nível por nível com pickers)"
git push origin HEAD
```

---

## Task 6: `ClassStatsCards.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/ClassStatsCards.jsx`
- Test: `src/test/wizardV2-ClassStatsCards.test.jsx`

**Comportamento:**
- Props: `{ classData, level, conMod, savingThrows }`.
  - `classData`: objeto com `hit_die`, `spellcasting_ability`, `skill_choices`.
  - `level`: int.
  - `conMod`: int (modificador de Constituição com bônus racial — usado pra preview de PV).
  - `savingThrows`: array de chaves (ex: ['str', 'con']).
- Renderiza:
  - 4 cards: Dado de Vida (d8), Habilidade de Magia (Inteligência ou —), PV no Nível N (calculado), Bônus de Proficiência (+N).
  - Badges de salvaguardas.
  - Card com "Você poderá escolher X perícias" se `classData.skill_choices` existe.

Usa `calculateMaxHp` de `src/utils/calculations.js` (já existe).

- [ ] **Step 6.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ClassStatsCards.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassStatsCards } from '../components/CharacterWizardV2/blocks/class/ClassStatsCards'

const guerreiro = {
  hit_die: 10,
  spellcasting_ability: '',
  skill_choices: { count: 2, from: ['atletismo', 'intimidação'] },
}

describe('ClassStatsCards', () => {
  it('renderiza dado de vida', () => {
    render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={[]} />)
    expect(screen.getByText(/d10/i)).toBeInTheDocument()
  })

  it('renderiza bônus de proficiência correto pro nível', () => {
    render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={[]} />)
    expect(screen.getByText(/\+2/)).toBeInTheDocument()
    const { rerender } = render(<ClassStatsCards classData={guerreiro} level={5} conMod={0} savingThrows={[]} />)
    expect(screen.getAllByText(/\+3/).length).toBeGreaterThan(0)
  })

  it('mostra "—" como habilidade de magia quando classe não conjura', () => {
    render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={[]} />)
    expect(screen.getByText(/—/)).toBeInTheDocument()
  })

  it('renderiza badges de salvaguardas', () => {
    render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={['str', 'con']} />)
    expect(screen.getByText(/str/i)).toBeInTheDocument()
    expect(screen.getByText(/con/i)).toBeInTheDocument()
  })

  it('renderiza info de perícias disponíveis', () => {
    render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={[]} />)
    expect(screen.getByText(/2 perícias/i)).toBeInTheDocument()
    expect(screen.getByText(/atletismo/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6.2: Rodar — esperado falhar**

- [ ] **Step 6.3: Implementar `ClassStatsCards.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/class/ClassStatsCards.jsx
import { calculateMaxHp } from '../../../../utils/calculations'

function StatCard({ label, value, sub }) {
  return (
    <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
      <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-0.5">{label}</p>
      <p className="text-sm font-display text-ink-500">{value}</p>
      {sub && <p className="text-[10px] italic text-ink-200">{sub}</p>}
    </div>
  )
}

export function ClassStatsCards({ classData, level, conMod, savingThrows }) {
  if (!classData) return null
  const hpPreview = calculateMaxHp(classData, level, 10 + conMod)
  const profBonus = `+${Math.ceil(level / 4) + 1}`

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Dado de Vida" value={`d${classData.hit_die}`} />
        <StatCard label="Habilidade de Magia" value={classData.spellcasting_ability || '—'} />
        {hpPreview != null && (
          <StatCard label={`PV no Nível ${level}`} value={`${hpPreview} PV`} sub="com CON 10" />
        )}
        <StatCard label="Bônus de Proficiência" value={profBonus} />
      </div>

      {savingThrows?.length > 0 && (
        <div>
          <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">Salvaguardas:</p>
          <div className="flex flex-wrap gap-2">
            {savingThrows.map(k => (
              <span key={k} className="text-xs font-display bg-parchment-100 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500 uppercase">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {classData.skill_choices && (
        <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
          <p className="text-xs italic text-ink-300 mb-1">
            Você poderá escolher{' '}
            <span className="font-display text-ink-500">{classData.skill_choices.count} perícias</span> no passo de Perícias:
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {classData.skill_choices.from?.map((s, i) => (
              <span key={i} className="text-xs bg-parchment-50 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6.4: Rodar — esperado passar (5/5)**

- [ ] **Step 6.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/class/ClassStatsCards.jsx src/test/wizardV2-ClassStatsCards.test.jsx
git commit -m "feat(wizardV2): ClassStatsCards (PV/prof/dado de vida + saves + skills info)"
git push origin HEAD
```

---

## Task 7: `ClassBlock.jsx` (composição)

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/ClassBlock.jsx`
- Test: `src/test/wizardV2-ClassBlock.test.jsx`

**Comportamento:**
- Props: `{ draft, updateDraft, classes, classChoices, classProgression, feats }`.
- Compõe ClassPicker + LevelProgressionList + ClassStatsCards.
- Lógica de handleClassChange/handleLevelChange/handleFeatureChoice/handleASIChoice idêntica ao Step3Class antigo (linhas 83-109).
- `bonusCantripsNeeded`: se > 0, renderiza `CantripsGrantPicker` (componente já existente em `src/components/CantripsGrantPicker.jsx`).
- Em PR 3a, **não** renderiza equipamento — vai um placeholder dizendo "Equipamento: PR 3b" no lugar.

- [ ] **Step 7.1: Escrever testes failing**

```jsx
// src/test/wizardV2-ClassBlock.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassBlock } from '../components/CharacterWizardV2/blocks/ClassBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro', hit_die: 10, spellcasting_ability: '',
    saving_throws: ['Força', 'Constituição'],
    skill_choices: { count: 2, from: ['Atletismo'] },
  },
  { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência',
    saving_throws: ['Inteligência', 'Sabedoria'],
  },
]

const classChoices = {
  guerreiro: { choices: [
    { id: 'fighting-style', level: 1, featureName: 'Estilo de Combate', prompt: '...', options: [
      { value: 'archery', name: 'Arqueirismo' },
      { value: 'defense', name: 'Defesa' },
    ]},
  ]},
}

const classProgression = {
  guerreiro: { levels: [
    { level: 1, features: [{ name: 'Estilo de Combate' }] },
    { level: 2, features: [] },
    { level: 4, features: [{ name: 'Aumento de Atributo' }] },
  ]},
}

describe('ClassBlock', () => {
  it('escolher classe atualiza draft com class + savingThrows + hitDice', async () => {
    const updateDraft = vi.fn()
    render(<ClassBlock draft={INITIAL_DRAFT_V2} updateDraft={updateDraft}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'guerreiro')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      class: 'guerreiro',
      hitDice: '1d10',
      savingThrows: expect.arrayContaining(['str', 'con']),
    }))
  })

  it('mostra ClassStatsCards quando classe escolhida', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/dado de vida/i)).toBeInTheDocument()
    expect(screen.getByText(/d10/i)).toBeInTheDocument()
  })

  it('mostra LevelProgressionList com choice do nível 1', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/estilo de combate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /arqueirismo/i })).toBeInTheDocument()
  })

  it('mudar nível atualiza draft.level', async () => {
    const updateDraft = vi.fn()
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={updateDraft}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    await userEvent.selectOptions(screen.getByLabelText(/nível inicial/i), '4')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({ level: 4 }))
  })

  it('mostra placeholder de equipamento (PR 3b)', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/equipamento.*pr 3b/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7.2: Rodar — esperado falhar**

- [ ] **Step 7.3: Implementar `ClassBlock.jsx`**

```jsx
// src/components/CharacterWizardV2/blocks/ClassBlock.jsx
import { ClassPicker } from './class/ClassPicker'
import { LevelProgressionList } from './class/LevelProgressionList'
import { ClassStatsCards } from './class/ClassStatsCards'
import { CantripsGrantPicker } from '../../CantripsGrantPicker'
import {
  getLeveledChoices, computeBonusCantripsNeeded, getProgressionLevels,
} from './class-helpers'
import { SPELL_ABILITY_PT_TO_KEY } from '../../../utils/calculations'

const ATTR_NAME_TO_KEY = {
  'Força': 'str', 'Destreza': 'dex', 'Constituição': 'con',
  'Inteligência': 'int', 'Sabedoria': 'wis', 'Carisma': 'cha',
}

export function ClassBlock({
  draft, updateDraft, classes, classChoices = {}, classProgression = {}, feats = [],
}) {
  const selectedClass = classes.find(c => c.index === draft.class) ?? null

  const leveledChoices = getLeveledChoices(classChoices[draft.class], draft.level)
  const progressionLevels = getProgressionLevels(classProgression[draft.class], draft.level)
  const bonusCantripsNeeded = computeBonusCantripsNeeded(leveledChoices, draft.chosenFeatures ?? {})

  const conMod = Math.floor(((draft.baseAttributes?.con ?? 10) + (draft.racialBonuses?.con ?? 0) - 10) / 2)

  function handleClassChange(classIndex) {
    const cls = classes.find(c => c.index === classIndex) ?? null
    const saveKeys = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey = SPELL_ABILITY_PT_TO_KEY[cls?.spellcasting_ability] ?? null
    const hitDice = cls?.hit_die ? `1d${cls.hit_die}` : '1d8'
    updateDraft({
      class: classIndex,
      chosenFeatures: {},
      bonusSpells: [],
      asiChoices: {},
      classEquipmentChoices: {},
      classEquipmentPicks: {},
      savingThrows: saveKeys,
      spellcastingAbility: spellKey,
      hitDice,
    })
  }

  function handleLevelChange(lvl) {
    updateDraft({ level: lvl, chosenFeatures: {}, bonusSpells: [], asiChoices: {} })
  }

  function handleFeatureChoice(choiceId, value, _multiSelect) {
    // ChosenFeaturePicker já devolve o valor final (string ou array).
    updateDraft({
      chosenFeatures: { ...(draft.chosenFeatures ?? {}), [choiceId]: value },
      bonusSpells: [],
    })
  }

  function handleASIChoice(level, choice) {
    updateDraft({ asiChoices: { ...(draft.asiChoices ?? {}), [level]: choice } })
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassPicker
        classes={classes}
        classIndex={draft.class}
        level={draft.level}
        onClassChange={handleClassChange}
        onLevelChange={handleLevelChange}
      />

      {selectedClass && (
        <>
          <p className="text-xs font-display tracking-widest uppercase text-ink-500 mt-2">
            {draft.level === 1 ? 'Características da Classe' : `Progressão — Níveis 1 a ${draft.level}`}
          </p>

          <LevelProgressionList
            level={draft.level}
            progressionLevels={progressionLevels}
            leveledChoices={leveledChoices}
            draft={draft}
            onFeatureChoice={handleFeatureChoice}
            onASIChoice={handleASIChoice}
            allowFeats={draft.settings?.allowFeats ?? false}
            feats={feats}
          />

          {bonusCantripsNeeded > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
              <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
                Truques de Bônus
              </p>
              <CantripsGrantPicker
                needed={bonusCantripsNeeded}
                chosen={draft.bonusSpells ?? []}
                onChosenChange={spells => updateDraft({ bonusSpells: spells })}
              />
            </div>
          )}

          <ClassStatsCards
            classData={selectedClass}
            level={draft.level}
            conMod={conMod}
            savingThrows={draft.savingThrows ?? []}
          />

          <div className="border-2 border-dashed border-parchment-600 bg-parchment-50 rounded-sm p-3 text-center">
            <p className="text-xs italic text-ink-300">Equipamento: PR 3b (em construção)</p>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7.4: Rodar — esperado passar (5/5)**

- [ ] **Step 7.5: Commit + push**

```
git add src/components/CharacterWizardV2/blocks/ClassBlock.jsx src/test/wizardV2-ClassBlock.test.jsx
git commit -m "feat(wizardV2): ClassBlock (composição sem equipamento)"
git push origin HEAD
```

---

## Task 8: Refinar `useBlockStatus` para Class

**Files:**
- Modify: `src/components/CharacterWizardV2/hooks/useBlockStatus.js`
- Modify: `src/test/wizardV2-useBlockStatus.test.js`

**Mudança:** O bloco `class` precisa retornar `parcial` quando `draft.class` está preenchido mas faltam:
- Alguma `chosenFeature` obrigatória
- Algum ASI/Feat não escolhido nos níveis correspondentes
- Truques de bônus pendentes (se grants pediram)

Lógica precisa de `classChoices` e `classProgression` — passados como argumentos opcionais. Sem eles (modo PR 1), `class` cai pra regra simples (preenchido = completo).

**Decisão importante:** `getBlockStatus` não tinha acesso a SRD data antes. Vou adicionar parâmetro opcional `srdData = {}` que pode conter `{ classChoices, classProgression }`. O hook `useBlockStatus(draft, srdData)` repassa.

- [ ] **Step 8.1: Escrever novos testes failing**

Acrescente ao final do `describe('getBlockStatus', ...)`:

```js
  it('class parcial: sem srdData, fallback é completo se preenchido', () => {
    expect(getBlockStatus('class', { ...empty, class: 'guerreiro' }).status).toBe('completo')
  })

  it('class parcial: choice obrigatória pendente', () => {
    const srdData = {
      classChoices: { guerreiro: { choices: [
        { id: 'fighting-style', level: 1, options: [{ value: 'archery' }] },
      ]}},
    }
    const draft = { ...empty, class: 'guerreiro', level: 1 }
    expect(getBlockStatus('class', draft, srdData).status).toBe('parcial')
  })

  it('class completo: choice obrigatória feita', () => {
    const srdData = {
      classChoices: { guerreiro: { choices: [
        { id: 'fighting-style', level: 1, options: [{ value: 'archery' }] },
      ]}},
    }
    const draft = {
      ...empty, class: 'guerreiro', level: 1,
      chosenFeatures: { 'fighting-style': 'archery' },
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('completo')
  })

  it('class parcial: ASI no nível 4 sem escolha', () => {
    const srdData = {
      classProgression: { guerreiro: { levels: [
        { level: 1, features: [] },
        { level: 4, features: [{ name: 'Aumento de Atributo' }] },
      ]}},
    }
    const draft = { ...empty, class: 'guerreiro', level: 4 }
    expect(getBlockStatus('class', draft, srdData).status).toBe('parcial')
  })

  it('class completo: ASI escolhido', () => {
    const srdData = {
      classProgression: { guerreiro: { levels: [
        { level: 4, features: [{ name: 'Aumento de Atributo' }] },
      ]}},
    }
    const draft = {
      ...empty, class: 'guerreiro', level: 4,
      asiChoices: { 4: { type: 'asi', bonuses: { str: 2 } } },
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('completo')
  })

  it('class parcial: cantrips bônus pendentes', () => {
    const srdData = {
      classChoices: { bruxo: { choices: [
        { id: 'pact', level: 3, options: [
          { value: 'tome', grants: { bonusCantrips: 3 } },
        ]},
      ]}},
    }
    const draft = {
      ...empty, class: 'bruxo', level: 3,
      chosenFeatures: { pact: 'tome' },
      bonusSpells: ['fire bolt'],  // só 1 dos 3 needed
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('parcial')
  })

  it('class completo: cantrips bônus atendidos', () => {
    const srdData = {
      classChoices: { bruxo: { choices: [
        { id: 'pact', level: 3, options: [
          { value: 'tome', grants: { bonusCantrips: 3 } },
        ]},
      ]}},
    }
    const draft = {
      ...empty, class: 'bruxo', level: 3,
      chosenFeatures: { pact: 'tome' },
      bonusSpells: ['a', 'b', 'c'],
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('completo')
  })
```

E ajuste a chamada de `getBlockStatus('class', ...)` em qualquer outro teste pré-existente que não passar `srdData` — comportamento default permanece como antes (completo se preenchido).

Talvez precise atualizar o teste `'class' do PR 1 que era simples — verifique se ainda passa.

- [ ] **Step 8.2: Rodar — esperado falhar nos novos**

- [ ] **Step 8.3: Atualizar `useBlockStatus.js`**

Mudanças em `src/components/CharacterWizardV2/hooks/useBlockStatus.js`:

1. Adicionar imports no topo:

```js
import {
  isASIChoiceComplete, isChoiceDone,
  getLeveledChoices, computeBonusCantripsNeeded, getASILevels,
} from '../blocks/class-helpers'
```

2. Mudar a assinatura de `getBlockStatus` pra `getBlockStatus(blockId, draft, srdData = {})` e fazer `useBlockStatus(draft, srdData = {})` repassar.

3. Substituir o case `'class'` por:

```js
    case 'class': {
      if (!draft.class) return 'vazio'
      const { classChoices, classProgression } = srdData
      // Sem dados SRD, considera completo (PR 1 fallback).
      if (!classChoices && !classProgression) return 'completo'

      const leveledChoices = getLeveledChoices(classChoices?.[draft.class], draft.level ?? 1)
      const allChoicesDone = leveledChoices.every(c =>
        isChoiceDone(c, draft.chosenFeatures?.[c.id])
      )
      if (!allChoicesDone) return 'parcial'

      const asiLevels = getASILevels(classProgression?.[draft.class], draft.level ?? 1)
      const allASIDone = asiLevels.every(l => isASIChoiceComplete(draft.asiChoices?.[l]))
      if (!allASIDone) return 'parcial'

      const bonusNeeded = computeBonusCantripsNeeded(leveledChoices, draft.chosenFeatures ?? {})
      const bonusGiven = draft.bonusSpells?.length ?? 0
      if (bonusGiven < bonusNeeded) return 'parcial'

      return 'completo'
    }
```

4. Atualizar a recursão do `'review'` pra passar `srdData`:

No bloco do review, onde itera `others.every`, troque `getBlockStatus(b.id, draft)` por `getBlockStatus(b.id, draft, srdData)`. (Verifique no código atual a forma exata, ajuste consistentemente.)

5. `useBlockStatus(draft, srdData = {})` no final retorna o map populando com srdData repassado.

- [ ] **Step 8.4: Rodar todos os testes do hook — esperado passar**

```
npm test -- wizardV2-useBlockStatus
```

- [ ] **Step 8.5: Commit + push**

```
git add src/components/CharacterWizardV2/hooks/useBlockStatus.js src/test/wizardV2-useBlockStatus.test.js
git commit -m "feat(wizardV2): class fica parcial quando faltam choices/ASI/cantrips bônus"
git push origin HEAD
```

---

## Task 9: Wire ClassBlock no shell + verificação + PR

**Files:**
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Modify: `src/test/e2e/wizardV2-shell.test.jsx` (atualizar teste de placeholder)

### Step 9.1: Modificar `CharacterWizardV2.jsx`

1. Adicionar imports:

```jsx
import { ClassBlock } from './blocks/ClassBlock'
```

2. No `WizardGrid`, expandir o destructuring de `useSrd` pra pegar `classes`, `classChoices`, `progression`, `feats`:

```jsx
const { races, classes, classChoices, progression: classProgression, feats } = useSrd()
```

3. Passar `srdData` pro `useBlockStatus`:

```jsx
const blockStatus = useBlockStatus(draft, { classChoices, classProgression })
```

4. Adicionar `ClassBlock` no switch do `BlockEditorModal`:

```jsx
{openBlockId === 'class' && (
  <ClassBlock
    draft={draft} updateDraft={updateDraft}
    classes={classes} classChoices={classChoices}
    classProgression={classProgression} feats={feats ?? []}
  />
)}
```

5. Atualizar a condição do bloco placeholder pra excluir 'class':

```jsx
{openBlockId && !['concept', 'race', 'class'].includes(openBlockId) && (
  <p className="text-sm text-ink-300 italic text-center py-12">
    Em construção (PR seguinte).
  </p>
)}
```

### Step 9.2: Atualizar teste E2E do shell

Em `src/test/e2e/wizardV2-shell.test.jsx`, **acrescentar** este teste novo (não substitua os existentes):

```jsx
  it('clicar em card Classe abre ClassBlock real', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /classe/i }))
    expect(screen.getByLabelText(/^classe/i)).toBeInTheDocument()
  })
```

### Step 9.3: Suite V2 verde

```
npm test -- wizardV2
```

### Step 9.4: Suite completa (toleramos flakes conhecidos)

```
npm test
```

### Step 9.5: Build verde

```
npm run build
```

### Step 9.6: Commit + push final

```
git add src/components/CharacterWizardV2/CharacterWizardV2.jsx src/test/e2e/wizardV2-shell.test.jsx
git commit -m "feat(wizardV2): wire ClassBlock no shell"
git push origin HEAD
```

### Step 9.7: Abrir PR

```bash
gh pr create --base master --title "feat(wizardV2): PR 3a — ClassBlock (sem equipamento)" --body "$(cat <<'EOF'
## Summary

Terceira PR do redesign do CharacterWizard — substitui o placeholder do bloco **Classe** por componente funcional. Equipamento ainda mostra placeholder dentro do modal (vai pra **PR 3b**).

Refatora ~990 linhas do Step3Class antigo em 6 arquivos pequenos, single-class apenas.

- **`ClassBlock`**: composição
- **`ClassPicker`**: classe + nível 1-20
- **`LevelProgressionList`**: itera níveis 1..N renderizando features + pickers
- **`ASIOrFeatPicker`**: ASI (+/- atributos) ou Talento (busca + select)
- **`ChosenFeaturePicker`**: escolhas de feature (single/multi com badges de grants)
- **`ClassStatsCards`**: PV, prof bonus, dado de vida, salvaguardas, perícias info
- **`class-helpers.js`**: lógica pura (isASIChoiceComplete, getLeveledChoices, etc.)
- **`useBlockStatus`**: regra refinada — `class` fica `parcial` enquanto faltam choices/ASI/cantrips bônus

## Spec / Plan

- Spec: docs/superpowers/specs/2026-05-15-redesign-character-wizard-design.md
- Plano da PR 3a: docs/superpowers/plans/2026-05-15-wizard-v2-pr3a-class.md

## Test plan

- [x] Suite V2: ~120+ testes verdes
- [x] Build de produção verde
- [ ] **Manual:** abrir \`?v2=1\` → testar Guerreiro nível 4 (estilo de combate + ASI), Mago nível 1, Bruxo nível 3 (Pacto do Tomo → cantrips bônus)

## Próxima PR

PR 3b: ClassEquipment — escolha de equipamento inicial vs ouro, integrado com itens/ouro do antecedente. Único item faltante pra fechar o bloco Classe.
EOF
)"
```

---

## Self-review

- [ ] Spec coverage: 6 itens da Visão geral cobertos?
- [ ] Sem placeholders: o "Equipamento: PR 3b" é intencional, user-visible.
- [ ] Consistência: nomes idênticos entre arquivos.
- [ ] Sem regressão: V2 verde + suite full sem regressões inesperadas.
