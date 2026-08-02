import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerContext } from '../hooks/useDiceRoller'
import { QuickRollBar } from '../components/DiceRoller/QuickRollBar'
import { QUICK_ROLL_KEY } from '../components/DiceRoller/quickRoll'

function setup() {
  const roll = vi.fn()
  const view = render(
    <DiceRollerContext.Provider value={{ roll }}>
      <QuickRollBar />
    </DiceRollerContext.Provider>,
  )
  return { roll, view }
}

beforeEach(() => {
  window.localStorage.removeItem(QUICK_ROLL_KEY)
})

describe('QuickRollBar', () => {
  it('começa em 1d20 e mostra a notação no botão', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Rolar 1d20' })).toBeInTheDocument()
  })

  it('marca o tipo selecionado com aria-pressed', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByRole('button', { name: 'd20' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'd6' }))
    expect(screen.getByRole('button', { name: 'd6' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'd20' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('monta tipo + quantidade + modificador', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'd6' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.type(screen.getByRole('textbox', { name: 'Modificador' }), '2')
    await user.click(screen.getByRole('button', { name: 'Rolar 3d6+2' }))
    expect(roll).toHaveBeenCalledWith('3d6+2', 'Rolagem livre')
  })

  it('aceita modificador negativo', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'd8' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await user.type(screen.getByRole('textbox', { name: 'Modificador' }), '-1')
    await user.click(screen.getByRole('button', { name: 'Rolar 2d8-1' }))
    expect(roll).toHaveBeenCalledWith('2d8-1', 'Rolagem livre')
  })

  it('não deixa a quantidade passar de 20 nem descer de 1', async () => {
    const user = userEvent.setup()
    setup()
    const mais  = screen.getByRole('button', { name: 'Aumentar quantidade' })
    const menos = screen.getByRole('button', { name: 'Diminuir quantidade' })
    for (let i = 0; i < 25; i++) await user.click(mais)
    expect(screen.getByRole('button', { name: 'Rolar 20d20' })).toBeInTheDocument()
    for (let i = 0; i < 30; i++) await user.click(menos)
    expect(screen.getByRole('button', { name: 'Rolar 1d20' })).toBeInTheDocument()
  })

  it('normaliza quantidade digitada fora da faixa ao sair do campo', async () => {
    const user = userEvent.setup()
    setup()
    const campo = screen.getByRole('textbox', { name: 'Quantidade de dados' })
    await user.clear(campo)
    await user.type(campo, '99')
    await user.tab()
    expect(campo).toHaveValue('20')
  })

  it('guarda a escolha e a retoma na montagem seguinte', async () => {
    const user = userEvent.setup()
    const { view } = setup()
    await user.click(screen.getByRole('button', { name: 'd6' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    view.unmount()

    render(
      <DiceRollerContext.Provider value={{ roll: vi.fn() }}>
        <QuickRollBar />
      </DiceRollerContext.Provider>,
    )
    expect(screen.getByRole('button', { name: 'Rolar 2d6' })).toBeInTheDocument()
  })

  it('não passa opts para o roll (rolagem livre não recebe buffs)', async () => {
    const user = userEvent.setup()
    const { roll } = setup()
    await user.click(screen.getByRole('button', { name: 'Rolar 1d20' }))
    expect(roll).toHaveBeenCalledTimes(1)
    expect(roll.mock.calls[0]).toHaveLength(2)
  })
})
