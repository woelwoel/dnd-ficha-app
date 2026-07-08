import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
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
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => ({}), useSrd: () => ({ spells: [] }) }))

import { SheetV2 } from '../systems/dnd5e/components/CharacterSheet/v2/SheetV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('SheetV2 (esqueleto)', () => {
  it('monta header + faixa + colunas + quadro', () => {
    renderWithSheetContext(<SheetV2 {...props} />)
    expect(screen.getByText('THOR')).toBeInTheDocument()            // header (único, compartilhado)
    // Desktop e mobile coexistem no DOM (CSS esconde um), então faixa/painéis
    // aparecem 2×; o smoke só confirma presença.
    expect(screen.getAllByText('FOR')[0]).toBeInTheDocument()       // faixa
    expect(screen.getAllByText('Salvaguardas')[0]).toBeInTheDocument()  // col 1
    expect(screen.getAllByText('Perícias')[0]).toBeInTheDocument()      // col 2
    // 5 abas dentro do quadro desktop (o tablist "Conteúdo da ficha")
    const quadro = screen.getByRole('tablist', { name: 'Conteúdo da ficha' })
    expect(within(quadro).getAllByRole('tab')).toHaveLength(5)
  })
})
