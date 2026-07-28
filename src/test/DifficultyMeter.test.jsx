import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DifficultyMeter } from '../systems/dnd5e/components/Encounter/DifficultyMeter'

describe('DifficultyMeter', () => {
  it('mostra XP bruto, ajustado e a faixa', () => {
    // 3 monstros de 50 XP contra 4 personagens nv3: 150 bruto, ×2 = 300 = fácil
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/150 XP/)).toBeInTheDocument()
    expect(screen.getByText(/300 XP ajustado/i)).toBeInTheDocument()
    expect(screen.getByText(/fácil/i)).toBeInTheDocument()
  })

  it('mostra o multiplicador aplicado', () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/×2/)).toBeInTheDocument()
  })

  it('sem companhia avisa em vez de inventar faixa', () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[]} />)
    expect(screen.getByText(/sem companhia/i)).toBeInTheDocument()
    expect(screen.queryByText(/mortal/i)).toBeNull()
  })

  it('sem monstros diz que não há encontro', () => {
    render(<DifficultyMeter monsterXpTotal={0} monsterCount={0} levels={[3, 3]} />)
    expect(screen.getByText(/sem monstros/i)).toBeInTheDocument()
  })

  it('ajuste manual muda a conta sem tocar na companhia real', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.getByText(/fácil/i)).toBeInTheDocument()

    // Mesmo encontro contra 2 personagens de nível 1: 150 × 2,5 (grupo pequeno
    // sobe um degrau) = 375, contra limiar mortal de 200 → mortal.
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '2')
    const nivel = screen.getByLabelText(/n[íi]vel/i)
    await userEvent.clear(nivel)
    await userEvent.type(nivel, '1')

    expect(screen.getByText(/mortal/i)).toBeInTheDocument()
  })

  it('botão volta pro que a mesa realmente tem', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '1')
    await userEvent.click(screen.getByRole('button', { name: /companhia da mesa/i }))
    expect(screen.getByLabelText(/personagens/i)).toHaveValue(4)
  })

  it('avisa quando os números não são os da mesa', async () => {
    render(<DifficultyMeter monsterXpTotal={150} monsterCount={3} levels={[3, 3, 3, 3]} />)
    expect(screen.queryByText(/ajustado manualmente/i)).toBeNull()
    const qtd = screen.getByLabelText(/personagens/i)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '6')
    expect(screen.getByText(/ajustado manualmente/i)).toBeInTheDocument()
  })
})
