import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewBlock } from '../components/CharacterWizardV2/blocks/ReviewBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const races = [{ index: 'humano', name: 'Humano', subraces: [] }]
const backgrounds = [{ index: 'soldado', name: 'Soldado' }]
const classData = { index: 'guerreiro', name: 'Guerreiro', hit_die: 10, spellcasting_ability: '' }

describe('ReviewBlock', () => {
  it('mostra alerta de incompleto', () => {
    render(<ReviewBlock draft={INITIAL_DRAFT_V2} races={races} backgrounds={backgrounds} classData={null} />)
    expect(screen.getByText(/preencha os campos obrigatórios/i)).toBeInTheDocument()
  })

  it('mostra identidade quando preenchida', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Heitor', race: 'humano', class: 'guerreiro', background: 'soldado', level: 3,
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    }
    render(<ReviewBlock draft={draft} races={races} backgrounds={backgrounds} classData={classData} />)
    expect(screen.getByText('Heitor')).toBeInTheDocument()
    expect(screen.getByText(/humano/i)).toBeInTheDocument()
    expect(screen.getByText(/guerreiro nível 3/i)).toBeInTheDocument()
    expect(screen.getByText(/^Soldado$/i)).toBeInTheDocument()
  })

  it('mostra configurações da campanha', () => {
    render(<ReviewBlock draft={INITIAL_DRAFT_V2} races={races} backgrounds={backgrounds} classData={null} />)
    expect(screen.getByText(/array padrão/i)).toBeInTheDocument()
  })
})
