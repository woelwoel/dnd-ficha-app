// src/test/wizardV2-LevelProgressionList.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LevelProgressionList } from '../components/CharacterWizardV2/blocks/class/LevelProgressionList'

const draft = {
  chosenFeatures: {},
  asiChoices: {},
  settings: { allowFeats: false },
}

const progressionLevels = [
  { level: 1, features: [{ name: 'Estilo de Combate' }] },
  { level: 2, features: [] },  // sem features novas
  { level: 3, features: [{ name: 'Caminho Marcial' }] },
  { level: 4, features: [{ name: 'Aumento de Atributo' }] },
]

const leveledChoices = [
  { id: 'fighting-style', level: 1, featureName: 'Estilo de Combate', prompt: '...', options: [
    { value: 'archery', name: 'Arqueirismo' },
    { value: 'defense', name: 'Defesa' },
  ]},
]

describe('LevelProgressionList', () => {
  it('renderiza um card por nível com conteúdo', () => {
    render(<LevelProgressionList
      level={4} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/Nível 1/)).toBeInTheDocument()
    expect(screen.getByText(/Nível 3/)).toBeInTheDocument()
    expect(screen.getByText(/Nível 4/)).toBeInTheDocument()
  })

  it('nível sem features mostra linha minimalista', () => {
    render(<LevelProgressionList
      level={2} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/sem novas características|evolução de slots/i)).toBeInTheDocument()
  })

  it('nível com choice renderiza ChosenFeaturePicker', () => {
    render(<LevelProgressionList
      level={1} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/estilo de combate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /arqueirismo/i })).toBeInTheDocument()
  })

  it('nível com ASI renderiza ASIOrFeatPicker', () => {
    render(<LevelProgressionList
      level={4} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={() => {}} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    expect(screen.getByText(/aumento de atributo/i)).toBeInTheDocument()
    expect(screen.getByText(/pontos restantes/i)).toBeInTheDocument()
  })

  it('clicar opção dispara onFeatureChoice com (id, value, multiSelect)', async () => {
    const onFeatureChoice = vi.fn()
    render(<LevelProgressionList
      level={1} progressionLevels={progressionLevels} leveledChoices={leveledChoices}
      draft={draft} onFeatureChoice={onFeatureChoice} onASIChoice={() => {}}
      allowFeats={false} feats={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /defesa/i }))
    expect(onFeatureChoice).toHaveBeenCalledWith('fighting-style', 'defense', undefined)
  })
})
