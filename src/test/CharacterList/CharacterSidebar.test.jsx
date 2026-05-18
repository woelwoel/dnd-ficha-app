import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterSidebar } from '../../components/CharacterList/CharacterSidebar'

const make = (id, name, klass, level) => ({
  id, info: { name, class: klass, level, race: 'Humano' }
})

const chars = [
  make('a', 'Alice', 'Mago', 5),
  make('b', 'Bob', 'Guerreiro', 3),
  make('c', 'Carla', 'Mago', 7),
]

describe('<CharacterSidebar>', () => {
  it('renderiza todos os personagens por padrão', () => {
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('renderiza filtro "Todos" como ativo inicialmente', () => {
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Todos/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filtra por classe ao clicar no chip', async () => {
    const user = userEvent.setup()
    render(<CharacterSidebar characters={chars} onSelect={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Filtrar por mago/i }))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('mostra cluster overflow quando há > MAX_VISIBLE_TOKENS', () => {
    const many = Array.from({ length: 15 }, (_, i) => make(`p${i}`, `Pers ${i}`, 'Mago', 1))
    render(<CharacterSidebar characters={many} onSelect={() => {}} />)
    expect(screen.getByText(/\+ 5 outros/i)).toBeInTheDocument()
  })

  it('clicar numa linha chama onSelect com ID', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterSidebar characters={chars} onSelect={onSelect} />)
    await user.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('renderiza estado vazio quando lista está vazia', () => {
    render(<CharacterSidebar characters={[]} onSelect={() => {}} />)
    expect(screen.getByText(/Nenhum herói/i)).toBeInTheDocument()
  })

  it('botão × abre confirmação inline (Riscar / Cancelar)', async () => {
    const user = userEvent.setup()
    render(<CharacterSidebar characters={chars} onSelect={() => {}} onDelete={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Excluir Alice/i }))
    expect(screen.getByRole('button', { name: /^Riscar$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
  })

  it('confirmar Riscar chama onDelete com ID', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<CharacterSidebar characters={chars} onSelect={() => {}} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /Excluir Alice/i }))
    await user.click(screen.getByRole('button', { name: /^Riscar$/ }))
    expect(onDelete).toHaveBeenCalledWith('a')
  })

  it('clicar Cancelar fecha a confirmação sem chamar onDelete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<CharacterSidebar characters={chars} onSelect={() => {}} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /Excluir Alice/i }))
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^Riscar$/ })).not.toBeInTheDocument()
  })
})
