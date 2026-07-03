import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/Attacks', () => ({ Attacks: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CombatClassActions', () => ({ CombatClassActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ManeuversPanel', () => ({ ManeuversPanel: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Spells', () => ({ Spells: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Inventory', () => ({ Inventory: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/FeaturesTab', () => ({ FeaturesTab: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/Notes', () => ({ Notes: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel', () => ({ ArtificerInfusionsPanel: () => <div /> }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => [] }))

import { MainBox, MAIN_TABS } from '../systems/dnd5e/components/CharacterSheet/v2/MainBox'

describe('MainBox', () => {
  it('renderiza as 5 abas com Ações ativa por padrão', () => {
    renderWithSheetContext(<MainBox />)
    expect(screen.getAllByRole('tab')).toHaveLength(MAIN_TABS.length)
    expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'true')
  })

  it('troca de aba ao clicar', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<MainBox />)
    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'false')
  })

  it('pula pra aba Magias quando focusSpellId chega', () => {
    renderWithSheetContext(<MainBox />, { focusSpellId: 'fireball' })
    expect(screen.getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
})
