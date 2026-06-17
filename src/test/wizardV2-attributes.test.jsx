import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  rollFourD6Drop, rollFourD6DropSix, finalScore,
  availableStandardArray, availableRolled,
} from '../components/CharacterWizardV2/blocks/attributes/attribute-helpers'
import { AttributesBlock } from '../components/CharacterWizardV2/blocks/AttributesBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const empty = INITIAL_DRAFT_V2

describe('attribute-helpers', () => {
  it('rollFourD6Drop retorna entre 8 e 18 (piso de 8 por re-roll)', () => {
    for (let i = 0; i < 200; i++) {
      const v = rollFourD6Drop()
      expect(v).toBeGreaterThanOrEqual(8)
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
  it('digitar 15 em FOR chama updateDraft com str=15', () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, settings: { ...empty.settings, abilityScoreMethod: 'manual' } }
    render(<AttributesBlock draft={draft} updateDraft={updateDraft} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '15' } })
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      baseAttributes: expect.objectContaining({ str: 15 }),
    }))
  })

  it('clampa entre 3 e 18', () => {
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
      expect(v).toBeGreaterThanOrEqual(8)
      expect(v).toBeLessThanOrEqual(18)
    })
  })
})

describe('AttributesBlock — validação cruzada multiclasse', () => {
  const classes = [
    { index: 'guerreiro', name: 'Guerreiro' },
    { index: 'mago', name: 'Mago' },
  ]
  const multiclassData = {
    mago: { prerequisites: { int: 13 } },
  }

  it('NÃO mostra warning sem multiclasses', () => {
    const draft = {
      ...empty,
      settings: { ...empty.settings, abilityScoreMethod: 'standard-array' },
      baseAttributes: { str: 10, dex: 10, con: 10, int: 8, wis: 10, cha: 10 },
    }
    render(<AttributesBlock draft={draft} updateDraft={() => {}}
      multiclassData={multiclassData} classes={classes} />)
    expect(screen.queryByText(/sem pré-requisito/i)).not.toBeInTheDocument()
  })

  it('mostra warning quando multiclasse não atende prereq', () => {
    const draft = {
      ...empty,
      settings: { ...empty.settings, abilityScoreMethod: 'standard-array' },
      baseAttributes: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 8 },
      multiclasses: [{ class: 'mago', level: 1 }],
    }
    render(<AttributesBlock draft={draft} updateDraft={() => {}}
      multiclassData={multiclassData} classes={classes} />)
    expect(screen.getByText(/sem pré-requisito/i)).toBeInTheDocument()
    expect(screen.getByText(/Mago/i)).toBeInTheDocument()
  })

  it('NÃO mostra warning quando prereq atendido', () => {
    const draft = {
      ...empty,
      settings: { ...empty.settings, abilityScoreMethod: 'standard-array' },
      baseAttributes: { str: 15, dex: 14, con: 13, int: 13, wis: 10, cha: 8 },
      multiclasses: [{ class: 'mago', level: 1 }],
    }
    render(<AttributesBlock draft={draft} updateDraft={() => {}}
      multiclassData={multiclassData} classes={classes} />)
    expect(screen.queryByText(/sem pré-requisito/i)).not.toBeInTheDocument()
  })
})
