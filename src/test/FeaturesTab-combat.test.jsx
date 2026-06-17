import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturesTab } from '../components/CharacterSheet/FeaturesTab'

// Fixture mínima de progressão (Ladino nv 5): âncora Ataque Furtivo + ruído ASI.
const PROGRESSION = {
  ladino: {
    name: 'Ladino',
    levels: [
      { level: 1, features: [
        { name: 'Ataque Furtivo (1d6)', desc: 'Dano extra 1x por turno.', combat: 'essencial' },
        { name: 'Gíria dos Ladrões', desc: 'Idioma secreto.', category: 'social' },
      ] },
      { level: 4, features: [
        { name: 'Aumento de Atributo', desc: 'Suba atributos.' },
      ] },
      { level: 5, features: [
        { name: 'Esquiva Instintiva', desc: 'Como reação, reduz dano pela metade.', combat: 'essencial' },
        { name: 'Sentido Cego', desc: 'Percebe invisíveis a 3m.', combat: 'situacional' },
      ] },
    ],
  },
}

vi.mock('../providers/SrdProvider', () => ({
  useSrd: () => ({ progression: PROGRESSION, races: [], classChoices: {} }),
  useLazySrdDataset: () => [],
}))

const character = { info: { class: 'ladino', level: 5, race: '', multiclasses: [], feats: [], chosenFeatures: {} } }

describe('FeaturesTab — aba Combate', () => {
  it('abre na aba Combate por padrão e mostra a feature essencial', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByRole('button', { name: /Combate/i })).toBeInTheDocument()
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
  })
})
