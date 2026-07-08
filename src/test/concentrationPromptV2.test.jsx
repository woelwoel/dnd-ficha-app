import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConcentrationPromptV2 } from '../systems/dnd5e/components/CharacterSheet/v2/ConcentrationPromptV2'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'

function concentratingChar() {
  const base = makeCharacter()
  return { ...base, combat: { ...base.combat, concentrating: { spellIndex: 'bencao', spellName: 'Bênção' } } }
}

function setup({ dc = 12, d20Total = 18, updaterSpies = {} } = {}) {
  const rollFn = vi.fn(() => ({ sides: 20, rolls: [d20Total - 9], total: d20Total }))
  const updaters = makeUpdaters({
    lastDamageEvent: dc == null ? null : { kind: 'damage', damageDealt: dc * 2, concentrationCheckDC: dc },
    clearLastDamageEvent: updaterSpies.clear ?? vi.fn(),
    setConcentration: updaterSpies.setConc ?? vi.fn(),
  })
  renderWithSheetContext(<ConcentrationPromptV2 />, {
    character: concentratingChar(),
    dice: { roll: rollFn },
    updaters,
  })
  return { rollFn }
}

describe('ConcentrationPromptV2', () => {
  it('mostra CD e a magia quando ha check pendente', () => {
    setup({ dc: 12 })
    expect(screen.getByText(/CD 12/)).toBeInTheDocument()
    expect(screen.getByText(/Bênção/)).toBeInTheDocument()
  })

  it('nao renderiza sem DC pendente', () => {
    setup({ dc: null })
    expect(screen.queryByText(/Teste de Concentração/)).not.toBeInTheDocument()
  })

  it('rola CON pela pipeline (1d20+9 do makeCalc) e mostra sucesso', async () => {
    const user = userEvent.setup()
    const { rollFn } = setup({ dc: 12, d20Total: 18 })
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(rollFn).toHaveBeenCalledWith('1d20+9', expect.stringContaining('CD 12'), { category: 'save', ability: 'con' })
    expect(screen.getByText(/✓ mantida/)).toBeInTheDocument()
  })

  it('falha NAO rompe sozinha; Romper chama setConcentration(null)', async () => {
    const user = userEvent.setup()
    const setConc = vi.fn()
    const clear = vi.fn()
    setup({ dc: 20, d20Total: 5, updaterSpies: { setConc, clear } })
    await user.click(screen.getByRole('button', { name: /Rolar salvaguarda de CON/ }))
    expect(screen.getByText(/✗ falhou/)).toBeInTheDocument()
    expect(setConc).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Romper' }))
    expect(setConc).toHaveBeenCalledWith(null)
    expect(clear).toHaveBeenCalled()
  })

  it('fechar (✕) so limpa o evento', async () => {
    const user = userEvent.setup()
    const clear = vi.fn()
    const setConc = vi.fn()
    setup({ dc: 12, updaterSpies: { clear, setConc } })
    await user.click(screen.getByRole('button', { name: /Fechar aviso de concentração/ }))
    expect(clear).toHaveBeenCalled()
    expect(setConc).not.toHaveBeenCalled()
  })
})
