import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeUpdaters } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — condições interativas', () => {
  it('remove condição pelo × do chip', async () => {
    const user = userEvent.setup()
    const toggleCondition = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ toggleCondition }) })
    await user.click(screen.getByRole('button', { name: 'Remover Envenenado' }))
    expect(toggleCondition).toHaveBeenCalledWith('poisoned')
  })

  it('+ Condição abre painel com a lista completa e alterna condição', async () => {
    const user = userEvent.setup()
    const toggleCondition = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ toggleCondition }) })
    await user.click(screen.getByRole('button', { name: '+ Condição' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText('Cego'))
    expect(toggleCondition).toHaveBeenCalledWith('blinded')
  })

  it('stepper de exaustão chama setExhaustion', async () => {
    const user = userEvent.setup()
    const setExhaustion = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ setExhaustion }) })
    await user.click(screen.getByRole('button', { name: '+ Condição' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar exaustão' }))
    expect(setExhaustion).toHaveBeenCalledWith(3) // fixture tem exaustão 2
  })

  it('toggle de inspiração chama setInspiration', async () => {
    const user = userEvent.setup()
    const setInspiration = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ setInspiration }) })
    await user.click(screen.getByRole('button', { name: '+ Condição' }))
    await user.click(screen.getByLabelText('Inspiração'))
    expect(setInspiration).toHaveBeenCalledWith(false) // fixture começa com inspiração true
  })

  it('readOnly: chips sem × e sem + Condição', () => {
    renderWithSheetContext(<HeaderV2 {...props} />, { readOnly: true })
    expect(screen.queryByRole('button', { name: 'Remover Envenenado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Condição' })).not.toBeInTheDocument()
  })
})
