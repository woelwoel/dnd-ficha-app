import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext, makeCharacter } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => ({}), useSrd: () => ({ spells: [] }) }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('chip de exaustão por ruleset', () => {
  it('2014: descreve o degrau da tabela', () => {
    const character = makeCharacter({ combat: { ...makeCharacter().combat, exhaustion: 2 } })
    renderWithSheetContext(<HeaderV2 {...props} />, { character })
    const chips = screen.getAllByText('Exaustão 2')
    expect(chips[0]).toHaveAttribute('title', expect.stringMatching(/metade/i))
  })

  it('2024: descreve a penalidade acumulativa', () => {
    const character = makeCharacter({
      meta: { ...makeCharacter().meta, ruleset: '2024' },
      combat: { ...makeCharacter().combat, exhaustion: 2 },
    })
    renderWithSheetContext(<HeaderV2 {...props} />, { character })
    const chips = screen.getAllByText('Exaustão 2')
    expect(chips[0]).toHaveAttribute('title', expect.stringMatching(/-4|−4/))
  })

  it('sem exaustão, nenhum chip', () => {
    const character = makeCharacter({ combat: { ...makeCharacter().combat, exhaustion: 0 } })
    renderWithSheetContext(<HeaderV2 {...props} />, { character })
    expect(screen.queryByText(/Exaustão/)).not.toBeInTheDocument()
  })
})
