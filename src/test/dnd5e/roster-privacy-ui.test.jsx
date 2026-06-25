import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'
import { CharacterToken } from '../../components/CharacterList/CharacterToken'
import { CharacterSidebar } from '../../components/CharacterList/CharacterSidebar'
import { CharacterListView } from '../../components/CharacterList/CharacterListView'

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

describe('CharacterSidebar — privacidade', () => {
  const redacted = { id: 's1', info: { name: 'Ozzy', class: '', race: '', level: null }, playerName: 'Gabriel', revealed: false }

  it('linha redigida mostra nome do jogador e não mostra classe nem nível', () => {
    render(<CharacterSidebar characters={[redacted]} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText('Gabriel')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('esconde a fileira de filtros de classe quando há ficha redigida', () => {
    render(<CharacterSidebar characters={[redacted]} />)
    expect(screen.queryByRole('group', { name: 'Filtros de classe' })).not.toBeInTheDocument()
  })

  it('mostra os filtros quando tudo é revelado (visão do DM)', () => {
    render(<CharacterSidebar characters={[{ id: 's2', info: { name: 'A', class: 'mago', level: 3 }, playerName: 'Gm', revealed: true }]} />)
    expect(screen.getByRole('group', { name: 'Filtros de classe' })).toBeInTheDocument()
  })
})

describe('CharacterListView — privacidade', () => {
  it('card mostra o nome do jogador', () => {
    render(<CharacterListView characters={[{
      id: 'l1', system: 'dnd5e', info: { name: 'Ozzy', class: '', race: '', level: null },
      combat: {}, playerName: 'Gabriel', revealed: false,
    }]} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText(/Gabriel/)).toBeInTheDocument()
  })
})
