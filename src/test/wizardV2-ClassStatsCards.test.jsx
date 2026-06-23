// src/test/wizardV2-ClassStatsCards.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ClassStatsCards } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassStatsCards'

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
    const { rerender } = render(<ClassStatsCards classData={guerreiro} level={1} conMod={0} savingThrows={[]} />)
    expect(screen.getByText(/\+2/)).toBeInTheDocument()
    cleanup()
    render(<ClassStatsCards classData={guerreiro} level={5} conMod={0} savingThrows={[]} />)
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
