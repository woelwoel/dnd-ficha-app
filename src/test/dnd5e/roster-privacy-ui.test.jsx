import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'
import { CharacterToken } from '../../components/CharacterList/CharacterToken'

describe('MapTooltip — privacidade', () => {
  it('linha redigida mostra nome do personagem e do jogador, sem raça/classe/HP', () => {
    render(<MapTooltip character={{
      info: { name: 'Ozzy', class: '', race: '', level: null },
      combat: {}, playerName: 'Gabriel', revealed: false,
    }} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText(/Gabriel/)).toBeInTheDocument()
    expect(screen.queryByText(/Nível/)).not.toBeInTheDocument()
    expect(screen.queryByText(/HP/)).not.toBeInTheDocument()
  })
})

describe('CharacterToken — privacidade', () => {
  it('linha redigida não mostra badge de nível e o aria-label não cita classe/nível', () => {
    render(<CharacterToken character={{
      id: 't1', info: { name: 'Ozzy', class: '', level: null },
      position: { x: 0.5, y: 0.5 }, playerName: 'Gabriel', revealed: false,
    }} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.queryByText('I')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ozzy' })).toBeInTheDocument()
  })
})
