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
    fireEvent.click(screen.getByLabelText(/\+2\/\+1/i))
    fireEvent.change(screen.getByLabelText(/Atributo \+2/i), { target: { value: 'str' } })
    fireEvent.change(screen.getByLabelText(/Atributo \+1/i), { target: { value: 'dex' } })
    const last = updateDraft.mock.calls.map(c => c[0]).at(-1)
    expect(last.racialAsiOverride).toEqual({ str: 2, dex: 1 })
    expect(last.racialBonuses).toEqual({ str: 2, dex: 1 })
  })
})
