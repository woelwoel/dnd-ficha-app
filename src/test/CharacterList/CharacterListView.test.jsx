import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterListView } from '../../components/CharacterList/CharacterListView'

const now = Date.now()
const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, lastOpenedAt: now - 1000 * 60 },
  { id: 'b', info: { name: 'Bob',   class: 'Guerreiro', level: 3 }, lastOpenedAt: now - 1000 * 3600 },
  { id: 'c', info: { name: 'Carla', class: 'Clérigo', level: 7 } },
]

describe('<CharacterListView>', () => {
  it('renderiza todos os personagens', () => {
    render(<CharacterListView characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('ordena por lastOpenedAt desc (mais recente primeiro), sem timestamp ao final', () => {
    render(<CharacterListView characters={chars} onSelect={() => {}} />)
    const cards = screen.getAllByTestId('list-card')
    expect(cards[0]).toHaveTextContent('Alice')
    expect(cards[1]).toHaveTextContent('Bob')
    expect(cards[2]).toHaveTextContent('Carla')
  })

  it('chama onSelect ao clicar num card', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterListView characters={chars} onSelect={onSelect} />)
    await user.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('renderiza estado vazio quando não há personagens', () => {
    render(<CharacterListView characters={[]} onSelect={() => {}} />)
    expect(screen.getByText(/Nenhum herói/i)).toBeInTheDocument()
  })
})
