import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/LevelProgression', () => ({
  LevelProgression: () => <div data-testid="level-progression-v1" />,
}))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))
vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({ CharacterInfo: () => <div /> }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, onImport: noop, onImportError: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — progressão', () => {
  it('▲ Nível abre o painel de progressão', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: /Nível/ }))
    expect(screen.getByTestId('level-progression-v1')).toBeInTheDocument()
  })

  it('readOnly esconde o botão de nível', () => {
    renderWithSheetContext(<HeaderV2 {...props} />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /Nível/ })).not.toBeInTheDocument()
  })
})
