import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassInfoButton } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoButton'

const classData = {
  name: 'Bárbaro',
  roles: ['DANO CORPO A CORPO', 'TANQUE'],
  summary: 'Guerreiros furiosos.',
  fullDescription: 'Lore do bárbaro.',
}

describe('ClassInfoButton', () => {
  it('não renderiza nada sem classData', () => {
    const { container } = render(<ClassInfoButton classData={null} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('renderiza o botão ℹ e abre o modal ao clicar', async () => {
    render(<ClassInfoButton classData={classData} />)
    const btn = screen.getByRole('button', { name: /sobre a classe/i })
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Guerreiros furiosos.')).toBeInTheDocument()
    expect(screen.getByText('Lore do bárbaro.')).toBeInTheDocument()
  })
})
