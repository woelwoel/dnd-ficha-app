import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext, makeCharacter } from './helpers/sheetV2TestContext'
import { SkillsPanel } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsPanel'
import { skillProficiencyState } from '../systems/dnd5e/components/CharacterSheet/v2/skillBonus'
import { SKILLS } from '../systems/dnd5e/utils/calculations'

describe('SkillsPanel', () => {
  it('renderiza as 18 perícias', () => {
    renderWithSheetContext(<SkillsPanel />)
    for (const s of SKILLS) {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    }
  })

  it('mostra bônus com proficiência e expertise', () => {
    renderWithSheetContext(<SkillsPanel />)
    expect(screen.getByText('+15')).toBeInTheDocument() // Atletismo expertise
    // +9 aparece 2x: Arcanismo e Investigação (ambos INT +4, prof +5)
    expect(screen.getAllByText('+9').length).toBeGreaterThanOrEqual(2)
  })
})

describe('skillProficiencyState', () => {
  it('marca perícia de antecedente como proficiente', () => {
    const p = { skills: [], expertiseSkills: [], backgroundSkills: ['survival'] }
    expect(skillProficiencyState(p, 'survival')).toEqual({ prof: true, expert: false })
  })
  it('não marca expertise sem proficiência', () => {
    const p = { skills: [], expertiseSkills: ['stealth'], backgroundSkills: [] }
    expect(skillProficiencyState(p, 'stealth')).toEqual({ prof: false, expert: false })
  })
  it('marca expertise quando também proficiente', () => {
    const p = { skills: ['athletics'], expertiseSkills: ['athletics'], backgroundSkills: [] }
    expect(skillProficiencyState(p, 'athletics')).toEqual({ prof: true, expert: true })
  })
})
