import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'
import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: false, saveError: null }

describe('HeaderV2 — PV', () => {
  it('abre editor de PV e aplica PV máximo', async () => {
    const user = userEvent.setup()
    const updateCombat = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ updateCombat }) })
    await user.click(screen.getByRole('button', { name: /Editar pontos de vida/ }))
    const input = screen.getByLabelText('PV máximo')
    await user.clear(input)
    await user.type(input, '140')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(updateCombat).toHaveBeenCalledWith('maxHp', 140)
  })

  it('tem botões de dano e cura', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByRole('button', { name: 'Dano' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cura' })).toBeInTheDocument()
  })

  it('aplicar cura chama applyHealing com número', async () => {
    const user = userEvent.setup()
    const applyHealing = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ applyHealing }) })
    await user.click(screen.getByRole('button', { name: 'Cura' }))
    const input = screen.getByLabelText('Pontos de vida a curar')
    await user.type(input, '12')
    await user.click(screen.getByRole('button', { name: 'Aplicar cura' }))
    expect(applyHealing).toHaveBeenCalledWith(12)
  })

  it('com PV 0 mostra testes de morte no lugar da barra', () => {
    const ch = makeCharacter()
    ch.combat = { ...ch.combat, currentHp: 0, deathSaves: { successes: 1, failures: 0 } }
    renderWithSheetContext(<HeaderV2 {...props} />, { character: ch })
    expect(screen.getByText(/Testes de morte/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rolar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estabilizar/ })).toBeInTheDocument()
  })

  it('campo de PV máximo vazio não zera o PV (Aplicar desabilitado)', async () => {
    const user = userEvent.setup()
    const updateCombat = vi.fn()
    renderWithSheetContext(<HeaderV2 {...props} />, { updaters: makeUpdaters({ updateCombat }) })
    await user.click(screen.getByRole('button', { name: /Editar pontos de vida/ }))
    const input = screen.getByLabelText('PV máximo')
    await user.clear(input)
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('Rolar e Estabilizar chamam os updaters', async () => {
    const user = userEvent.setup()
    const rollDeathSave = vi.fn()
    const stabilize = vi.fn()
    const ch = makeCharacter()
    ch.combat = { ...ch.combat, currentHp: 0, deathSaves: { successes: 0, failures: 0 } }
    renderWithSheetContext(<HeaderV2 {...props} />, { character: ch, updaters: makeUpdaters({ rollDeathSave, stabilize }) })
    await user.click(screen.getByRole('button', { name: /Rolar/ }))
    await user.click(screen.getByRole('button', { name: /Estabilizar/ }))
    expect(rollDeathSave).toHaveBeenCalled()
    expect(stabilize).toHaveBeenCalled()
  })
})
