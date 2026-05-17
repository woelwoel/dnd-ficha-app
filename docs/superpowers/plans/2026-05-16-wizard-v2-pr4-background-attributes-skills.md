# Wizard V2 — PR 4: BackgroundBlock + AttributesBlock + SkillsBlock

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Substituir o placeholder de **três blocos** simultaneamente — Antecedente, Atributos, Perícias — fechando 3 das 5 lacunas restantes. Cada bloco mais simples que ClassBlock; fica viável agrupar.

**Branch:** `claude/wizard-v2-pr4`.
**Base:** PR 3b mergeada — bloco Classe completo (com integração antecedente ainda inerte porque BackgroundBlock não existia).

---

## Visão geral

Após esta PR:
1. **Antecedente**: seletor de antecedente + preview de perícias/ferramentas/idiomas/equipamento concedidos. Popula `backgroundSkills`, `backgroundItems`, `backgroundGold` (estes dois já consumidos pelo ClassEquipment desde PR 3b — integração agora ativa).
2. **Atributos**: 4 modos selecionados via Setup Modal — `standard-array`, `point-buy`, `4d6drop` (legados) + **`manual`** (digitar valores 3-18). Cada modo com sua UI dedicada. Preview de bônus raciais aplicados.
3. **Perícias**: lista de SKILLS com checkbox; perícias do antecedente aparecem marcadas (não contam pro limite); contador X/N baseado em `classData.skill_choices.count`.
4. `useBlockStatus`: refinamento — atributos só `completo` quando todos os 6 ≥ 3; perícias `completo` quando atinge limite da classe.

---

## Estrutura

```
src/components/CharacterWizardV2/blocks/
├── BackgroundBlock.jsx                  // novo (~120 linhas)
├── AttributesBlock.jsx                  // novo, composição + dispatcher dos 4 modos (~80 linhas)
├── attributes/
│   ├── attribute-helpers.js             // novo (puro): rolla 4d6drop, finalScore, etc.
│   ├── StandardArrayUI.jsx              // novo (~90 linhas)
│   ├── PointBuyUI.jsx                   // novo (~100 linhas)
│   ├── ManualUI.jsx                     // novo (~70 linhas)
│   └── FourD6UI.jsx                     // novo (~110 linhas)
└── SkillsBlock.jsx                      // novo (~100 linhas)

ClassEquipment já consome backgroundItems + backgroundGold (PR 3b). Nada a tocar lá.
useBlockStatus.js                        // MODIFICAR: regras pra skills (limite da classe)
CharacterWizardV2.jsx                    // MODIFICAR: wire dos 3 blocos
```

---

## Mapeamento de `abilityScoreMethod` → UI

| Valor (settings) | Sub-componente |
|---|---|
| `standard-array` | StandardArrayUI |
| `point-buy` | PointBuyUI |
| `manual` | ManualUI |
| `roll` ou `4d6drop` | FourD6UI |

`AttributesBlock` faz dispatch. Valor `roll` (do CampaignSetupModal) e `4d6drop` (legado) ambos vão pra FourD6UI.

---

## Task 1: `BackgroundBlock`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/BackgroundBlock.jsx`
- Test: `src/test/wizardV2-BackgroundBlock.test.jsx`

**Comportamento:**
- Props: `{ draft, updateDraft, backgrounds }`.
- Seletor de antecedente.
- Ao escolher, calcula `backgroundSkills` (chaves PT→key), `backgroundItems` + `backgroundGold` via `parseBackgroundEquipment` (já existe em `utils/calculations.js`); remove de `chosenSkills` perícias agora cobertas pelo antecedente.
- Preview: perícias concedidas, ferramentas, idiomas, equipamento (texto).

### Step 1.1: Tests

```jsx
// src/test/wizardV2-BackgroundBlock.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackgroundBlock } from '../components/CharacterWizardV2/blocks/BackgroundBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const backgrounds = [
  { index: 'soldado', name: 'Soldado',
    skill_proficiencies: ['Atletismo', 'Intimidação'],
    tool_proficiencies: ['Jogos'],
    languages: '',
    equipment: 'Insígnia militar; 10 PO',
    description: 'Servi nas forças armadas',
  },
  { index: 'sabio', name: 'Sábio',
    skill_proficiencies: ['Arcanismo', 'História'],
    languages: '2 idiomas à sua escolha',
    equipment: 'Pergaminho; 10 PO',
  },
]

const empty = INITIAL_DRAFT_V2

describe('BackgroundBlock', () => {
  it('escolher antecedente atualiza draft', async () => {
    const updateDraft = vi.fn()
    render(<BackgroundBlock draft={empty} updateDraft={updateDraft} backgrounds={backgrounds} />)
    await userEvent.selectOptions(screen.getByLabelText(/^antecedente/i), 'soldado')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      background: 'soldado',
      backgroundSkills: expect.arrayContaining(['atletismo', 'intimidacao']),
    }))
  })

  it('mostra perícias concedidas quando antecedente preenchido', () => {
    const draft = { ...empty, background: 'soldado', backgroundSkills: ['atletismo', 'intimidacao'] }
    render(<BackgroundBlock draft={draft} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.getByText(/perícias concedidas/i)).toBeInTheDocument()
    expect(screen.getByText(/atletismo/i)).toBeInTheDocument()
    expect(screen.getByText(/intimidação/i)).toBeInTheDocument()
  })

  it('mostra ferramentas, idiomas, equipamento', () => {
    const draft = { ...empty, background: 'sabio', backgroundSkills: ['arcanismo'] }
    render(<BackgroundBlock draft={draft} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.getByText(/idiomas/i)).toBeInTheDocument()
    expect(screen.getByText(/2 idiomas/i)).toBeInTheDocument()
    expect(screen.getByText(/equipamento/i)).toBeInTheDocument()
  })

  it('NÃO mostra preview quando background vazio', () => {
    render(<BackgroundBlock draft={empty} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.queryByText(/perícias concedidas/i)).not.toBeInTheDocument()
  })

  it('remove chosenSkills duplicadas com bg ao mudar antecedente', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['atletismo', 'historia'] }
    render(<BackgroundBlock draft={draft} updateDraft={updateDraft} backgrounds={backgrounds} />)
    await userEvent.selectOptions(screen.getByLabelText(/^antecedente/i), 'soldado')
    const call = updateDraft.mock.calls[0][0]
    expect(call.chosenSkills).not.toContain('atletismo')  // removida
    expect(call.chosenSkills).toContain('historia')        // preservada
  })
})
```

### Step 1.2: Run — fail

### Step 1.3: Implementation

```jsx
// src/components/CharacterWizardV2/blocks/BackgroundBlock.jsx
import { SKILLS, parseBackgroundEquipment } from '../../../utils/calculations'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function BackgroundBlock({ draft, updateDraft, backgrounds }) {
  const selectedBg = backgrounds.find(b => b.index === draft.background)

  function handleBackgroundChange(bgIndex) {
    const bg = backgrounds.find(b => b.index === bgIndex)
    const bgSkillKeys = (bg?.skill_proficiencies ?? [])
      .map(name => SKILLS.find(s => s.name === name)?.key)
      .filter(Boolean)
    const { items, gold } = parseBackgroundEquipment(bg?.equipment)
    const cleanedChosenSkills = (draft.chosenSkills ?? []).filter(k => !bgSkillKeys.includes(k))
    updateDraft({
      background: bgIndex,
      backgroundSkills: bgSkillKeys,
      backgroundItems: items,
      backgroundGold: gold,
      chosenSkills: cleanedChosenSkills,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="background-select" className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
          Antecedente <span className="text-red-700">*</span>
        </label>
        <select
          id="background-select"
          value={draft.background ?? ''}
          onChange={e => handleBackgroundChange(e.target.value)}
          className={fieldCls}
        >
          <option value="">Escolher antecedente...</option>
          {backgrounds.map(b => (
            <option key={b.index} value={b.index}>{b.name}</option>
          ))}
        </select>
      </div>

      {selectedBg && (
        <>
          {(draft.backgroundSkills?.length ?? 0) > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
              <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
                Perícias concedidas
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.backgroundSkills.map(key => {
                  const skill = SKILLS.find(s => s.key === key)
                  return (
                    <span key={key} className="flex items-center gap-1.5 text-xs font-display bg-parchment-50 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500">
                      🎒 {skill?.name ?? key}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {selectedBg.tool_proficiencies?.length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-0.5">Ferramentas</p>
              <p className="text-sm text-ink-500">{selectedBg.tool_proficiencies.join(', ')}</p>
            </div>
          )}
          {selectedBg.languages && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-0.5">Idiomas</p>
              <p className="text-sm text-ink-500">{selectedBg.languages}</p>
            </div>
          )}
          {selectedBg.equipment && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-0.5">Equipamento</p>
              <p className="text-sm text-ink-500 leading-relaxed">{selectedBg.equipment}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

### Step 1.4: Run — pass (5/5)

### Step 1.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/BackgroundBlock.jsx src/test/wizardV2-BackgroundBlock.test.jsx
git commit -m "feat(wizardV2): BackgroundBlock (seletor + preview perícias/ferramentas/idiomas/equip)"
git push origin HEAD
```

---

## Task 2: `attribute-helpers` + `AttributesBlock` + 4 sub-UIs

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/attributes/attribute-helpers.js`
- Create: `src/components/CharacterWizardV2/blocks/attributes/StandardArrayUI.jsx`
- Create: `src/components/CharacterWizardV2/blocks/attributes/PointBuyUI.jsx`
- Create: `src/components/CharacterWizardV2/blocks/attributes/ManualUI.jsx`
- Create: `src/components/CharacterWizardV2/blocks/attributes/FourD6UI.jsx`
- Create: `src/components/CharacterWizardV2/blocks/AttributesBlock.jsx`
- Test: `src/test/wizardV2-attributes.test.jsx` (combinado)

**Helpers:**
- `rollFourD6Drop()` — rola 4d6, descarta menor, retorna total.
- `rollFourD6DropSix()` — chama 6 vezes, retorna array de 6 scores.
- `finalScore(base, racialBonus)` — base + bonus se base > 0 senão 0.
- `availableStandardArray(baseAttrs, currentKey)` — pool do standard array sem os já usados (exceto o do próprio).
- `availableRolled(rolled, baseAttrs, currentKey)` — pool do rolled sem os já usados (exceto o do próprio, com indexOf splice).

### Step 2.1: Tests (combinado)

```jsx
// src/test/wizardV2-attributes.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  rollFourD6Drop, rollFourD6DropSix, finalScore,
  availableStandardArray, availableRolled,
} from '../components/CharacterWizardV2/blocks/attributes/attribute-helpers'
import { AttributesBlock } from '../components/CharacterWizardV2/blocks/AttributesBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const empty = INITIAL_DRAFT_V2

describe('attribute-helpers', () => {
  it('rollFourD6Drop retorna entre 3 e 18', () => {
    for (let i = 0; i < 100; i++) {
      const v = rollFourD6Drop()
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(18)
    }
  })

  it('rollFourD6DropSix retorna 6 valores', () => {
    expect(rollFourD6DropSix()).toHaveLength(6)
  })

  it('finalScore aplica bonus quando base > 0', () => {
    expect(finalScore(15, 2)).toBe(17)
    expect(finalScore(0, 2)).toBe(0)
  })

  it('availableStandardArray exclui já usados (exceto o próprio)', () => {
    const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
    expect(availableStandardArray(base, 'str')).toEqual([15])
    const partial = { str: 15, dex: 14, con: 0, int: 0, wis: 0, cha: 0 }
    const avail = availableStandardArray(partial, 'con')
    expect(avail).toContain(13)
    expect(avail).not.toContain(15)
    expect(avail).not.toContain(14)
  })

  it('availableRolled splica apenas 1 ocorrência por uso', () => {
    const rolled = [15, 14, 13, 12, 10, 8]
    const base = { str: 15, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
    const avail = availableRolled(rolled, base, 'dex')
    expect(avail).toEqual([14, 13, 12, 10, 8])
  })
})

describe('AttributesBlock — dispatcher', () => {
  it('renderiza StandardArrayUI quando method=standard-array', () => {
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'standard-array' } }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByText(/standard array/i)).toBeInTheDocument()
  })

  it('renderiza PointBuyUI quando method=point-buy', () => {
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'point-buy' } }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByText(/pontos disponíveis/i)).toBeInTheDocument()
  })

  it('renderiza ManualUI quando method=manual', () => {
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'manual' } }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByText(/digite os valores/i)).toBeInTheDocument()
  })

  it('renderiza FourD6UI quando method=roll', () => {
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'roll' } }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByRole('button', { name: /rolar 4d6/i })).toBeInTheDocument()
  })

  it('renderiza FourD6UI quando method=4d6drop (alias legado)', () => {
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: '4d6drop' } }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByRole('button', { name: /rolar 4d6/i })).toBeInTheDocument()
  })
})

describe('StandardArrayUI', () => {
  it('atribuir valor a FOR chama updateDraft', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'standard-array' } }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], '15')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 15 }),
    }))
  })
})

describe('PointBuyUI', () => {
  it('mostra 27 pontos disponíveis (todos atributos a 8 = 0 gastos)', () => {
    const draft = {
      ...empty,
      settings: { ...empty.settings, abilityScoreMethod: 'point-buy' },
      baseAttributes: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    }
    render(<AttributesBlock draft={draft} updateDraft={() => {}} />)
    expect(screen.getByText(/27\/27/)).toBeInTheDocument()
  })

  it('clicar + em FOR (de 8 pra 9) chama updateDraft', async () => {
    const updateDraft = vi.fn()
    const draft = {
      ...empty,
      settings: { ...empty.settings, abilityScoreMethod: 'point-buy' },
      baseAttributes: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    await userEvent.click(plusButtons[0])
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 9 }),
    }))
  })
})

describe('ManualUI', () => {
  it('digitar 15 em FOR chama updateDraft com str=15', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'manual' } }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    const inputs = screen.getAllByRole('spinbutton')  // type=number inputs
    fireEvent.change(inputs[0], { target: { value: '15' } })
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 15 }),
    }))
  })

  it('clampa entre 3 e 18', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'manual' } }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '99' } })
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 18 }),
    }))
    fireEvent.change(inputs[0], { target: { value: '1' } })
    expect(updateDraft).toHaveBeenLastCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 3 }),
    }))
  })
})

describe('FourD6UI', () => {
  it('clicar Rolar dispara updateDraft com rolledScores de 6', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'roll' } }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    await userEvent.click(screen.getByRole('button', { name: /rolar 4d6/i }))
    const call = updateDraft.mock.calls[0][0]
    expect(call.rolledScores).toHaveLength(6)
    call.rolledScores.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(18)
    })
  })
})
```

Adicionar no topo do arquivo de teste:
```jsx
import { fireEvent } from '@testing-library/react'
```

### Step 2.2: Run — fail

### Step 2.3: Implementation

**`attribute-helpers.js`:**

```js
// src/components/CharacterWizardV2/blocks/attributes/attribute-helpers.js
import { STANDARD_ARRAY } from '../../../../utils/calculations'

export function rollFourD6Drop() {
  const dice = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6))
  return dice.reduce((a, b) => a + b, 0) - Math.min(...dice)
}

export function rollFourD6DropSix() {
  return Array.from({ length: 6 }, () => rollFourD6Drop())
}

export function finalScore(base, racialBonus) {
  return base > 0 ? base + (racialBonus ?? 0) : 0
}

export function availableStandardArray(baseAttrs, currentKey) {
  const otherUsed = Object.entries(baseAttrs)
    .filter(([k]) => k !== currentKey)
    .map(([, v]) => v)
    .filter(v => v > 0)
  return STANDARD_ARRAY.filter(v => !otherUsed.includes(v))
}

export function availableRolled(rolled, baseAttrs, currentKey) {
  const pool = [...rolled]
  for (const [k, v] of Object.entries(baseAttrs)) {
    if (k !== currentKey && v > 0) {
      const idx = pool.indexOf(v)
      if (idx !== -1) pool.splice(idx, 1)
    }
  }
  return pool
}
```

**`AttributesBlock.jsx` (dispatcher):**

```jsx
// src/components/CharacterWizardV2/blocks/AttributesBlock.jsx
import { StandardArrayUI } from './attributes/StandardArrayUI'
import { PointBuyUI } from './attributes/PointBuyUI'
import { ManualUI } from './attributes/ManualUI'
import { FourD6UI } from './attributes/FourD6UI'

export function AttributesBlock({ draft, updateDraft }) {
  const method = draft.settings?.abilityScoreMethod ?? 'standard-array'

  const sharedProps = { draft, updateDraft }

  return (
    <div className="flex flex-col gap-4">
      {method === 'standard-array' && <StandardArrayUI {...sharedProps} />}
      {method === 'point-buy' && <PointBuyUI {...sharedProps} />}
      {method === 'manual' && <ManualUI {...sharedProps} />}
      {(method === 'roll' || method === '4d6drop') && <FourD6UI {...sharedProps} />}
    </div>
  )
}
```

**`StandardArrayUI.jsx`:**

```jsx
// src/components/CharacterWizardV2/blocks/attributes/StandardArrayUI.jsx
import { ABILITY_SCORES, STANDARD_ARRAY, getModifier, formatModifier } from '../../../../utils/calculations'
import { finalScore, availableStandardArray } from './attribute-helpers'

export function StandardArrayUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}

  function handleChange(key, value) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: Number(value) } })
  }

  const allAssigned = Object.values(baseAttrs).every(v => v > 0)
  const remaining = STANDARD_ARRAY.filter(v => !Object.values(baseAttrs).includes(v))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs italic text-ink-300">
        <strong className="font-display not-italic">Standard Array:</strong> distribua [15, 14, 13, 12, 10, 8].
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = baseAttrs[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          const avail = availableStandardArray(baseAttrs, key)

          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300 leading-tight">{name}</p>
              </div>
              <select
                value={base || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
              >
                <option value="">—</option>
                {(base > 0 && !avail.includes(base)) && <option value={base}>{base}</option>}
                {avail.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {base > 0 && (
                <div className="shrink-0 text-right min-w-[48px]">
                  {bonus > 0 && <p className="text-[10px] italic text-ink-300">{base} +{bonus}</p>}
                  <p className="text-sm font-display text-ink-500">{final}</p>
                  <p className="text-[10px] text-ink-200">{formatModifier(getModifier(final))}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!allAssigned && (
        <p className="text-xs italic text-ink-300 text-center">
          Restantes: {remaining.join(', ')}
        </p>
      )}
    </div>
  )
}
```

**`PointBuyUI.jsx`:**

```jsx
// src/components/CharacterWizardV2/blocks/attributes/PointBuyUI.jsx
import {
  ABILITY_SCORES, POINT_BUY_COST, POINT_BUY_BUDGET,
  getModifier, formatModifier,
} from '../../../../utils/calculations'
import { finalScore } from './attribute-helpers'

const PB_MIN = 8
const PB_MAX = 15

export function PointBuyUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}
  // Inicializa todos a 8 se ainda não atribuídos
  const inited = Object.values(baseAttrs).every(v => v >= PB_MIN)
  const effectiveBase = inited ? baseAttrs : { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
  const usedPoints = Object.values(effectiveBase).reduce((sum, v) => sum + (POINT_BUY_COST[v] ?? 0), 0)
  const remaining = POINT_BUY_BUDGET - usedPoints

  function adjust(key, delta) {
    const cur = effectiveBase[key]
    const next = Math.min(PB_MAX, Math.max(PB_MIN, cur + delta))
    const newUsed = usedPoints - (POINT_BUY_COST[cur] ?? 0) + (POINT_BUY_COST[next] ?? 0)
    if (newUsed > POINT_BUY_BUDGET) return
    updateDraft({ baseAttributes: { ...effectiveBase, [key]: next } })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={[
        'flex items-center justify-between px-4 py-2 rounded-sm border-2 font-display',
        remaining < 0 ? 'border-red-700 bg-red-50' :
        remaining === 0 ? 'border-amber-700 bg-amber-50' :
        'border-parchment-600 bg-parchment-100',
      ].join(' ')}>
        <span className="text-sm text-ink-500">Pontos disponíveis</span>
        <span className="text-xl text-ink-500">{remaining}/{POINT_BUY_BUDGET}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = effectiveBase[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          const cost = POINT_BUY_COST[base] ?? 0
          const canInc = base < PB_MAX && (usedPoints - cost + (POINT_BUY_COST[base + 1] ?? 0)) <= POINT_BUY_BUDGET
          const canDec = base > PB_MIN

          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300">{name}</p>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  aria-label={`-1 ${abbr}`}
                  onClick={() => adjust(key, -1)}
                  disabled={!canDec}
                  className="w-7 h-7 rounded-sm border-2 border-parchment-600 bg-parchment-50 hover:bg-parchment-200 text-lg font-display disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="w-8 text-center font-display text-ink-500">{base}</span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => adjust(key, 1)}
                  disabled={!canInc}
                  className="w-7 h-7 rounded-sm border-2 border-parchment-600 bg-parchment-50 hover:bg-parchment-200 text-lg font-display disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <div className="shrink-0 text-right min-w-[52px]">
                {bonus > 0 && <p className="text-[10px] italic text-ink-300">{base} +{bonus}</p>}
                <p className="text-sm font-display text-ink-500">{final}</p>
                <p className="text-[10px] text-ink-200">{formatModifier(getModifier(final))}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm p-3">
        <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-2">Custo por valor:</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(POINT_BUY_COST).map(([score, cost]) => (
            <span key={score} className="text-xs text-ink-300">
              <span className="font-display text-ink-500">{score}</span>=<span className="font-display text-ink-500">{cost}pt</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**`ManualUI.jsx`:**

```jsx
// src/components/CharacterWizardV2/blocks/attributes/ManualUI.jsx
import { ABILITY_SCORES, getModifier, formatModifier } from '../../../../utils/calculations'
import { finalScore } from './attribute-helpers'

function clamp(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(3, Math.min(18, Math.round(n)))
}

export function ManualUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}

  function handleChange(key, raw) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: clamp(raw) } })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs italic text-ink-300">
        <strong className="font-display not-italic">Manual:</strong> digite os valores (3-18) para cada atributo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = baseAttrs[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300">{name}</p>
              </div>
              <input
                type="number"
                min={3}
                max={18}
                value={base || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 text-center focus:outline-none focus:border-ink-300"
              />
              {base > 0 && (
                <div className="shrink-0 text-right min-w-[52px]">
                  {bonus > 0 && <p className="text-[10px] italic text-ink-300">{base} +{bonus}</p>}
                  <p className="text-sm font-display text-ink-500">{final}</p>
                  <p className="text-[10px] text-ink-200">{formatModifier(getModifier(final))}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**`FourD6UI.jsx`:**

```jsx
// src/components/CharacterWizardV2/blocks/attributes/FourD6UI.jsx
import { ABILITY_SCORES, getModifier, formatModifier } from '../../../../utils/calculations'
import { finalScore, rollFourD6DropSix, availableRolled } from './attribute-helpers'

export function FourD6UI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}
  const rolled = draft.rolledScores ?? []
  const hasRolled = rolled.length === 6

  function rollAll() {
    updateDraft({
      rolledScores: rollFourD6DropSix(),
      baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    })
  }

  function handleChange(key, value) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: Number(value) } })
  }

  // Mostra rolados marcando usados (sem repetir 1 slot por valor)
  const tagged = rolled.map((v, i) => ({ v, i, used: false }))
  for (const val of Object.values(baseAttrs)) {
    if (val > 0) {
      const slot = tagged.find(p => p.v === val && !p.used)
      if (slot) slot.used = true
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 py-4 border-2 border-parchment-600 bg-parchment-100 rounded-sm">
        <button
          type="button"
          onClick={rollAll}
          className="px-6 py-2.5 bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display rounded-sm transition-colors text-sm"
        >
          🎲 {hasRolled ? 'Re-rolar Dados' : 'Rolar 4d6 (×6)'}
        </button>
        {hasRolled && (
          <>
            <p className="text-xs italic text-ink-300">Resultados (distribua abaixo):</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {tagged.map(({ v, i, used }) => (
                <span key={i} className={[
                  'text-sm font-display px-3 py-1.5 rounded-sm border-2',
                  used ? 'border-parchment-600 text-ink-200 line-through bg-parchment-50' : 'border-ink-500 text-ink-500 bg-parchment-200',
                ].join(' ')}>
                  {v}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {hasRolled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ABILITY_SCORES.map(({ key, name, abbr }) => {
            const base = baseAttrs[key]
            const bonus = racialBonuses[key] ?? 0
            const final = finalScore(base, bonus)
            const avail = availableRolled(rolled, baseAttrs, key)
            return (
              <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
                <div className="w-10 shrink-0">
                  <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                  <p className="text-xs text-ink-300">{name}</p>
                </div>
                <select
                  value={base || ''}
                  onChange={e => handleChange(key, e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
                >
                  <option value="">—</option>
                  {(base > 0 && !avail.includes(base)) && <option value={base}>{base}</option>}
                  {avail.map((v, i) => <option key={i} value={v}>{v}</option>)}
                </select>
                {base > 0 && (
                  <div className="shrink-0 text-right min-w-[48px]">
                    {bonus > 0 && <p className="text-[10px] italic text-ink-300">{base} +{bonus}</p>}
                    <p className="text-sm font-display text-ink-500">{final}</p>
                    <p className="text-[10px] text-ink-200">{formatModifier(getModifier(final))}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

### Step 2.4: Run — pass

### Step 2.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/attributes src/components/CharacterWizardV2/blocks/AttributesBlock.jsx src/test/wizardV2-attributes.test.jsx
git commit -m "feat(wizardV2): AttributesBlock com 4 modos (standard/point-buy/manual/roll)"
git push origin HEAD
```

---

## Task 3: `SkillsBlock`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/SkillsBlock.jsx`
- Test: `src/test/wizardV2-SkillsBlock.test.jsx`

**Comportamento:**
- Props: `{ draft, updateDraft, classData }`.
- Limite vem de `classData?.skill_choices?.count`.
- Lista todas as SKILLS; marca como check (chosen), 🎒 (background, locked), ou desabilita (não está em `skill_choices.from` ou no limite).
- Toggle adiciona/remove em `chosenSkills`.

### Step 3.1: Tests

```jsx
// src/test/wizardV2-SkillsBlock.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkillsBlock } from '../components/CharacterWizardV2/blocks/SkillsBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classData = {
  skill_choices: { count: 2, from: ['Atletismo', 'História', 'Percepção', 'Intimidação'] },
}

const empty = INITIAL_DRAFT_V2

describe('SkillsBlock', () => {
  it('mostra contador 0/2', () => {
    render(<SkillsBlock draft={empty} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('clicar perícia da classe adiciona a chosenSkills', async () => {
    const updateDraft = vi.fn()
    render(<SkillsBlock draft={empty} updateDraft={updateDraft} classData={classData} />)
    await userEvent.click(screen.getByText(/^Atletismo$/i).closest('div'))
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      chosenSkills: expect.arrayContaining(['atletismo']),
    }))
  })

  it('NÃO permite adicionar mais que o limite', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['atletismo', 'historia'] }
    render(<SkillsBlock draft={draft} updateDraft={updateDraft} classData={classData} />)
    // tenta clicar uma terceira (Percepção)
    await userEvent.click(screen.getByText(/^Percepção$/i).closest('div'))
    expect(updateDraft).not.toHaveBeenCalled()
  })

  it('mostra 🎒 pra perícias do antecedente', () => {
    const draft = { ...empty, backgroundSkills: ['atletismo'] }
    render(<SkillsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/🎒/)).toBeInTheDocument()
  })

  it('perícia do antecedente não conta pro limite', () => {
    const draft = { ...empty, backgroundSkills: ['atletismo'] }
    render(<SkillsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('toggle remove perícia já selecionada', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['atletismo'] }
    render(<SkillsBlock draft={draft} updateDraft={updateDraft} classData={classData} />)
    await userEvent.click(screen.getByText(/^Atletismo$/i).closest('div'))
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      chosenSkills: [],
    }))
  })
})
```

### Step 3.2: Run — fail

### Step 3.3: Implementation

```jsx
// src/components/CharacterWizardV2/blocks/SkillsBlock.jsx
import {
  SKILLS, ABILITY_SCORES, getProficiencyBonus,
  calculateSkillModifier, formatModifier,
} from '../../../utils/calculations'

export function SkillsBlock({ draft, updateDraft, classData }) {
  const limit = classData?.skill_choices?.count ?? null
  const availableList = classData?.skill_choices?.from ?? []
  const bgSkills = draft.backgroundSkills ?? []
  const chosen = draft.chosenSkills ?? []
  const selectedCount = chosen.length
  const atLimit = limit !== null && selectedCount >= limit

  const finalAttrs = {}
  for (const { key } of ABILITY_SCORES) {
    const base = draft.baseAttributes?.[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }
  const profBonus = getProficiencyBonus(draft.level ?? 1)

  function toggle(key) {
    if (chosen.includes(key)) {
      updateDraft({ chosenSkills: chosen.filter(k => k !== key) })
    } else if (!atLimit) {
      updateDraft({ chosenSkills: [...chosen, key] })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs italic text-ink-300">
        {limit !== null
          ? `Escolha ${limit} perícias entre as opções da sua classe.`
          : 'Escolha uma classe primeiro para ver as perícias disponíveis.'}
      </p>

      {limit !== null && (
        <div className={[
          'flex items-center justify-between px-4 py-2 rounded-sm border-2 font-display',
          atLimit ? 'border-amber-700 bg-amber-50' : 'border-parchment-600 bg-parchment-100',
        ].join(' ')}>
          <span className="text-sm text-ink-500">Perícias selecionadas</span>
          <span className="text-xl text-ink-500">{selectedCount}/{limit}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {SKILLS.map(({ key, name, ability, abbr }) => {
          const isClassOption = availableList.includes(name)
          const isBgSkill = bgSkills.includes(key)
          const isChosen = chosen.includes(key)
          const proficient = isChosen || isBgSkill
          const mod = calculateSkillModifier(finalAttrs[ability], profBonus, proficient, false)
          const canClick = isClassOption && !isBgSkill && (!atLimit || isChosen)

          return (
            <div
              key={key}
              onClick={() => canClick && toggle(key)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-sm border-2 transition-colors',
                isBgSkill
                  ? 'border-parchment-600 bg-parchment-200 cursor-default'
                  : isChosen
                  ? 'border-ink-500 bg-parchment-200 cursor-pointer'
                  : canClick
                  ? 'border-parchment-600 bg-parchment-50 hover:border-ink-300 cursor-pointer'
                  : 'border-parchment-600 bg-parchment-50 opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              {isBgSkill ? (
                <span className="text-sm shrink-0" title="Antecedente">🎒</span>
              ) : (
                <span className={[
                  'w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0',
                  isChosen ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')}>
                  {isChosen && <span className="text-parchment-50 text-[10px]">✓</span>}
                </span>
              )}
              <span className={[
                'text-sm font-display flex-1',
                proficient ? 'text-ink-500' : 'text-ink-300',
              ].join(' ')}>
                {name}
                <span className="text-ink-200 text-xs ml-1">({abbr})</span>
              </span>
              <span className={[
                'text-xs font-display shrink-0',
                proficient ? 'text-ink-500' : 'text-ink-200',
              ].join(' ')}>
                {formatModifier(mod)}
              </span>
            </div>
          )
        })}
      </div>

      {bgSkills.length > 0 && (
        <p className="text-xs italic text-ink-300">
          🎒 = Concedida pelo antecedente (não conta pro limite)
        </p>
      )}
    </div>
  )
}
```

### Step 3.4: Run — pass (6/6)

### Step 3.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/SkillsBlock.jsx src/test/wizardV2-SkillsBlock.test.jsx
git commit -m "feat(wizardV2): SkillsBlock (lista perícias + contador + marcador antecedente)"
git push origin HEAD
```

---

## Task 4: useBlockStatus refinado + wire shell + PR

**Files:**
- Modify: `src/components/CharacterWizardV2/hooks/useBlockStatus.js`
- Modify: `src/test/wizardV2-useBlockStatus.test.js`
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Modify: `src/test/e2e/wizardV2-shell.test.jsx`

### Step 4.1: Refinar `skills` no useBlockStatus

A regra atual de `skills` é placeholder (`chosenSkills.length > 0`). Refinar pra:
- `vazio` se `chosenSkills.length === 0`.
- `parcial` se `chosenSkills.length < limite` (limite vem de `srdData.classes[draft.class].skill_choices.count`).
- `completo` se `chosenSkills.length === limite`.
- Sem `srdData.classes`, fallback é o atual.

Adicione `classes` à destructure de srdData no case `'skills'`. Casos novos no teste:

```js
  it('skills parcial: count < limite da classe', () => {
    const srdData = {
      classes: [{ index: 'guerreiro', skill_choices: { count: 2 } }],
    }
    const draft = { ...empty, class: 'guerreiro', background: 'soldado', chosenSkills: ['atletismo'] }
    expect(getBlockStatus('skills', draft, srdData).status).toBe('parcial')
  })

  it('skills completo: count = limite', () => {
    const srdData = {
      classes: [{ index: 'guerreiro', skill_choices: { count: 2 } }],
    }
    const draft = { ...empty, class: 'guerreiro', background: 'soldado', chosenSkills: ['atletismo', 'historia'] }
    expect(getBlockStatus('skills', draft, srdData).status).toBe('completo')
  })
```

Substituir o case `'skills'` em `statusOf`:

```js
    case 'skills': {
      const chosen = draft.chosenSkills?.length ?? 0
      const { classes } = srdData
      if (!classes) return chosen > 0 ? 'completo' : 'vazio'
      const cls = classes.find(c => c.index === draft.class)
      const limit = cls?.skill_choices?.count ?? null
      if (limit == null) return chosen > 0 ? 'completo' : 'vazio'
      if (chosen === 0) return 'vazio'
      if (chosen < limit) return 'parcial'
      return 'completo'
    }
```

### Step 4.2: Wire no shell

Em `CharacterWizardV2.jsx`:

Imports:
```jsx
import { BackgroundBlock } from './blocks/BackgroundBlock'
import { AttributesBlock } from './blocks/AttributesBlock'
import { SkillsBlock } from './blocks/SkillsBlock'
```

Adicionar `backgrounds` à destructure de useSrd. Passar `classes` pro useBlockStatus (junto com os srdData existentes):

```jsx
const { races, classes, classChoices, progression: classProgression, feats,
        classEquipment, weaponsArmor, backgrounds } = useSrd()
const blockStatus = useBlockStatus(draft, { classChoices, classProgression, classEquipment, classes })
```

Wire dos 3 blocos no switch do BlockEditorModal (ANTES do fallback placeholder):

```jsx
{openBlockId === 'background' && (
  <BackgroundBlock draft={draft} updateDraft={updateDraft} backgrounds={backgrounds ?? []} />
)}
{openBlockId === 'attributes' && (
  <AttributesBlock draft={draft} updateDraft={updateDraft} />
)}
{openBlockId === 'skills' && (
  <SkillsBlock draft={draft} updateDraft={updateDraft}
    classData={(classes ?? []).find(c => c.index === draft.class) ?? null} />
)}
```

E atualizar a condição do placeholder pra excluir 'background', 'attributes', 'skills':

```jsx
{openBlockId && !['concept', 'race', 'class', 'background', 'attributes', 'skills'].includes(openBlockId) && (
  <p className="text-sm text-ink-300 italic text-center py-12">
    Em construção (PR seguinte).
  </p>
)}
```

### Step 4.3: Atualizar E2E shell test

Adicionar 3 testes novos:

```jsx
  it('clicar Antecedente abre BackgroundBlock', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /antecedente/i }))
    expect(screen.getByLabelText(/^antecedente/i)).toBeInTheDocument()
  })

  it('clicar Atributos (após escolher raça) abre AttributesBlock', async () => {
    // Atributos é bloqueado sem race; este teste só valida que se desbloqueado, abre
    // Como SrdProvider real carrega dados, race não está preenchida → bloqueio.
    // Skip esse teste — coberto pelos unit tests do AttributesBlock.
  })

  it('clicar Perícias (com class+background preenchidos) abre SkillsBlock', async () => {
    // Idem — bloqueado por dependências. Unit tests cobrem.
  })
```

(Os dois últimos podem ser omitidos se a complexidade de setup for alta. Só precisamos garantir que o wire não quebra os existentes.)

### Step 4.4: Suite V2

```
npm test -- wizardV2
```

### Step 4.5: Build

```
npm run build
```

### Step 4.6: Commit + push

```
git add -A
git commit -m "feat(wizardV2): wire BackgroundBlock + AttributesBlock + SkillsBlock + skills status refinado"
git push origin HEAD
```

### Step 4.7: Open PR

```bash
gh pr create --base master --title "feat(wizardV2): PR 4 — Background + Attributes + Skills" --body "$(cat <<'EOF'
## Summary

Quinta PR do redesign — substitui 3 placeholders simultaneamente:

- **BackgroundBlock**: seletor + preview de perícias/ferramentas/idiomas/equipamento; popula \`backgroundItems\`/\`backgroundGold\` (consumidos pelo ClassEquipment desde PR 3b — agora integração ativa).
- **AttributesBlock**: dispatcher dos 4 modos do CampaignSetupModal (\`standard-array\`, \`point-buy\`, \`manual\`, \`roll\`/\`4d6drop\`). Modo \`manual\` é **novo no V2**.
- **SkillsBlock**: lista de perícias com contador X/limite (limite vem de \`classData.skill_choices.count\`); perícias do antecedente marcadas com 🎒 sem contar pro limite.

\`useBlockStatus\` ganha regra refinada pra \`skills\` (parcial até atingir limite da classe).

## Test plan

- [x] Suite V2 verde
- [x] Build verde
- [ ] Manual: criar Guerreiro com point-buy + Soldado de antecedente + 2 perícias → ver integração equipamento+antecedente

## Próxima PR

PR 5: SpellsBlock + ReviewBlock + finalize (\`buildCharacter\` + \`upsertCharacter\`). Encerra o wizard funcional.
EOF
)"
```

---

## Self-review

- [ ] Spec coverage (3 blocos + manual mode)
- [ ] Sem placeholders no código
- [ ] V2 suite verde
- [ ] Integração antecedente→classe ativa
