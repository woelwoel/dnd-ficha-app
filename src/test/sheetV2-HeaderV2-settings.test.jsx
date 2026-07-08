import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/SourcePicker', () => ({ SourcePicker: () => <div data-testid="source-picker-v1" /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => ({}), useSrd: () => ({ spells: [] }) }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — configurações', () => {
  it('engrenagem abre o modal com fontes e import', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: 'Configurações da ficha' }))
    expect(screen.getByTestId('source-picker-v1')).toBeInTheDocument()
    expect(screen.getByText('Importar JSON')).toBeInTheDocument()
  })

  it('toggles de multiclasse e talentos aparecem', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: 'Configurações da ficha' }))
    expect(screen.getByLabelText('Permitir multiclasse')).toBeInTheDocument()
    expect(screen.getByLabelText('Permitir talentos')).toBeInTheDocument()
  })
})
