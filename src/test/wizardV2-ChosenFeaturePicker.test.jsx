import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChosenFeaturePicker } from '../components/CharacterWizardV2/blocks/class/ChosenFeaturePicker'

const singleChoice = {
  id: 'pact',
  featureName: 'Pacto Bruxo',
  prompt: 'Escolha um pacto.',
  options: [
    { value: 'blade', name: 'Pacto da Lâmina' },
    { value: 'tome',  name: 'Pacto do Tomo', grants: { bonusCantrips: 3 } },
    { value: 'chain', name: 'Pacto da Corrente', grants: { spells: ['find familiar'] } },
  ],
}

const multiChoice = {
  id: 'metamagic',
  featureName: 'Metamagia',
  prompt: 'Escolha 2.',
  multiSelect: 2,
  options: [
    { value: 'twin', name: 'Gêmea' },
    { value: 'subtle', name: 'Sutil' },
    { value: 'careful', name: 'Cuidadosa' },
  ],
}

describe('ChosenFeaturePicker single', () => {
  it('renderiza título e prompt', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/pacto bruxo/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha um pacto/i)).toBeInTheDocument()
  })

  it('chama onChange com value ao clicar opção', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /pacto da lâmina/i }))
    expect(onChange).toHaveBeenCalledWith('blade')
  })

  it('mostra badge "+3 truques" quando opção tem grants.bonusCantrips', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/\+3 truques/i)).toBeInTheDocument()
  })

  it('mostra badge "+magia" quando opção tem grants.spells', () => {
    render(<ChosenFeaturePicker choice={singleChoice} value="" onChange={() => {}} />)
    expect(screen.getByText(/\+magia/i)).toBeInTheDocument()
  })
})

describe('ChosenFeaturePicker multi', () => {
  it('mostra contador 0/2 sem seleção', () => {
    render(<ChosenFeaturePicker choice={multiChoice} value={[]} onChange={() => {}} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('mostra contador 2/2 e desabilita não-selecionadas no limite', () => {
    render(<ChosenFeaturePicker choice={multiChoice} value={['twin', 'subtle']} onChange={() => {}} />)
    expect(screen.getByText(/2\/2/)).toBeInTheDocument()
  })

  it('toggle adiciona valor', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={multiChoice} value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /gêmea/i }))
    expect(onChange).toHaveBeenCalledWith(['twin'])
  })

  it('toggle remove valor já selecionado', async () => {
    const onChange = vi.fn()
    render(<ChosenFeaturePicker choice={multiChoice} value={['twin']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /gêmea/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
