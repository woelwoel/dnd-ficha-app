import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeaturesTab } from '../systems/dnd5e/components/CharacterSheet/FeaturesTab'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import classChoices from '../../public/srd-data/phb-class-choices-pt.json'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({ progression, races: [], classChoices }),
  useLazySrdDataset: () => [],
}))

const PROMPT = 'Escolha um segundo Estilo de Combate'

/**
 * Renderiza a ficha e vai para a vista "Habilidades", onde moram as escolhas
 * pendentes (a vista inicial é Combate).
 */
function renderFicha(level, chosenFeatures) {
  const character = {
    info: { class: 'guerreiro', level, race: '', multiclasses: [], feats: [], chosenFeatures },
  }
  render(<FeaturesTab character={character} featureUses={[]} onSetChosenFeature={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Habilidades/ }))
}

const CAMPEAO_10 = { fighting_style: 'defesa', martial_archetype: 'campeao' }

describe('FeaturesTab — segundo Estilo de Combate do Campeão', () => {
  it('cobra a escolha quando o Campeão chega ao nível 10', () => {
    renderFicha(10, CAMPEAO_10)
    expect(screen.getByText(PROMPT)).toBeInTheDocument()
    // O nome aparece no picker e no card da feature de subclasse.
    expect(screen.getAllByText(/Estilo de Combate Adicional/).length).toBeGreaterThan(0)
  })

  it('não oferece o estilo já escolhido no nível 1', () => {
    renderFicha(10, CAMPEAO_10)
    const picker = screen.getByText(PROMPT).closest('div.flex.flex-col')
    const opcoes = [...picker.querySelectorAll('button')].map(b => b.textContent)
    expect(opcoes.some(t => t.includes('Arqueiro'))).toBe(true)
    expect(opcoes.some(t => t.includes('Defesa'))).toBe(false)
  })

  it('não cobra nada de Campeão abaixo do nível 10', () => {
    renderFicha(9, CAMPEAO_10)
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument()
  })

  it('não cobra nada de outro arquétipo no nível 10', () => {
    renderFicha(10, { fighting_style: 'defesa', martial_archetype: 'mestre_combate' })
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument()
  })

  it('some da pendência depois de escolhido', () => {
    renderFicha(10, { ...CAMPEAO_10, fighting_style_champion: 'arqueiro' })
    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument()
  })
})
