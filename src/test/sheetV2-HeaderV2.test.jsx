import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSheetContext } from './helpers/sheetV2TestContext'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({ useLazySrdDataset: () => ({}), useSrd: () => ({ spells: [] }) }))

import { HeaderV2 } from '../systems/dnd5e/components/CharacterSheet/v2/HeaderV2'

const noop = () => {}
const props = { onBack: noop, onExport: noop, onPrint: noop, saving: false, saved: true, saveError: null }

describe('HeaderV2', () => {
  it('renderiza nome, PV e barra', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('THOR')).toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('/ 131')).toBeInTheDocument()
  })

  it('renderiza chips de condições, exaustão e inspiração', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('Envenenado')).toBeInTheDocument()
    expect(screen.getByText('Exaustão 2')).toBeInTheDocument()
    expect(screen.getByText('Inspiração')).toBeInTheDocument()
  })

  it('mostra indicador de salvamento', () => {
    renderWithSheetContext(<HeaderV2 {...props} />)
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })
})
