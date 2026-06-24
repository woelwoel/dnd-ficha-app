import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RaceBlock } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock'

const races = [{ index: 'anao', name: 'Anão', ability_bonuses: [{ ability: 'Constituição', bonus: 2 }], speed: 7.5, subraces: [] }]

describe('RaceBlock — troca de idioma (Customizando sua Origem)', () => {
  it('toggle OFF: não mostra os seletores de troca de idioma', () => {
    render(<RaceBlock draft={{ race: 'anao', settings: { flexibleRacialAsi: false } }} updateDraft={() => {}} races={races} />)
    expect(screen.queryByLabelText(/Trocar Anão/i)).not.toBeInTheDocument()
  })
  it('toggle ON: trocar o idioma fixo grava racialLanguageOverride', () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={{ race: 'anao', settings: { flexibleRacialAsi: true }, racialLanguageOverride: {} }} updateDraft={updateDraft} races={races} />)
    fireEvent.change(screen.getByLabelText(/Trocar Anão/i), { target: { value: 'Dracônico' } })
    expect(updateDraft).toHaveBeenCalledWith({ racialLanguageOverride: { 'Anão': 'Dracônico' } })
  })
  it('toggle ON: voltar pra "(manter)" remove a troca do override', () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={{ race: 'anao', settings: { flexibleRacialAsi: true }, racialLanguageOverride: { 'Anão': 'Dracônico' } }} updateDraft={updateDraft} races={races} />)
    fireEvent.change(screen.getByLabelText(/Trocar Anão/i), { target: { value: '' } })
    expect(updateDraft).toHaveBeenCalledWith({ racialLanguageOverride: {} })
  })
})
