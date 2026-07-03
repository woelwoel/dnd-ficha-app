import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => [] }))

import { SheetV2 } from '../systems/dnd5e/components/CharacterSheet/v2/SheetV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('SheetV2 (esqueleto)', () => {
  it('monta header + faixa + colunas + quadro', () => {
    renderWithSheetContext(<SheetV2 {...props} />)
    expect(screen.getByText('THOR')).toBeInTheDocument()            // header
    // 'FOR' também aparece em SavesPanel (salvaguarda) e SkillsPanel (linha
    // de Atletismo) quando compostos juntos — pega a primeira ocorrência no
    // documento, que é a da AbilityStrip (ela vem antes das colunas no DOM).
    expect(screen.getAllByText('FOR')[0]).toBeInTheDocument()       // faixa
    expect(screen.getByText('Salvaguardas')).toBeInTheDocument()    // col 1
    expect(screen.getByText('Perícias')).toBeInTheDocument()        // col 2
    expect(screen.getAllByRole('tab').length).toBe(5)               // quadro
  })
})
