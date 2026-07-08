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

  it('Pacto da Lâmina nv 3+ usa Força/Destreza (a melhor), não CHA', () => {
    // PHB/Tasha: arma de pacto usa FOR/DES; CHA só viria do Hexblade (Xanathar).
    const char = makeChar({ info: { level: 3, chosenFeatures: { pact_boon: 'lamina' } },
      attributes: { cha: 16, str: 8, dex: 18 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/Pacto da Lâmina/).length).toBeGreaterThanOrEqual(1)
    // DES +4 (a melhor) + prof 2 = 1d20+6; CHA (16, +3) é ignorado.
    expect(screen.getAllByText(/1d20\+6/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/1d20\+5/)).not.toBeInTheDocument()
  })

  it('Pacto da Lâmina: prof vem do nível total em multiclasse', () => {
    // Bruxo 3 / Guerreiro 8 = nível 11, prof +4. FOR 16 (+3) → 1d20+7.
    const char = makeChar({ info: { level: 11, chosenFeatures: { pact_boon: 'lamina' } },
      attributes: { cha: 10, str: 16, dex: 10 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/1d20\+7/).length).toBeGreaterThanOrEqual(1)
  })

  it('Hexblade: Pacto da Lâmina usa CHA quando é o melhor (Guerreiro Maldito)', () => {
    // nv 3, prof +2. CHA 18 (+4) > FOR/DES → 1d20+6. Nome do patrono aparece.
    const char = makeChar({ info: { level: 3, chosenFeatures: { patron: 'hexblade', pact_boon: 'lamina' } },
      attributes: { str: 10, dex: 12, cha: 18 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getByText('O Lâmina Maldita')).toBeInTheDocument()
    expect(screen.getAllByText(/1d20\+6/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Carisma/).length).toBeGreaterThanOrEqual(1)
  })

  it('patrono não-Hexblade continua max(FOR, DES), sem CHA', () => {
    // infernal, CHA 18 ignorado; DES 12 (+1) → 1d20+3.
    const char = makeChar({ info: { level: 3, chosenFeatures: { patron: 'infernal', pact_boon: 'lamina' } },
      attributes: { str: 10, dex: 12, cha: 18 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/1d20\+3/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/1d20\+6/)).not.toBeInTheDocument()
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
