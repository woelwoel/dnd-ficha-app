import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Raça Draconato: traço de combate (heurística "Como ação") + traço passivo.
const RACES = [
  { index: 'draconato', name: 'Draconato', traits: [
    { name: 'Sopro do Dragão', desc: 'Como ação, você exala energia destrutiva.' },
    { name: 'Resistência a Dano', desc: 'Você tem resistência ao tipo de dano da sua ascendência.' },
  ] },
]

vi.mock('../providers/SrdProvider', () => ({
  useSrd: () => ({ progression: PROGRESSION, races: RACES, classChoices: {} }),
  useLazySrdDataset: () => [],
}))

const character = { info: { class: 'ladino', level: 5, race: 'draconato', multiclasses: [], feats: [], chosenFeatures: {} } }

describe('FeaturesTab — aba Combate', () => {
  it('abre na aba Combate por padrão e mostra a feature essencial', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByRole('button', { name: /Combate/i })).toBeInTheDocument()
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
  })

  it('na aba Combate mostra só features de combate, não as de habilidades', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Segunda feature de combate aparece
    expect(screen.getByText(/Esquiva Instintiva/i)).toBeInTheDocument()
    // Features não-combate não vazam pra aba Combate
    expect(screen.queryByText(/Gíria dos Ladrões/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Aumento de Atributo/i)).not.toBeInTheDocument()
  })

  it('segmenta essencial vs situacional', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Essencial (padrão): Ataque Furtivo visível, Sentido Cego não
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sentido Cego/i)).not.toBeInTheDocument()
    // Trocar pro segmento Situacional
    await user.click(screen.getByRole('button', { name: /Situacional/i }))
    expect(screen.getByText(/Sentido Cego/i)).toBeInTheDocument()
    expect(screen.queryByText(/Ataque Furtivo/i)).not.toBeInTheDocument()
  })

  it('traço racial de combate (heurística) aparece em Combate; passivo fica em Habilidades', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)

    // Aba Combate (padrão): traço racial com "Como ação" é detectado pela heurística
    expect(screen.getByText(/Sopro do Dragão/i)).toBeInTheDocument()
    // Traço racial passivo NÃO aparece em Combate
    expect(screen.queryByText(/Resistência a Dano/i)).not.toBeInTheDocument()

    // Troca pra Habilidades
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))

    // Traço passivo aparece em Traços Raciais
    expect(screen.getByText(/Resistência a Dano/i)).toBeInTheDocument()
    // O traço de combate não deve estar duplicado em Habilidades
    expect(screen.queryByText(/Sopro do Dragão/i)).not.toBeInTheDocument()
  })
})
