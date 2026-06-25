import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'

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
