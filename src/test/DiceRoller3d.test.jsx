import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockDice3d = vi.hoisted(() => ({
  isDice3dSupported: vi.fn(() => true),
  enqueueDice3d: vi.fn(() => Promise.resolve({ animated: true })),
  preloadDice3d: vi.fn(),
  setDice3dAccent: vi.fn(),
  DICE3D_SIDES: new Set([4, 6, 8, 10, 12, 20, 100]),
}))
vi.mock('../components/DiceRoller/dice3d', () => mockDice3d)

import { DiceRollerProvider } from '../context/DiceRollerContext'
import { useDiceRoller } from '../hooks/useDiceRoller'

function Probe({ notation = '1d20+3', opts }) {
  const { roll, history, open, dice3d, setDice3d } = useDiceRoller()
  const [lastReturn, setLastReturn] = React.useState(null)
  return (
    <div>
      <button onClick={() => setLastReturn(roll(notation, 'Teste', opts))}>rolar</button>
      <button onClick={() => setDice3d(!dice3d)}>toggle3d</button>
      <span data-testid="count">{history.length}</span>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="dice3d">{String(dice3d)}</span>
      <span data-testid="return-total">{lastReturn ? String(lastReturn.total) : ''}</span>
    </div>
  )
}

function setup(ui = <Probe />) {
  return render(<DiceRollerProvider>{ui}</DiceRollerProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDice3d.isDice3dSupported.mockReturnValue(true)
  mockDice3d.enqueueDice3d.mockImplementation(() => Promise.resolve({ animated: true }))
  window.localStorage.removeItem('dnd-ficha:dice3d')
})

describe('DiceRollerProvider — caminho 3D', () => {
  it('difere o histórico até os dados pararem e NÃO abre o painel', async () => {
    let settle
    mockDice3d.enqueueDice3d.mockImplementation(
      () => new Promise(r => { settle = r }),
    )
    setup()
    await userEvent.click(screen.getByText('rolar'))

    // roll() RETORNOU a entry na hora (contrato do AttackRollButton)...
    expect(screen.getByTestId('return-total').textContent).not.toBe('')
    // ...mas a entry ainda não está no histórico; painel fechado
    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(screen.getByTestId('open').textContent).toBe('false')
    expect(mockDice3d.enqueueDice3d).toHaveBeenCalledWith(expect.objectContaining({
      sides: 20,
      label: 'Teste',
      values: expect.any(Array),
      total: expect.any(Number),
    }))

    settle({ animated: true })
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('open').textContent).toBe('false')
  })

  it('vantagem manda os DOIS d20 pra animação', async () => {
    setup(<Probe notation="1d20" opts={{ mode: 'adv' }} />)
    await userEvent.click(screen.getByText('rolar'))
    const arg = mockDice3d.enqueueDice3d.mock.calls[0][0]
    expect(arg.values).toHaveLength(2)
  })

  it('{animated: false} cai no clássico: entrada + painel aberto', async () => {
    mockDice3d.enqueueDice3d.mockImplementation(() => Promise.resolve({ animated: false }))
    setup()
    await userEvent.click(screen.getByText('rolar'))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(screen.getByTestId('open').textContent).toBe('true')
  })

  it('pré-carrega o chunk quando 3D ativo e suportado', () => {
    setup()
    expect(mockDice3d.preloadDice3d).toHaveBeenCalled()
  })
})

describe('DiceRollerProvider — fallback', () => {
  it('sem suporte: entrada imediata + painel abre, sem tocar no 3D', async () => {
    mockDice3d.isDice3dSupported.mockReturnValue(false)
    setup()
    await userEvent.click(screen.getByText('rolar'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('open').textContent).toBe('true')
    expect(mockDice3d.enqueueDice3d).not.toHaveBeenCalled()
  })

  it('toggle desligado (localStorage off): fluxo clássico e sem preload', async () => {
    window.localStorage.setItem('dnd-ficha:dice3d', 'off')
    setup()
    expect(mockDice3d.preloadDice3d).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('rolar'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockDice3d.enqueueDice3d).not.toHaveBeenCalled()
  })

  it('modificador puro ("5") não tem dado pra animar: fluxo clássico', async () => {
    setup(<Probe notation="5" />)
    await userEvent.click(screen.getByText('rolar'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockDice3d.enqueueDice3d).not.toHaveBeenCalled()
  })
})

describe('DiceRollerProvider — setDice3d', () => {
  it('persiste em localStorage e muda o caminho', async () => {
    setup()
    expect(screen.getByTestId('dice3d').textContent).toBe('true')
    await userEvent.click(screen.getByText('toggle3d'))
    expect(screen.getByTestId('dice3d').textContent).toBe('false')
    expect(window.localStorage.getItem('dnd-ficha:dice3d')).toBe('off')
    await userEvent.click(screen.getByText('toggle3d'))
    expect(window.localStorage.getItem('dnd-ficha:dice3d')).toBe('on')
  })
})
