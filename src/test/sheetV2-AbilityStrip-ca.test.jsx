import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip — CA/VEL', () => {
  it('abre editor de CA e aplica valor', async () => {
    const user = userEvent.setup()
    const updateCombat = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateCombat }) })
    await user.click(screen.getByRole('button', { name: /Editar CA/ }))
    const input = screen.getByLabelText('Classe de Armadura')
    await user.clear(input)
    await user.type(input, '16')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateCombat).toHaveBeenCalledWith('armorClass', 16)
  })

  it('sugerido preenche o campo de CA', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<AbilityStrip />)
    await user.click(screen.getByRole('button', { name: /Editar CA/ }))
    await user.click(screen.getByRole('button', { name: /Sugerido: 11/ }))
    expect(screen.getByLabelText('Classe de Armadura')).toHaveValue(11)
  })

  it('readOnly não expõe editor de CA', () => {
    renderWithSheetContext(<AbilityStrip />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /Editar CA/ })).not.toBeInTheDocument()
  })
})
