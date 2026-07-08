import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
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
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/SkillsList', () => ({ SkillsList: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/LevelProgression', () => ({ LevelProgression: () => <div /> }))
vi.mock('../systems/dnd5e/components/SourcePicker', () => ({ SourcePicker: () => <div /> }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => ({}), useSrd: () => ({ spells: [] }) }))

import { SheetV2 } from '../systems/dnd5e/components/CharacterSheet/v2/SheetV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('SheetV2 — mobile', () => {
  it('renderiza a BottomNav e o container mobile', () => {
    renderWithSheetContext(<SheetV2 {...props} />)
    expect(screen.getByRole('tablist', { name: 'Seções da ficha' })).toBeInTheDocument()
  })

  it('trocar seção na BottomNav troca o conteúdo mobile', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<SheetV2 {...props} />)
    const nav = screen.getByRole('tablist', { name: 'Seções da ficha' })
    await user.click(within(nav).getByRole('tab', { name: 'Magias' }))
    expect(within(nav).getByRole('tab', { name: 'Magias' })).toHaveAttribute('aria-selected', 'true')
  })
})
