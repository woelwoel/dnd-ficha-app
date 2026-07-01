// src/test/FeaturesTab-subclass.test.jsx
// Segue o padrão de FeaturesTab-paladino-real.test.jsx: mocka useSrd com
// progressão + classChoices REAIS (sem SrdProvider/fetch).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeaturesTab } from '../systems/dnd5e/components/CharacterSheet/FeaturesTab'
import progression from '../../public/srd-data/phb-class-progression-pt.json'
import classChoices from '../../public/srd-data/phb-class-choices-pt.json'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({ progression, races: [], classChoices }),
  useLazySrdDataset: () => [],
}))

describe('FeaturesTab — features de subclasse por nível', () => {
  it('Mago Evocador nv10: features de subclasse aparecem como cards próprios (não um blob)', () => {
    const character = { info: { class: 'mago', level: 10, race: '', multiclasses: [], feats: [], chosenFeatures: { arcane_tradition: 'evocacao' } } }
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Evocador Atento (nv6) e Magia Empoderada (nv10) são passivas → aba Habilidades
    fireEvent.click(screen.getByText('Habilidades'))
    expect(screen.getByText(/Evocador Atento/)).toBeInTheDocument()   // nv6
    expect(screen.getByText(/Magia Empoderada/)).toBeInTheDocument()  // nv10
    // não deve existir um card único "Tradição Arcana: Evocação" (caminho antigo)
    expect(screen.queryByText(/Tradição Arcana: Evoca/)).not.toBeInTheDocument()
  })
})
