import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext, makeCharacter, makeCalc } from './helpers/sheetV2TestContext'
import { skillBonus } from '../systems/dnd5e/components/CharacterSheet/v2/skillBonus'
import { SavesPanel, SensesPanel, ProficienciesPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SidePanels'

describe('skillBonus', () => {
  const character = makeCharacter()
  const calc = makeCalc()
  it('soma proficiência', () => {
    // arcana: INT +4, proficiente (+5) = +9
    expect(skillBonus(character, calc, 'arcana')).toBe(9)
  })
  it('dobra proficiência com expertise', () => {
    // athletics: FOR +5, expertise (+10) = +15
    expect(skillBonus(character, calc, 'athletics')).toBe(15)
  })
  it('sem proficiência retorna só o mod', () => {
    // stealth: DES +1
    expect(skillBonus(character, calc, 'stealth')).toBe(1)
  })
})

describe('SavesPanel', () => {
  it('renderiza as 6 salvaguardas com bônus do calc', () => {
    renderWithSheetContext(<SavesPanel />)
    expect(screen.getByText('Salvaguardas')).toBeInTheDocument()
    expect(screen.getAllByText('+9').length).toBeGreaterThanOrEqual(1) // CON/INT proficientes
    expect(screen.getAllByText('-1').length).toBeGreaterThanOrEqual(1) // SAB/CAR
  })
})

describe('SensesPanel', () => {
  it('renderiza os 3 sentidos passivos', () => {
    renderWithSheetContext(<SensesPanel />)
    expect(screen.getByText('Percepção passiva')).toBeInTheDocument()
    // investigation proficiente: 10 + 4 + 5 = 19
    expect(screen.getByText('19')).toBeInTheDocument()
    // insight sem prof: 10 - 1 = 9 (e percepção passiva do calc = 9)
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(2)
  })
})

describe('ProficienciesPanel', () => {
  it('renderiza idiomas e bônus de proficiência', () => {
    renderWithSheetContext(<ProficienciesPanel />)
    expect(screen.getByText(/Comum, Anão/)).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
  })
})
