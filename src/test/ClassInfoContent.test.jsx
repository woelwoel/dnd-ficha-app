import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassInfoContent } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/ClassInfoContent'

const classData = {
  name: 'Bárbaro',
  roles: ['DANO CORPO A CORPO', 'TANQUE'],
  summary: 'Guerreiros furiosos que entram em fúria primal.',
  fullDescription: 'Um humano alto membro de alguma tribo caminha em meio a uma nevasca.',
}

describe('ClassInfoContent', () => {
  it('mostra resumo e lore', () => {
    render(<ClassInfoContent classData={classData} />)
    expect(screen.getByText(classData.summary)).toBeInTheDocument()
    expect(screen.getByText(classData.fullDescription)).toBeInTheDocument()
  })

  it('mostra a definição de cada papel da classe', () => {
    render(<ClassInfoContent classData={classData} />)
    expect(screen.getByText(/linha de frente e causa dano de perto/i)).toBeInTheDocument()
    expect(screen.getByText(/aguenta muito dano e protege/i)).toBeInTheDocument()
  })

  it('não quebra quando roles está ausente', () => {
    render(<ClassInfoContent classData={{ name: 'X', summary: 's', fullDescription: 'd' }} />)
    expect(screen.getByText('s')).toBeInTheDocument()
  })
})
