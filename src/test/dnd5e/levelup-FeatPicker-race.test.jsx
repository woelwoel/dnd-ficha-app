import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatPicker } from '../../systems/dnd5e/components/CharacterSheet/levelProgression/FeatPicker'

const FEATS = [
  { index: 'atleta', name: 'Atleta', desc: 'x', prereq: null },
  { index: 'fortitude-ana', name: 'Fortitude Anã', desc: 'x', prereq: { type: 'race', races: ['anao'] } },
]

function renderPicker(extra = {}) {
  return render(
    <FeatPicker
      feats={FEATS}
      attributes={{}}
      featSearch=""
      setFeatSearch={vi.fn()}
      selectedFeatIdx={null}
      setSelectedFeatIdx={vi.fn()}
      featChosenAttr={null}
      setFeatChosenAttr={vi.fn()}
      onFeatInfo={vi.fn()}
      {...extra}
    />
  )
}

describe('FeatPicker (level-up) — prereq de raca', () => {
  it('esconde talento racial de outra raca', () => {
    renderPicker({ raceInfo: { race: 'humano', subrace: '' } })
    expect(screen.getByText('Atleta')).toBeInTheDocument()
    expect(screen.queryByText('Fortitude Anã')).not.toBeInTheDocument()
  })

  it('mostra pra raca certa, com label legivel', () => {
    renderPicker({ raceInfo: { race: 'anao', subrace: 'anao-da-colina' } })
    expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
    expect(screen.getByText(/requer Anão/)).toBeInTheDocument()
  })

  it('sem raceInfo mostra tudo (retrocompat)', () => {
    renderPicker()
    expect(screen.getByText('Fortitude Anã')).toBeInTheDocument()
  })
})
