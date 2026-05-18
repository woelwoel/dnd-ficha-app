import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

vi.mock('../hooks/useClassSpells', () => ({
  useClassSpells: () => ({ classSpells: [], levelData: null, slotLevels: [], availableTabs: [] }),
}))
vi.mock('../utils/spellcasting', () => ({
  getSpellcastingRules: () => ({ type: 'prepared', spellsLimit: null, cantripsLimit: null, spellsLabel: 'Magias' }),
}))
vi.mock('../components/SpellDetailModal', () => ({
  SpellDetailModal: () => null,
}))

import { SpellsBlock } from '../components/CharacterWizardV2/blocks/SpellsBlock'

describe('SpellsBlock', () => {
  it('renderiza stats quando classe tem spellcasting_ability', () => {
    const classData = { spellcasting_ability: 'Inteligência' }
    const draft = { ...INITIAL_DRAFT_V2, class: 'mago', level: 1 }
    render(<SpellsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/cd de magia/i)).toBeInTheDocument()
  })

  it('NÃO mostra stats quando classe não-conjurador', () => {
    const classData = { spellcasting_ability: '' }
    const draft = { ...INITIAL_DRAFT_V2, class: 'guerreiro', level: 1 }
    render(<SpellsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.queryByText(/cd de magia/i)).not.toBeInTheDocument()
  })
})
