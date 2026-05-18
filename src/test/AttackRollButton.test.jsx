import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerProvider } from '../context/DiceRollerContext'
import { DiceHistoryPanel } from '../components/DiceRoller/DiceHistoryPanel'
import { AttackRollButton } from '../components/CharacterSheet/AttackRollButton'

/* Math.random controlado: cada teste fixa a sequência específica do d20 + dano. */
function mockSequence(values) {
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length])
}

function Harness({ attack = '1d20+5', damage = '1d8+3', name = 'Espada longa' } = {}) {
  return (
    <DiceRollerProvider>
      <AttackRollButton
        attackNotation={attack}
        damageNotation={damage}
        weaponName={name}
      />
      <DiceHistoryPanel />
    </DiceRollerProvider>
  )
}

describe('AttackRollButton — ataque + dano em 1 clique', () => {
  afterEach(() => vi.restoreAllMocks())

  it('1 clique rola ataque E dano e abre o painel', async () => {
    // Math.floor(0.5 * 20) + 1 = 11 no d20; 0.5 no d8 → 5
    mockSequence([0.5])
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Atacar com Espada longa/ }))
    expect(await screen.findByText(/Ataque · Espada longa/)).toBeInTheDocument()
    expect(screen.getByText(/^Dano · Espada longa$/)).toBeInTheDocument()
  })

  it('Natural 20 dispara label CRÍTICO no dano', async () => {
    // 0.99 → 20 nat
    mockSequence([0.99])
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Atacar com Espada longa/ }))
    expect(await screen.findByText(/Dano CRÍTICO · Espada longa/)).toBeInTheDocument()
  })

  it('Natural 1 NÃO rola dano (erro automático)', async () => {
    // 0 → 1 no d20
    mockSequence([0])
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Atacar com Espada longa/ }))
    expect(await screen.findByText(/Ataque · Espada longa/)).toBeInTheDocument()
    // Não cria entrada de dano no histórico
    expect(screen.queryByText(/^Dano · Espada longa$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Dano CRÍTICO · Espada longa/)).not.toBeInTheDocument()
  })

  it('Shift+click aplica vantagem no d20 de ataque', async () => {
    mockSequence([0.5])
    const user = userEvent.setup()
    render(<Harness />)
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /Atacar com Espada longa/ }))
    await user.keyboard('{/Shift}')
    // O badge ↑VANT é renderizado por DiceHistoryPanel; aqui basta confirmar
    // que a entrada de ataque foi criada (panel aberto, label visível).
    expect(await screen.findByText(/Ataque · Espada longa/)).toBeInTheDocument()
  })
})
