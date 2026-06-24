import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { RaceBlock } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/RaceBlock'

const races = [
  { index: 'anao', name: 'Anão', ability_bonuses: [{ ability: 'Constituição', bonus: 2 }], speed: 7.5, subraces: [] },
  { index: 'humano', name: 'Humano', ability_bonuses: [{ ability: 'Força', bonus: 1 }], speed: 9, subraces: [] },
]

describe('RaceBlock — idiomas', () => {
  it('Anão mostra os idiomas concedidos (Comum, Anão)', () => {
    render(<RaceBlock draft={{ race: 'anao' }} updateDraft={() => {}} races={races} />)
    // Escopado à seção "Idiomas" porque o <select> de raça também tem uma
    // <option>Anão</option> que colide com getByText global.
    const idiomas = within(screen.getByText('Idiomas').closest('div'))
    expect(idiomas.getByText(/Comum/)).toBeInTheDocument()
    expect(idiomas.getByText(/Anão/)).toBeInTheDocument()
  })
  it('Humano oferece escolher 1 idioma extra e grava racialLanguages', () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={{ race: 'humano', racialLanguages: [] }} updateDraft={updateDraft} races={races} />)
    fireEvent.change(screen.getByLabelText(/Idioma extra/i), { target: { value: 'Élfico' } })
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({ racialLanguages: ['Élfico'] }))
  })
})
