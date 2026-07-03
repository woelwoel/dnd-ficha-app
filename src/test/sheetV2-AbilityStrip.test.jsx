import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip', () => {
  it('renderiza os 6 atributos com modificador e valor', () => {
    renderWithSheetContext(<AbilityStrip />)
    for (const abbr of ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR']) {
      expect(screen.getByText(abbr)).toBeInTheDocument()
    }
    expect(screen.getByText('+5')).toBeInTheDocument()   // FOR 20
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('renderiza CA e iniciativa', () => {
    renderWithSheetContext(<AbilityStrip />)
    expect(screen.getByText('CA')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('INIT')).toBeInTheDocument()
    // +1 aparece 2x: mod de DES e iniciativa — ambos na faixa
    expect(screen.getAllByText('+1', { selector: '.v2-ability-mod' })).toHaveLength(2)
  })
})
