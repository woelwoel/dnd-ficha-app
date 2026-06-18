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

  it('reflete o ASI no total de atributo (Des 15 +2 racial +2 ASI = 19)', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Allyson', race: 'humano', class: 'ladino', background: 'soldado', level: 5,
      baseAttributes: { str: 12, dex: 15, con: 12, int: 10, wis: 12, cha: 11 },
      racialBonuses: { dex: 2 },
      asiChoices: { 4: { type: 'asi', bonuses: { dex: 2 } } },
    }
    render(<ReviewBlock draft={draft} races={races} backgrounds={backgrounds} classData={classData} />)
    // Total final de Destreza = 19 (não 17), com a quebra "15+4".
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText('15+4')).toBeInTheDocument()
  })
})
