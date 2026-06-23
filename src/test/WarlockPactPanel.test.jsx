import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WarlockPactPanel } from '../systems/dnd5e/components/CharacterSheet/WarlockPactPanel'

vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: vi.fn(), openPanel: vi.fn() }),
}))

function makeChar(overrides = {}) {
  return {
    info: { class: 'bruxo', level: 3, chosenFeatures: {}, ...overrides.info },
    attributes: { cha: 16, ...overrides.attributes },
    spellcasting: { pactSlotsUsed: 0 },
  }
}

describe('<WarlockPactPanel>', () => {
  it('não renderiza para nv 0', () => {
    const { container } = render(<WarlockPactPanel bruxoLevel={0} character={makeChar()} />)
    expect(container.firstChild).toBeNull()
  })

  it('mostra patrono escolhido', () => {
    const char = makeChar({ info: { chosenFeatures: { patron: 'infernal' } } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getByText('O Infernal')).toBeInTheDocument()
  })

  it('Pacto da Lâmina nv 3+ mostra botão de ataque com CHA', () => {
    const char = makeChar({ info: { chosenFeatures: { pact_boon: 'lamina' } } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/Pacto da Lâmina/).length).toBeGreaterThanOrEqual(1)
    // CHA +3 + prof bônus = 1d20+5 (nv 3, prof 2) — aparece em ≥1 lugar
    expect(screen.getAllByText(/1d20\+5/).length).toBeGreaterThanOrEqual(1)
  })

  it('Pacto do Tomo nv 3+: info passiva', () => {
    const char = makeChar({ info: { chosenFeatures: { pact_boon: 'tomo' } } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/Pacto do Tomo/).length).toBeGreaterThanOrEqual(1)
  })

  it('Invocações Místicas renderizadas como badges', () => {
    const char = makeChar({ info: {
      chosenFeatures: { eldritch_invocations: ['forca_agonizante', 'visao_do_diabo'] },
    } })
    render(<WarlockPactPanel bruxoLevel={2} character={char} />)
    expect(screen.getByText(/Invocações Místicas/)).toBeInTheDocument()
    expect(screen.getByText(/Força Agonizante/)).toBeInTheDocument()
    expect(screen.getByText(/Visão do Diabo/)).toBeInTheDocument()
  })

  it('Arcano Místico aparece a partir do nv 11', () => {
    render(<WarlockPactPanel bruxoLevel={11} character={makeChar({ info: { level: 11 } })} />)
    expect(screen.getByText(/Arcano Místico/)).toBeInTheDocument()
    expect(screen.getByText(/Nv 11.*slot 6/)).toBeInTheDocument()
  })

  it('Arcano Místico cumulativo nv 15: mostra slots 6, 7, 8', () => {
    render(<WarlockPactPanel bruxoLevel={15} character={makeChar({ info: { level: 15 } })} />)
    expect(screen.getByText(/slot 6/)).toBeInTheDocument()
    expect(screen.getByText(/slot 7/)).toBeInTheDocument()
    expect(screen.getByText(/slot 8/)).toBeInTheDocument()
    expect(screen.queryByText(/slot 9/)).not.toBeInTheDocument()
  })
})
