import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'

const baseCharacter = {
  id: 't1',
  info: { name: 'Thoradin', race: 'Anão', class: 'Guerreiro', level: 5 },
  combat: { currentHp: 38, maxHp: 47, armorClass: 18 },
  lastOpenedAt: Date.now() - 3600 * 1000, // 1h atrás
}

describe('<MapTooltip>', () => {
  it('renderiza nome, raça, classe e nível', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/Thoradin/i)).toBeInTheDocument()
    expect(screen.getByText(/Anão/i)).toBeInTheDocument()
    expect(screen.getByText(/Guerreiro/i)).toBeInTheDocument()
    expect(screen.getByText(/Nível 5/i)).toBeInTheDocument()
  })

  it('renderiza HP atual/máx e CA quando combat tem dados', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/HP 38\/47/i)).toBeInTheDocument()
    expect(screen.getByText(/CA 18/i)).toBeInTheDocument()
  })

  it('renderiza "última jogada" relativa quando lastOpenedAt presente', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByText(/h(á| ago)? .*/i)).toBeInTheDocument()
  })

  it('não quebra com personagem mínimo (sem combat ou lastOpenedAt)', () => {
    const min = { id: 'x', info: { name: 'X' } }
    render(<MapTooltip character={min} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('tem role="tooltip"', () => {
    render(<MapTooltip character={baseCharacter} />)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
