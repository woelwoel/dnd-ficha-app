import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ASIOrFeatPicker } from '../components/CharacterWizardV2/blocks/class/ASIOrFeatPicker'

const feats = [
  { index: 'tough', name: 'Tough' },
  { index: 'lucky', name: 'Lucky' },
  { index: 'resilient', name: 'Resilient', attrBonus: { amount: 1, choices: ['str', 'dex', 'con', 'int', 'wis', 'cha'] } },
]

describe('ASIOrFeatPicker — modo ASI', () => {
  it('inicia em ASI por default', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={false} feats={[]} onChoose={() => {}} />)
    expect(screen.getByText(/pontos restantes/i)).toBeInTheDocument()
  })

  it('mostra restantes = 2 quando vazio', () => {
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={false} feats={[]} onChoose={() => {}} />)
    const text = screen.getByText(/pontos restantes/i).textContent
    expect(text).toMatch(/2/)
  })

  it('clicar + em FOR adiciona +1 e chama onChoose', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={false} feats={[]} onChoose={onChoose} />)
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    await userEvent.click(plusButtons[0])
    expect(onChoose).toHaveBeenCalledWith({ type: 'asi', bonuses: { str: 1 } })
  })
})

describe('ASIOrFeatPicker — modo Feat', () => {
  it('toggle Talento aparece quando allowFeats=true', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={true} feats={feats} onChoose={() => {}} />)
    expect(screen.getByRole('button', { name: /talento/i })).toBeInTheDocument()
  })

  it('NÃO mostra toggle Talento quando allowFeats=false', () => {
    render(<ASIOrFeatPicker currentChoice={null} allowFeats={false} feats={feats} onChoose={() => {}} />)
    expect(screen.queryByRole('button', { name: /talento/i })).not.toBeInTheDocument()
  })

  it('clicar Talento switcha pro modo feat', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'asi', bonuses: {} }} allowFeats={true} feats={feats} onChoose={onChoose} />)
    await userEvent.click(screen.getByRole('button', { name: /^talento$/i }))
    expect(onChoose).toHaveBeenCalledWith({ type: 'feat', featIndex: null, featName: null })
  })

  it('selecionar feat sem attrBonus dispara onChoose com featIndex', async () => {
    const onChoose = vi.fn()
    render(<ASIOrFeatPicker currentChoice={{ type: 'feat', featIndex: null }} allowFeats={true} feats={feats} onChoose={onChoose} />)
    await userEvent.click(screen.getByRole('button', { name: /^tough$/i }))
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({
      type: 'feat', featIndex: 'tough', featName: 'Tough',
    }))
  })

  it('busca filtra feats', async () => {
    render(<ASIOrFeatPicker currentChoice={{ type: 'feat', featIndex: null }} allowFeats={true} feats={feats} onChoose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/buscar talento/i), 'luck')
    expect(screen.queryByRole('button', { name: /^tough$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lucky$/i })).toBeInTheDocument()
  })
})
