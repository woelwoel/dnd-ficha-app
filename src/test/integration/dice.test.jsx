import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { DiceHistoryPanel } from '../../components/DiceRoller/DiceHistoryPanel'
import { RollButton } from '../../components/DiceRoller/RollButton'

/* ─────────────────────────────────────────────────────────────────────
   E2E — sistema de dados (vantagem, desvantagem, crítico, histórico)

   Estratégia: fixamos Math.random em valores controlados (0.95 → 20 nat
   no d20; 0.05 → 1) para tornar os testes determinísticos.
   ────────────────────────────────────────────────────────────────────*/

function Harness() {
  return (
    <DiceRollerProvider>
      <RollButton notation="1d20+3" label="Atletismo" />
      <RollButton notation="2d6+5" label="Dano da Espada" />
      <RollButton notation="2d6+5" label="Dano CRÍTICO da Espada" crit icon="✦" />
      <DiceHistoryPanel />
    </DiceRollerProvider>
  )
}

describe('DiceRoller E2E', () => {
  beforeEach(() => {
    // Sequência: alterna 0.95 (alto) e 0.05 (baixo)
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = i % 2 === 0 ? 0.95 : 0.05
      i++
      return v
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rola d20 normal, abre painel e mostra entrada no histórico', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    // Label aparece no histórico
    expect(await screen.findByText('Atletismo')).toBeInTheDocument()
    // 1d20+3 com 0.95 → 20 nat + 3 = 23 (pelo menos uma ocorrência do total)
    expect(screen.getAllByText('23').length).toBeGreaterThanOrEqual(1)
  })

  it('Shift+click aciona vantagem — badge ↑VANT aparece no histórico', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const btn = screen.getByRole('button', { name: /Rolar Atletismo/ })
    await user.keyboard('{Shift>}')
    await user.click(btn)
    await user.keyboard('{/Shift}')
    expect(await screen.findByText('↑VANT')).toBeInTheDocument()
  })

  it('Alt+click aciona desvantagem — badge ↓DESV aparece', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const btn = screen.getByRole('button', { name: /Rolar Atletismo/ })
    await user.keyboard('{Alt>}')
    await user.click(btn)
    await user.keyboard('{/Alt}')
    expect(await screen.findByText('↓DESV')).toBeInTheDocument()
  })

  it('toggle de modo no painel arma vantagem para a próxima rolagem', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText(/Abrir histórico/))
    await user.click(screen.getByRole('button', { name: /↑ Vant\./ }))
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    expect(await screen.findByText('↑VANT')).toBeInTheDocument()
  })

  it('modo reseta para normal após uma rolagem', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText(/Abrir histórico/))
    await user.click(screen.getByRole('button', { name: /↑ Vant\./ }))
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    expect(await screen.findByText('↑VANT')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Rolar Atletismo/ }))
    // Apenas a 1ª rolagem (a anterior) tem ↑VANT
    expect(screen.queryAllByText('↑VANT')).toHaveLength(1)
  })

  it('crítico dobra dados — badge ✦CRIT aparece e total aumenta', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    // Normal: 2d6+5 = 6+1+5 = 12
    // Crítico: 4d6+5 = 6+1+6+1+5 = 19
    await user.click(screen.getByRole('button', { name: /Rolar Dano CRÍTICO da Espada/ }))
    expect(await screen.findByText('✦CRIT')).toBeInTheDocument()
    expect(screen.getAllByText('19').length).toBeGreaterThanOrEqual(1)
  })

  it('vantagem é IGNORADA em 2d6 (regra só vale para 1d20)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const btn = screen.getByRole('button', { name: /Rolar Dano da Espada/ })
    await user.keyboard('{Shift>}')
    await user.click(btn)
    await user.keyboard('{/Shift}')
    expect(screen.queryByText('↑VANT')).toBeNull()
  })
})
