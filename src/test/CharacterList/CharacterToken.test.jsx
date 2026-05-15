import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterToken } from '../../components/CharacterList/CharacterToken'

const baseCharacter = {
  id: 't1',
  info: { name: 'Thoradin Pedra-Forte', race: 'Anão', class: 'Guerreiro', level: 5 },
  combat: { currentHp: 38, maxHp: 47, armorClass: 18 },
  position: { x: 0.3, y: 0.5 },
}

describe('<CharacterToken>', () => {
  it('renderiza nome do personagem', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(screen.getByText(/Thoradin Pedra-Forte/i)).toBeInTheDocument()
  })

  it('renderiza nível em algarismo romano', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('aria-label do botão inclui nome + classe + nível', () => {
    render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', expect.stringMatching(/Thoradin.*Guerreiro.*nível 5/i))
  })

  it('chama onSelect com o ID ao clicar', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CharacterToken character={baseCharacter} onSelect={onSelect} />)
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('t1')
  })

  it('posicionamento aplica position.x/y como style left/top em %', () => {
    const { container } = render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    const wrapper = container.firstChild
    expect(wrapper.style.left).toBe('30%')
    expect(wrapper.style.top).toBe('50%')
  })

  it('renderiza um SVG (silhueta da classe) dentro do disco', () => {
    const { container } = render(<CharacterToken character={baseCharacter} onSelect={() => {}} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
