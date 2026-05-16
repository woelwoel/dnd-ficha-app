# Wizard V2 — PR 3b: ClassEquipment (com integração ao antecedente)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Fechar o bloco Classe — substituir o placeholder "Equipamento: PR 3b" por componente real. Inclui escolha entre equipamento da classe vs ouro inicial, sub-pickers de arma/instrumento, **integração com itens/ouro do antecedente** (feature nova do V2).

**Branch:** `claude/wizard-v2-pr3b` (já criada).
**Base:** PR 3a mergeada — ClassBlock funcional com placeholder de equipamento.

---

## Visão geral

Após esta PR:
1. Dentro do modal "Classe", aparece a seção Equipamento (substitui o placeholder).
2. Toggle entre **🎒 Equipamento da Classe** e **🪙 Ouro Inicial**.
3. Modo equipamento: choice groups com sub-pickers (ex: "Arma marcial + escudo OU duas armas marciais"), itens fixos.
4. Modo ouro: rola fórmula e mostra valor.
5. **Novo no V2**: chip "+X PO de antecedente" abaixo do gold, e seção "Itens do antecedente" listando `draft.backgroundItems`.
6. `useBlockStatus` para `class` agora considera equipamento — `parcial` se escolha de equip/ouro pendente.

---

## Estrutura

```
src/components/CharacterWizardV2/blocks/class/
├── equipment-helpers.js                  // rollGoldFormula, computePreviewItems, allPicksDone
├── WeaponPicker.jsx                      // sub-picker de armas/instrumentos por categoria
├── EquipmentChoiceGroup.jsx              // 1 group de choice (opções + sub-pickers)
└── ClassEquipment.jsx                    // composição (toggle + groups + fixed + preview + background)

ClassBlock.jsx                            // MODIFICAR: trocar placeholder por <ClassEquipment ...>
useBlockStatus.js                         // MODIFICAR: class considera equipamento via srdData.classEquipment
CharacterWizardV2.jsx                     // MODIFICAR: passar classEquipment + weaponsArmor pro ClassBlock
```

---

## Task 1: `equipment-helpers.js`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/equipment-helpers.js`
- Test: `src/test/wizardV2-equipment-helpers.test.js`

**API:**
- `rollGoldFormula(formula)` — interpreta "5d4 × 10" e retorna número rolado.
- `allPicksDone(classEquipmentData, choices, picks)` — true se todas as escolhas + picks obrigatórios resolvidos.
- `computePreviewItems(classEquipmentData, choices, picks)` — retorna array `[{name, qty}]` dos itens finais.

### Step 1.1: Tests

```js
// src/test/wizardV2-equipment-helpers.test.js
import { describe, it, expect, vi } from 'vitest'
import {
  rollGoldFormula, allPicksDone, computePreviewItems,
} from '../components/CharacterWizardV2/blocks/class/equipment-helpers'

describe('rollGoldFormula', () => {
  it('5d4 × 10 retorna entre 50 e 200', () => {
    const v = rollGoldFormula('5d4 × 10')
    expect(v).toBeGreaterThanOrEqual(50)
    expect(v).toBeLessThanOrEqual(200)
  })
  it('fallback pra 5d4 × 10 se formula vazia', () => {
    const v = rollGoldFormula(null)
    expect(v).toBeGreaterThanOrEqual(50)
    expect(v).toBeLessThanOrEqual(200)
  })
})

const sampleData = {
  choices: [
    { id: 'weapon', prompt: 'Arma', options: [
      { value: 'longsword', label: 'Espada longa', items: [{ name: 'Espada longa', qty: 1 }] },
      { value: 'martial-choice', label: 'Qualquer marcial', items: [{ pick: 'martial', pickLabel: 'Arma marcial' }] },
    ]},
  ],
  fixed: [
    { name: 'Mochila', qty: 1 },
    { pick: 'simple', pickLabel: 'Arma simples extra', name: 'Arma simples' },
  ],
}

describe('allPicksDone', () => {
  it('true quando nada que precisa de pick', () => {
    expect(allPicksDone({ choices: [], fixed: [] }, {}, {})).toBe(true)
  })
  it('false sem nenhuma escolha feita', () => {
    expect(allPicksDone(sampleData, {}, {})).toBe(false)
  })
  it('false quando escolha precisa de pick e pick está vazio', () => {
    expect(allPicksDone(sampleData, { weapon: 'martial-choice' }, {})).toBe(false)
  })
  it('true quando todos picks resolvidos', () => {
    const picks = {
      'weapon:martial-choice:0': 'Machado',
      'fixed:Arma simples': 'Adaga',
    }
    expect(allPicksDone(sampleData, { weapon: 'martial-choice' }, picks)).toBe(true)
  })
  it('true sem classEquipmentData', () => {
    expect(allPicksDone(null, {}, {})).toBe(true)
  })
})

describe('computePreviewItems', () => {
  it('[] sem data', () => expect(computePreviewItems(null, {}, {})).toEqual([]))
  it('inclui itens fixos sem pick', () => {
    const r = computePreviewItems(sampleData, {}, {})
    expect(r).toContainEqual({ name: 'Mochila', qty: 1 })
  })
  it('inclui pick resolvido em choice', () => {
    const r = computePreviewItems(
      sampleData,
      { weapon: 'martial-choice' },
      { 'weapon:martial-choice:0': 'Machado' },
    )
    expect(r).toContainEqual({ name: 'Machado', qty: 1 })
  })
  it('inclui pick fixo resolvido', () => {
    const r = computePreviewItems(
      sampleData, {}, { 'fixed:Arma simples': 'Adaga' },
    )
    expect(r).toContainEqual({ name: 'Adaga', qty: 1 })
  })
  it('inclui itens não-pick da opção escolhida', () => {
    const r = computePreviewItems(sampleData, { weapon: 'longsword' }, {})
    expect(r).toContainEqual({ name: 'Espada longa', qty: 1 })
  })
})
```

### Step 1.2: Run — fail

```
npm test -- wizardV2-equipment-helpers
```

### Step 1.3: Implementation

```js
// src/components/CharacterWizardV2/blocks/class/equipment-helpers.js

export function rollGoldFormula(formula) {
  // Format: "NdM × K" (ex: "5d4 × 10"). Fallback: 5d4 × 10.
  const m = (formula ?? '5d4 × 10').match(/(\d+)d(\d+)\s*[×x*]\s*(\d+)/i)
  const n = m ? Number(m[1]) : 5
  const sides = m ? Number(m[2]) : 4
  const mult = m ? Number(m[3]) : 10
  let total = 0
  for (let i = 0; i < n; i++) total += Math.ceil(Math.random() * sides)
  return total * mult
}

export function allPicksDone(classEquipmentData, choices, picks) {
  if (!classEquipmentData) return true
  for (const choice of classEquipmentData.choices ?? []) {
    const sel = choices?.[choice.id]
    if (!sel) return false
    const opt = choice.options.find(o => o.value === sel)
    if (!opt) continue
    for (let i = 0; i < (opt.items ?? []).length; i++) {
      if (opt.items[i].pick && !picks?.[`${choice.id}:${sel}:${i}`]) return false
    }
  }
  for (const item of classEquipmentData.fixed ?? []) {
    if (item.pick && !picks?.[`fixed:${item.name}`]) return false
  }
  return true
}

export function computePreviewItems(classEquipmentData, choices, picks) {
  if (!classEquipmentData) return []
  const items = []
  for (const choice of classEquipmentData.choices ?? []) {
    const sel = choices?.[choice.id]
    if (!sel) continue
    const opt = choice.options.find(o => o.value === sel)
    if (!opt) continue
    ;(opt.items ?? []).forEach((item, idx) => {
      if (item.pick) {
        const picked = picks?.[`${choice.id}:${sel}:${idx}`]
        if (picked) items.push({ name: picked, qty: 1 })
      } else {
        items.push(item)
      }
    })
  }
  for (const item of classEquipmentData.fixed ?? []) {
    if (item.pick) {
      const picked = picks?.[`fixed:${item.name}`]
      if (picked) items.push({ name: picked, qty: 1 })
    } else {
      items.push(item)
    }
  }
  return items
}
```

### Step 1.4: Run — pass

```
npm test -- wizardV2-equipment-helpers
```

### Step 1.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/class/equipment-helpers.js src/test/wizardV2-equipment-helpers.test.js
git commit -m "feat(wizardV2): equipment-helpers (rollGoldFormula, allPicksDone, computePreviewItems)"
git push origin HEAD
```

---

## Task 2: `WeaponPicker.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/WeaponPicker.jsx`
- Test: `src/test/wizardV2-WeaponPicker.test.jsx`

Lista filtrada de armas (ou instrumentos) por categoria, com seleção via radio. Estilo parchment.

### Step 2.1: Tests

```jsx
// src/test/wizardV2-WeaponPicker.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeaponPicker } from '../components/CharacterWizardV2/blocks/class/WeaponPicker'

const weaponsArmor = {
  weapons: [
    { index: 'shortsword', name: 'Espada curta', category: 'simple-melee', damage: '1d6 perfurante' },
    { index: 'longsword', name: 'Espada longa', category: 'martial-melee', damage: '1d8 cortante' },
    { index: 'crossbow-light', name: 'Besta leve', category: 'simple-ranged', damage: '1d8 perfurante' },
  ],
  instruments: [
    { index: 'lyre', name: 'Lira' },
    { index: 'drum', name: 'Tambor' },
  ],
}

describe('WeaponPicker', () => {
  it('filtra simples (melee + ranged)', () => {
    render(<WeaponPicker category="simple" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /espada curta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /besta leve/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /espada longa/i })).not.toBeInTheDocument()
  })

  it('filtra marciais (melee + ranged)', () => {
    render(<WeaponPicker category="martial" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /espada longa/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /espada curta/i })).not.toBeInTheDocument()
  })

  it('mostra instrumentos quando category=instrument', () => {
    render(<WeaponPicker category="instrument" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /lira/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tambor/i })).toBeInTheDocument()
  })

  it('clicar dispara onPick(pickKey, name)', async () => {
    const onPick = vi.fn()
    render(<WeaponPicker category="simple" pickKey="weapon:x:0" currentValue=""
      weaponsArmor={weaponsArmor} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /espada curta/i }))
    expect(onPick).toHaveBeenCalledWith('weapon:x:0', 'Espada curta')
  })

  it('null se lista vazia', () => {
    const { container } = render(<WeaponPicker category="exotic" pickKey="x" currentValue=""
      weaponsArmor={weaponsArmor} onPick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
```

### Step 2.2: Run — fail

### Step 2.3: Implementation

```jsx
// src/components/CharacterWizardV2/blocks/class/WeaponPicker.jsx
export function WeaponPicker({ category, pickKey, currentValue, weaponsArmor, onPick }) {
  const allWeapons = weaponsArmor?.weapons ?? []
  const allInstruments = weaponsArmor?.instruments ?? []

  const list = category === 'instrument'
    ? allInstruments
    : allWeapons.filter(w => {
        if (category === 'simple')  return w.category === 'simple-melee'  || w.category === 'simple-ranged'
        if (category === 'martial') return w.category === 'martial-melee' || w.category === 'martial-ranged'
        return w.category === category
      })

  if (list.length === 0) return null

  return (
    <div className="mt-2 border-2 border-parchment-600 bg-parchment-50 rounded-sm overflow-hidden">
      <div className="max-h-48 overflow-y-auto divide-y divide-parchment-600/40">
        {list.map(item => {
          const isSelected = currentValue === item.name
          const stats = item.damage
            ? `${item.damage}${item.props?.length ? ' · ' + item.props.join(', ') : ''}`
            : null
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onPick(pickKey, item.name)}
              className={[
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                isSelected
                  ? 'bg-parchment-200 text-ink-500'
                  : 'hover:bg-parchment-100 text-ink-300',
              ].join(' ')}
            >
              <span className={[
                'w-2.5 h-2.5 rounded-full border-2 shrink-0',
                isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
              ].join(' ')} />
              <span className="font-display flex-1">{item.name}</span>
              {stats && <span className="text-ink-200 text-[10px] shrink-0 italic">{stats}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

### Step 2.4: Run — pass (5/5)

### Step 2.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/class/WeaponPicker.jsx src/test/wizardV2-WeaponPicker.test.jsx
git commit -m "feat(wizardV2): WeaponPicker (filtra armas/instrumentos por categoria)"
git push origin HEAD
```

---

## Task 3: `EquipmentChoiceGroup.jsx`

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup.jsx`
- Test: `src/test/wizardV2-EquipmentChoiceGroup.test.jsx`

Renderiza UM grupo de escolha (radio entre opções, cada opção pode ter sub-pickers de arma).

### Step 3.1: Tests

```jsx
// src/test/wizardV2-EquipmentChoiceGroup.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EquipmentChoiceGroup } from '../components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup'

const weaponsArmor = { weapons: [
  { index: 'longsword', name: 'Espada longa', category: 'martial-melee', damage: '1d8' },
  { index: 'axe', name: 'Machado', category: 'martial-melee', damage: '1d8' },
], instruments: [] }

const choice = {
  id: 'weapon',
  prompt: 'Escolha sua arma marcial',
  options: [
    { value: 'longsword-shield', label: 'Espada longa + Escudo', items: [
      { name: 'Espada longa', qty: 1 }, { name: 'Escudo', qty: 1 },
    ]},
    { value: 'martial-choice', label: 'Qualquer arma marcial', items: [
      { pick: 'martial', pickLabel: 'Arma marcial' },
    ]},
  ],
}

describe('EquipmentChoiceGroup', () => {
  it('renderiza prompt e ambas as opções', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    expect(screen.getByText(/escolha sua arma marcial/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /espada longa \+ escudo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qualquer arma marcial/i })).toBeInTheDocument()
  })

  it('clicar opção dispara onSelectOption(choiceId, value)', async () => {
    const onSelectOption = vi.fn()
    render(<EquipmentChoiceGroup choice={choice} selected="" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={onSelectOption} onPick={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /espada longa \+ escudo/i }))
    expect(onSelectOption).toHaveBeenCalledWith('weapon', 'longsword-shield')
  })

  it('mostra WeaponPicker quando opção selecionada tem item com pick', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="martial-choice" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /^espada longa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^machado/i })).toBeInTheDocument()
  })

  it('NÃO mostra WeaponPicker pra opções não selecionadas', () => {
    render(<EquipmentChoiceGroup choice={choice} selected="longsword-shield" picks={{}}
      weaponsArmor={weaponsArmor} onSelectOption={() => {}} onPick={() => {}} />)
    // Não renderiza o WeaponPicker pra martial-choice
    expect(screen.queryByText(/arma marcial \*/i)).not.toBeInTheDocument()
  })
})
```

### Step 3.2: Run — fail

### Step 3.3: Implementation

```jsx
// src/components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup.jsx
import { WeaponPicker } from './WeaponPicker'

export function EquipmentChoiceGroup({ choice, selected, picks, weaponsArmor, onSelectOption, onPick }) {
  return (
    <fieldset className={[
      'border-2 rounded-sm p-3 flex flex-col gap-2',
      selected ? 'border-emerald-700 bg-emerald-50/30' : 'border-amber-700 bg-amber-50/30',
    ].join(' ')}>
      <legend className="px-2 text-[11px] font-display tracking-widest uppercase text-ink-500">
        {choice.prompt}{!selected && <span className="text-red-700 ml-1">*</span>}
      </legend>

      <div className="flex flex-col gap-1.5">
        {choice.options.map(opt => {
          const isSelected = selected === opt.value
          return (
            <div key={opt.value}>
              <button
                type="button"
                onClick={() => onSelectOption(choice.id, opt.value)}
                className={[
                  'w-full flex items-start gap-2 text-left px-3 py-2 rounded-sm border-2 text-xs transition-colors',
                  isSelected
                    ? 'border-ink-500 bg-parchment-200 text-ink-500'
                    : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                ].join(' ')}
              >
                <span className={[
                  'w-3 h-3 rounded-full border-2 shrink-0 mt-0.5',
                  isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')} />
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="font-display">{opt.label}</span>
                  <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {opt.items.map((item, idx) => (
                      <span key={idx} className="text-[10px] text-ink-200 italic">
                        {item.pick
                          ? <>📌 {item.pickLabel ?? item.name} (à escolher)</>
                          : <>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}{item.desc && ` · ${item.desc}`}</>
                        }
                      </span>
                    ))}
                  </span>
                </span>
              </button>

              {isSelected && opt.items.map((item, itemIdx) => {
                if (!item.pick) return null
                const pickKey = `${choice.id}:${opt.value}:${itemIdx}`
                const pickedValue = picks?.[pickKey] ?? ''
                return (
                  <div key={`pick-${itemIdx}`} className="mt-1.5 ml-5">
                    <p className="text-[10px] font-display text-ink-500 mb-1">
                      📌 {item.pickLabel ?? item.name}
                      {!pickedValue && <span className="text-red-700 ml-1">*</span>}
                      {pickedValue && <span className="text-emerald-700 ml-2">→ {pickedValue}</span>}
                    </p>
                    <WeaponPicker
                      category={item.pick}
                      pickKey={pickKey}
                      currentValue={pickedValue}
                      weaponsArmor={weaponsArmor}
                      onPick={onPick}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
```

### Step 3.4: Run — pass (4/4)

### Step 3.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup.jsx src/test/wizardV2-EquipmentChoiceGroup.test.jsx
git commit -m "feat(wizardV2): EquipmentChoiceGroup (radio + sub-pickers inline)"
git push origin HEAD
```

---

## Task 4: `ClassEquipment.jsx` (composição)

**Files:**
- Create: `src/components/CharacterWizardV2/blocks/class/ClassEquipment.jsx`
- Test: `src/test/wizardV2-ClassEquipment.test.jsx`

Composição principal:
- Toggle equipamento/ouro
- Modo equip: itera choice groups + lista fixed items + preview
- Modo ouro: botão rola fórmula
- **Integração antecedente**: se `draft.backgroundItems.length > 0` ou `draft.backgroundGold > 0`, mostra chips/seção com esses valores (em qualquer modo)

### Step 4.1: Tests

```jsx
// src/test/wizardV2-ClassEquipment.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassEquipment } from '../components/CharacterWizardV2/blocks/class/ClassEquipment'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classData = { gold_formula: '5d4 × 10' }

const classEquipmentData = {
  choices: [
    { id: 'weapon', prompt: 'Arma', options: [
      { value: 'longsword', label: 'Espada longa', items: [{ name: 'Espada longa', qty: 1 }] },
    ]},
  ],
  fixed: [
    { name: 'Mochila', qty: 1 },
  ],
}

const weaponsArmor = { weapons: [], instruments: [] }
const empty = INITIAL_DRAFT_V2

describe('ClassEquipment', () => {
  it('renderiza toggle Equipamento/Ouro', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByRole('button', { name: /equipamento da classe/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ouro inicial/i })).toBeInTheDocument()
  })

  it('modo equipamento (default): mostra choice groups + fixed items', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/arma/i)).toBeInTheDocument()
    expect(screen.getByText(/mochila/i)).toBeInTheDocument()
  })

  it('toggle Ouro mostra fórmula e botão Rolar', async () => {
    const updateDraft = vi.fn()
    render(<ClassEquipment draft={empty} updateDraft={updateDraft}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    await userEvent.click(screen.getByRole('button', { name: /ouro inicial/i }))
    expect(updateDraft).toHaveBeenCalledWith({ classEquipmentChoice: 'gold' })
  })

  it('modo ouro: clicar Rolar dispara updateDraft com classStartingGold > 0', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, classEquipmentChoice: 'gold' }
    render(<ClassEquipment draft={draft} updateDraft={updateDraft}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    await userEvent.click(screen.getByRole('button', { name: /rolar/i }))
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      classStartingGold: expect.any(Number),
    }))
    const call = updateDraft.mock.calls[0][0]
    expect(call.classStartingGold).toBeGreaterThan(0)
  })

  it('integração antecedente: mostra "+X PO de antecedente" se backgroundGold > 0', () => {
    const draft = { ...empty, classEquipmentChoice: 'gold', backgroundGold: 15 }
    render(<ClassEquipment draft={draft} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/\+15 po.*antecedente/i)).toBeInTheDocument()
  })

  it('integração antecedente: lista backgroundItems se presentes', () => {
    const draft = { ...empty, backgroundItems: [{ name: 'Insígnia militar', qty: 1 }, { name: 'Baralho', qty: 1 }] }
    render(<ClassEquipment draft={draft} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.getByText(/itens do antecedente/i)).toBeInTheDocument()
    expect(screen.getByText(/insígnia militar/i)).toBeInTheDocument()
    expect(screen.getByText(/baralho/i)).toBeInTheDocument()
  })

  it('NÃO mostra seção antecedente quando vazio', () => {
    render(<ClassEquipment draft={empty} updateDraft={() => {}}
      selectedClass={classData} classEquipmentData={classEquipmentData} weaponsArmor={weaponsArmor} />)
    expect(screen.queryByText(/itens do antecedente/i)).not.toBeInTheDocument()
  })
})
```

### Step 4.2: Run — fail

### Step 4.3: Implementation

```jsx
// src/components/CharacterWizardV2/blocks/class/ClassEquipment.jsx
import { EquipmentChoiceGroup } from './EquipmentChoiceGroup'
import { WeaponPicker } from './WeaponPicker'
import {
  rollGoldFormula, allPicksDone, computePreviewItems,
} from './equipment-helpers'

export function ClassEquipment({ draft, updateDraft, selectedClass, classEquipmentData, weaponsArmor }) {
  const isEquipment = (draft.classEquipmentChoice ?? 'equipment') !== 'gold'
  const choices = draft.classEquipmentChoices ?? {}
  const picks = draft.classEquipmentPicks ?? {}

  function setOptionChoice(choiceId, value) {
    const newPicks = { ...picks }
    Object.keys(newPicks).forEach(k => { if (k.startsWith(`${choiceId}:`)) delete newPicks[k] })
    updateDraft({
      classEquipmentChoices: { ...choices, [choiceId]: value },
      classEquipmentPicks: newPicks,
    })
  }

  function setPick(pickKey, weaponName) {
    updateDraft({ classEquipmentPicks: { ...picks, [pickKey]: weaponName } })
  }

  const totalChoices = classEquipmentData?.choices?.length ?? 0
  const doneChoices = (classEquipmentData?.choices ?? []).filter(c => !!choices[c.id]).length
  const picksOk = allPicksDone(classEquipmentData, choices, picks)
  const allDone = doneChoices === totalChoices && picksOk
  const preview = isEquipment ? computePreviewItems(classEquipmentData, choices, picks) : []

  const bgItems = draft.backgroundItems ?? []
  const bgGold = draft.backgroundGold ?? 0
  const hasBackgroundContent = bgItems.length > 0 || bgGold > 0

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-display tracking-widest uppercase text-ink-500">Equipamento Inicial</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'equipment', classStartingGold: 0 })}
          className={[
            'flex-1 px-3 py-2 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
            isEquipment
              ? 'bg-parchment-200 border-ink-500 text-ink-500'
              : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300',
          ].join(' ')}
        >
          🎒 Equipamento da Classe
        </button>
        <button
          type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'gold' })}
          className={[
            'flex-1 px-3 py-2 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
            !isEquipment
              ? 'bg-parchment-200 border-ink-500 text-ink-500'
              : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300',
          ].join(' ')}
        >
          🪙 Ouro Inicial {selectedClass?.gold_formula ? `(${selectedClass.gold_formula} PO)` : ''}
        </button>
      </div>

      {isEquipment && classEquipmentData && (
        <div className="flex flex-col gap-2">
          {totalChoices > 0 && (
            <div className={[
              'px-2 py-1 rounded-sm text-[11px] font-display border-2',
              allDone
                ? 'bg-emerald-50 border-emerald-700 text-emerald-700'
                : 'bg-amber-50 border-amber-700 text-amber-700',
            ].join(' ')}>
              {allDone ? '✓ Todas as escolhas feitas' : `⚠ ${doneChoices}/${totalChoices} escolha${totalChoices > 1 ? 's' : ''}`}
            </div>
          )}

          {(classEquipmentData.choices ?? []).map(choice => (
            <EquipmentChoiceGroup
              key={choice.id}
              choice={choice}
              selected={choices[choice.id] ?? ''}
              picks={picks}
              weaponsArmor={weaponsArmor}
              onSelectOption={setOptionChoice}
              onPick={setPick}
            />
          ))}

          {(classEquipmentData.fixed ?? []).length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex flex-col gap-2">
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">Incluído automaticamente</p>
              <div className="flex flex-col gap-1.5">
                {classEquipmentData.fixed.filter(i => !i.pick).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-sm bg-parchment-50 border border-parchment-600">
                    <span className="text-ink-300 text-[11px] mt-0.5 shrink-0">✦</span>
                    <div className="min-w-0">
                      <span className="text-xs font-display text-ink-500">
                        {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                      </span>
                      {item.desc && (
                        <p className="text-[10px] italic text-ink-200 mt-0.5 leading-snug">{item.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {classEquipmentData.fixed.filter(i => i.pick).map((item, fixIdx) => {
                const pickKey = `fixed:${item.name}`
                const pickedValue = picks[pickKey] ?? ''
                return (
                  <div key={`fixed-pick-${fixIdx}`}>
                    <p className="text-[10px] font-display text-ink-500 mb-1">
                      📌 {item.pickLabel ?? item.name} (à escolher)
                      {!pickedValue && <span className="text-red-700 ml-1">*</span>}
                      {pickedValue && <span className="text-emerald-700 ml-2">→ {pickedValue}</span>}
                    </p>
                    <WeaponPicker
                      category={item.pick}
                      pickKey={pickKey}
                      currentValue={pickedValue}
                      weaponsArmor={weaponsArmor}
                      onPick={setPick}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {allDone && preview.length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm p-3">
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-1.5">Equipamento final</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((item, i) => (
                  <span key={i} className="text-xs font-display bg-parchment-100 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-500">
                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isEquipment && (
        <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] italic text-ink-300">Fórmula de ouro inicial:</p>
            <p className="text-sm font-display text-ink-500">{selectedClass?.gold_formula ?? '5d4 × 10'} PO</p>
            {bgGold > 0 && (
              <p className="text-[11px] italic text-ink-300 mt-0.5">+{bgGold} PO do antecedente</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => updateDraft({ classStartingGold: rollGoldFormula(selectedClass?.gold_formula ?? '5d4 × 10') })}
            className="px-3 py-1.5 bg-ink-500 hover:bg-ink-600 text-parchment-50 text-xs font-display rounded-sm transition-colors"
          >
            🎲 Rolar
          </button>
          {(draft.classStartingGold ?? 0) > 0 && (
            <span className="text-ink-500 font-display text-lg">{draft.classStartingGold} PO</span>
          )}
        </div>
      )}

      {hasBackgroundContent && bgItems.length > 0 && (
        <div className="border-2 border-dashed border-parchment-600 bg-parchment-50 rounded-sm p-3">
          <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-1.5">Itens do antecedente</p>
          <div className="flex flex-wrap gap-1.5">
            {bgItems.map((item, i) => (
              <span key={i} className="text-xs italic bg-parchment-100 border border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 4.4: Run — pass (7/7)

### Step 4.5: Commit + push

```
git add src/components/CharacterWizardV2/blocks/class/ClassEquipment.jsx src/test/wizardV2-ClassEquipment.test.jsx
git commit -m "feat(wizardV2): ClassEquipment com toggle equip/ouro + integração antecedente"
git push origin HEAD
```

---

## Task 5: Wire em ClassBlock + useBlockStatus + shell + PR

**Files:**
- Modify: `src/components/CharacterWizardV2/blocks/ClassBlock.jsx`
- Modify: `src/components/CharacterWizardV2/CharacterWizardV2.jsx`
- Modify: `src/components/CharacterWizardV2/hooks/useBlockStatus.js`
- Modify: `src/test/wizardV2-ClassBlock.test.jsx` (atualizar teste do placeholder)
- Modify: `src/test/wizardV2-useBlockStatus.test.js` (acrescentar casos de equipment)

### Step 5.1: Modify `ClassBlock.jsx`

Add import:
```jsx
import { ClassEquipment } from './class/ClassEquipment'
```

Add 2 new props: `classEquipment = {}, weaponsArmor = {}` to component signature.

Replace the placeholder div:
```jsx
<div className="border-2 border-dashed border-parchment-600 bg-parchment-50 rounded-sm p-3 text-center">
  <p className="text-xs italic text-ink-300">Equipamento: PR 3b (em construção)</p>
</div>
```

With:
```jsx
<ClassEquipment
  draft={draft} updateDraft={updateDraft}
  selectedClass={selectedClass}
  classEquipmentData={classEquipment[draft.class] ?? null}
  weaponsArmor={weaponsArmor}
/>
```

### Step 5.2: Update `wizardV2-ClassBlock.test.jsx`

Replace the "mostra placeholder de equipamento" test with:

```jsx
  it('mostra ClassEquipment quando classe escolhida', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/equipamento inicial/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /equipamento da classe/i })).toBeInTheDocument()
  })
```

### Step 5.3: Modify `CharacterWizardV2.jsx`

Expand useSrd destructure to also pull `classEquipment` and `weaponsArmor`:

```jsx
const { races, classes, classChoices, progression: classProgression, feats,
        classEquipment, weaponsArmor } = useSrd()
```

Pass them to ClassBlock:

```jsx
{openBlockId === 'class' && (
  <ClassBlock
    draft={draft} updateDraft={updateDraft}
    classes={classes ?? []} classChoices={classChoices ?? {}}
    classProgression={classProgression ?? {}} feats={feats ?? []}
    classEquipment={classEquipment ?? {}} weaponsArmor={weaponsArmor ?? {}}
  />
)}
```

### Step 5.4: Refinar `useBlockStatus.js` para incluir equipamento na regra de class

Adicione no topo:
```js
import { allPicksDone } from '../blocks/class/equipment-helpers'
```

No case `'class'`, antes do `return 'completo'` final, adicione:

```js
      const { classEquipment } = srdData
      if (classEquipment) {
        const eqData = classEquipment[draft.class]
        // Se classe tem dados de equipamento e usuário escolheu modo 'equipment' (default),
        // todas as escolhas + picks devem estar resolvidos.
        const mode = draft.classEquipmentChoice ?? 'equipment'
        if (mode === 'equipment' && eqData) {
          const totalChoices = eqData.choices?.length ?? 0
          const doneChoices = (eqData.choices ?? []).filter(c =>
            !!draft.classEquipmentChoices?.[c.id]
          ).length
          if (doneChoices < totalChoices) return 'parcial'
          if (!allPicksDone(eqData, draft.classEquipmentChoices ?? {}, draft.classEquipmentPicks ?? {})) return 'parcial'
        }
        // Modo ouro: precisa ter rolado (classStartingGold > 0)
        if (mode === 'gold' && (draft.classStartingGold ?? 0) === 0) return 'parcial'
      }
```

Add tests at the end of `wizardV2-useBlockStatus.test.js` describe:

```js
  it('class parcial: equipamento com escolha pendente', () => {
    const srdData = {
      classEquipment: { guerreiro: { choices: [
        { id: 'weapon', options: [{ value: 'longsword' }] },
      ], fixed: [] }},
    }
    const draft = { ...empty, class: 'guerreiro', level: 1 }
    expect(getBlockStatus('class', draft, srdData).status).toBe('parcial')
  })

  it('class completo: equipamento com escolha feita', () => {
    const srdData = {
      classEquipment: { guerreiro: { choices: [
        { id: 'weapon', options: [{ value: 'longsword' }] },
      ], fixed: [] }},
    }
    const draft = {
      ...empty, class: 'guerreiro', level: 1,
      classEquipmentChoices: { weapon: 'longsword' },
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('completo')
  })

  it('class parcial: modo ouro sem rolar', () => {
    const srdData = {
      classEquipment: { guerreiro: { choices: [], fixed: [] }},
    }
    const draft = {
      ...empty, class: 'guerreiro', level: 1,
      classEquipmentChoice: 'gold', classStartingGold: 0,
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('parcial')
  })

  it('class completo: modo ouro rolado', () => {
    const srdData = {
      classEquipment: { guerreiro: { choices: [], fixed: [] }},
    }
    const draft = {
      ...empty, class: 'guerreiro', level: 1,
      classEquipmentChoice: 'gold', classStartingGold: 75,
    }
    expect(getBlockStatus('class', draft, srdData).status).toBe('completo')
  })
```

E passe `classEquipment` no destructure de srdData no shell:

No `CharacterWizardV2.jsx`, mude:
```jsx
const blockStatus = useBlockStatus(draft, { classChoices, classProgression })
```
Para:
```jsx
const blockStatus = useBlockStatus(draft, { classChoices, classProgression, classEquipment })
```

### Step 5.5: Run all V2 tests

```
npm test -- wizardV2
```
Esperado: todos verdes.

### Step 5.6: Build

```
npm run build
```

### Step 5.7: Commit + push

```
git add -A
git commit -m "feat(wizardV2): wire ClassEquipment no shell + useBlockStatus equipment-aware"
git push origin HEAD
```

### Step 5.8: Open PR

```bash
gh pr create --base master --title "feat(wizardV2): PR 3b — ClassEquipment + integração com antecedente" --body "$(cat <<'EOF'
## Summary

Quarta PR do redesign — fecha o bloco **Classe** substituindo o placeholder de equipamento por componente real, com a feature nova prometida pela spec: **integração com itens/ouro do antecedente**.

- \`ClassEquipment\`: toggle Equipamento/Ouro + choice groups + fixed items + preview final
- \`EquipmentChoiceGroup\`: 1 grupo de escolha com radio + sub-pickers de arma inline
- \`WeaponPicker\`: filtra armas/instrumentos por categoria (simples/marcial/instrumento)
- \`equipment-helpers\`: lógica pura (rollGoldFormula, allPicksDone, computePreviewItems)
- **Integração antecedente**: chip "+X PO de antecedente" no modo ouro; seção "Itens do antecedente" listando \`draft.backgroundItems\`
- \`useBlockStatus\`: class fica \`parcial\` se equipamento pendente

## Próxima PR

PR 4: BackgroundBlock + AttributesBlock + SkillsBlock (próxima leva de blocos funcionais).
EOF
)"
```

---

## Self-review

- [ ] Spec coverage: equipamento + integração antecedente?
- [ ] Sem placeholders no código
- [ ] Consistência de nomes
- [ ] V2 suite verde
