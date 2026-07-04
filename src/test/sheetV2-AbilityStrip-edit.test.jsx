import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { AbilityStrip } from '../systems/dnd5e/components/CharacterSheet/v2/AbilityStrip'

describe('AbilityStrip — edição', () => {
  it('clicar num atributo abre o editor e salvar chama updateAttribute', async () => {
    const user = userEvent.setup()
    const updateAttribute = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    await user.type(input, '18')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateAttribute).toHaveBeenCalledWith('str', '18')
  })

  it('readOnly não abre editor', async () => {
    renderWithSheetContext(<AbilityStrip />, { readOnly: true })
    expect(screen.queryByRole('button', { name: /Editar FOR/ })).not.toBeInTheDocument()
  })

  it('campo de atributo vazio desabilita Aplicar', async () => {
    const user = userEvent.setup()
    const updateAttribute = vi.fn()
    renderWithSheetContext(<AbilityStrip />, { updaters: makeUpdaters({ updateAttribute }) })
    await user.click(screen.getByRole('button', { name: /Editar FOR/ }))
    const input = screen.getByLabelText('Valor')
    await user.clear(input)
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })
})
