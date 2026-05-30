import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WizardArcanePanel } from '../components/CharacterSheet/WizardArcanePanel'

const mockRoll = vi.fn(() => ({ total: 15 }))
const mockOpenPanel = vi.fn()
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: mockRoll, openPanel: mockOpenPanel }),
}))

function makeChar(overrides = {}) {
  return {
    info: { class: 'mago', level: 4, chosenFeatures: {}, ...overrides.info },
    combat: { ...overrides.combat },
    attributes: { int: 16, ...overrides.attributes },
  }
}

const arcaneRec = { id: 'mago-arcane-recovery', name: 'Recuperação Arcana', max: 1, used: 0, recharge: 'long' }

describe('<WizardArcanePanel>', () => {
  it('não renderiza para não-magos (nv 0)', () => {
    const { container } = render(
      <WizardArcanePanel magoLevel={0} character={makeChar()} featureUses={[]} slotsMax={{}} usedSlots={{}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Recuperação Arcana com orçamento ⌈nv÷2⌉', () => {
    render(
      <WizardArcanePanel magoLevel={4} character={makeChar()} featureUses={[arcaneRec]}
        slotsMax={{ 1: 4, 2: 3 }} usedSlots={{}} />
    )
    expect(screen.getByText('Recuperação Arcana')).toBeInTheDocument()
    expect(screen.getByText('2', { selector: 'strong' })).toBeInTheDocument()
  })

  it('botão Recuperar disabled se já usado', () => {
    const used = { ...arcaneRec, used: 1 }
    render(
      <WizardArcanePanel magoLevel={4} character={makeChar()} featureUses={[used]}
        slotsMax={{ 1: 4 }} usedSlots={{ 1: 2 }} />
    )
    expect(screen.getByRole('button', { name: 'Usado' })).toBeDisabled()
  })

  it('Portento aparece pra Adivinhação nv 2+', () => {
    const char = makeChar({ info: { chosenFeatures: { arcane_tradition: 'adivinhacao' } } })
    render(
      <WizardArcanePanel magoLevel={2} character={char} featureUses={[arcaneRec]} slotsMax={{}} usedSlots={{}} />
    )
    expect(screen.getByText(/Portento/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rolar dados/ })).toBeInTheDocument()
  })

  it('Portento: rolar gera N dados (2 < nv 14)', async () => {
    const user = userEvent.setup()
    const onUpdatePortent = vi.fn()
    const char = makeChar({ info: { chosenFeatures: { arcane_tradition: 'adivinhacao' } } })
    render(
      <WizardArcanePanel magoLevel={5} character={char} featureUses={[arcaneRec]}
        slotsMax={{}} usedSlots={{}} onUpdatePortent={onUpdatePortent} />
    )
    await user.click(screen.getByRole('button', { name: /Rolar dados/ }))
    expect(onUpdatePortent).toHaveBeenCalledWith({ dice: expect.arrayContaining([15, 15]) })
    expect(mockRoll).toHaveBeenCalledTimes(2)
  })

  it('Portento: 3 dados a partir do nv 14', async () => {
    const user = userEvent.setup()
    const onUpdatePortent = vi.fn()
    mockRoll.mockClear()
    const char = makeChar({ info: { chosenFeatures: { arcane_tradition: 'adivinhacao' }, level: 14 } })
    render(
      <WizardArcanePanel magoLevel={14} character={char} featureUses={[arcaneRec]}
        slotsMax={{}} usedSlots={{}} onUpdatePortent={onUpdatePortent} />
    )
    await user.click(screen.getByRole('button', { name: /Rolar dados/ }))
    expect(mockRoll).toHaveBeenCalledTimes(3)
  })

  it('Portento: gastar dado remove da lista', () => {
    const onUpdatePortent = vi.fn()
    const char = makeChar({
      info: { chosenFeatures: { arcane_tradition: 'adivinhacao' } },
      combat: { portent: { dice: [7, 18] } },
    })
    render(
      <WizardArcanePanel magoLevel={4} character={char} featureUses={[arcaneRec]}
        slotsMax={{}} usedSlots={{}} onUpdatePortent={onUpdatePortent} />
    )
    fireEvent.click(screen.getByRole('button', { name: '18' }))
    expect(onUpdatePortent).toHaveBeenCalledWith({ dice: [7] })
  })

  it('Evocação: info de Esculpir Magias', () => {
    const char = makeChar({ info: { chosenFeatures: { arcane_tradition: 'evocacao' }, level: 2 } })
    render(
      <WizardArcanePanel magoLevel={2} character={char} featureUses={[arcaneRec]} slotsMax={{}} usedSlots={{}} />
    )
    expect(screen.getByText(/Esculpir Magias/)).toBeInTheDocument()
  })
})
