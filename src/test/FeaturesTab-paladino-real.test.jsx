import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturesTab } from '../systems/dnd5e/components/CharacterSheet/FeaturesTab'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import classChoices from '../../public/srd-data/phb-class-choices-pt.json'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({ progression, races: [], classChoices }),
  useLazySrdDataset: () => [],
}))

describe('FeaturesTab — paladino 13 (dado real)', () => {
  it('mostra Golpe Divino e Ataque Extra na aba Combate/Essencial', () => {
    const character = { info: { class: 'paladino', level: 13, race: '', multiclasses: [], feats: [], chosenFeatures: {} } }
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByText('Golpe Divino')).toBeInTheDocument()
    expect(screen.getByText('Ataque Extra')).toBeInTheDocument()
    expect(screen.getByText('Estilo de Combate')).toBeInTheDocument()
  })
})
