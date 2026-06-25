import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChosenFeaturePicker } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class/ChosenFeaturePicker'

const choice = {
  id: 'primal_path',
  featureName: 'Caminho Primitivo',
  prompt: 'Escolha',
  options: [
    { value: 'berserker', name: 'Berserker' },
    { value: 'besta', name: 'Caminho da Besta', source: 'tasha' },
  ],
}

describe('ChosenFeaturePicker — SourceBadge', () => {
  it('mostra selo TCE na opção de Tasha e nada na de PHB', () => {
    render(<ChosenFeaturePicker choice={choice} value="" onChange={vi.fn()} />)
    expect(screen.getByText('Caminho da Besta')).toBeInTheDocument()
    // o selo TCE aparece exatamente uma vez (só na opção de Tasha)
    expect(screen.getAllByText('TCE')).toHaveLength(1)
  })
})
