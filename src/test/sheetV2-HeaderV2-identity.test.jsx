import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/components/CharacterSheet/CharacterInfo', () => ({
  CharacterInfo: () => <div data-testid="character-info-v1" />,
}))
vi.mock('../systems/dnd5e/components/CharacterSheet/RestActions', () => ({ RestActions: () => <div /> }))
vi.mock('../systems/dnd5e/components/CharacterSheet/DamageModal', () => ({ DamageModal: () => null }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — identidade', () => {
  it('clicar no nome abre o modal com o CharacterInfo', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<HeaderV2 {...props} />)
    await user.click(screen.getByRole('button', { name: /Editar identidade/ }))
    expect(screen.getByTestId('character-info-v1')).toBeInTheDocument()
  })

  it('readOnly não expõe o botão de identidade', () => {
    renderWithSheetContext(<HeaderV2 {...props} />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /Editar identidade/ })).not.toBeInTheDocument()
  })
})
