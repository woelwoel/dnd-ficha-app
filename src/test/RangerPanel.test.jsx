import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RangerPanel } from '../components/CharacterSheet/RangerPanel'

vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: vi.fn(), openPanel: vi.fn() }),
}))

function makeChar(overrides = {}) {
  return {
    info: { class: 'patrulheiro', level: 3, chosenFeatures: {}, ...overrides.info },
    combat: { ...overrides.combat },
    attributes: { str: 14, dex: 16, ...overrides.attributes },
  }
}

describe('<RangerPanel>', () => {
  it('não renderiza com ranger=0', () => {
    const { container } = render(<RangerPanel ranger={0} character={makeChar()} />)
    expect(container.firstChild).toBeNull()
  })

  it('mostra badges de Inimigo Favorito e Estilo de Luta', () => {
    const char = makeChar({ info: {
      chosenFeatures: { favored_enemy: 'gigantes', fighting_style_ranger: 'arqueiro' },
    } })
    render(<RangerPanel ranger={3} character={char} />)
    expect(screen.getByText(/Inimigo: Gigantes/)).toBeInTheDocument()
    expect(screen.getByText(/Arqueiro/)).toBeInTheDocument()
  })

  it('Caçador + Matador de Colosso: botão de rolagem 1d8', () => {
    const char = makeChar({ info: {
      chosenFeatures: { ranger_archetype: 'cacador', patrulheiro_hunters_prey: 'matador_colosso' },
    } })
    render(<RangerPanel ranger={3} character={char} />)
    expect(screen.getByText(/Matador de Colosso/)).toBeInTheDocument()
    // Botão de RollButton com glifo 🎲
    expect(screen.getByLabelText(/Matador de Colosso/)).toBeInTheDocument()
  })

  it('Mestre das Bestas: companheiro animal aparece em modo edição quando vazio', () => {
    const char = makeChar({ info: {
      chosenFeatures: { ranger_archetype: 'mestre_das_bestas' },
    } })
    render(<RangerPanel ranger={3} character={char} />)
    expect(screen.getByText('Companheiro Animal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Nome da besta/)).toBeInTheDocument()
  })

  it('Companheiro Animal: salvar chama onUpdateCompanion', async () => {
    const user = userEvent.setup()
    const onUpdateCompanion = vi.fn()
    const char = makeChar({ info: {
      chosenFeatures: { ranger_archetype: 'mestre_das_bestas' },
    } })
    render(<RangerPanel ranger={3} character={char} onUpdateCompanion={onUpdateCompanion} />)
    await user.type(screen.getByPlaceholderText(/Nome da besta/), 'Lobo Fiel')
    await user.type(screen.getByPlaceholderText('HP máx'), '11')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onUpdateCompanion).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Lobo Fiel', maxHp: 11, currentHp: 11,
    }))
  })

  it('Mestre das Bestas com companion já existente mostra tracker', () => {
    const char = makeChar({
      info: { chosenFeatures: { ranger_archetype: 'mestre_das_bestas' } },
      combat: { rangerCompanion: { name: 'Falcão', currentHp: 5, maxHp: 6, ac: 13 } },
    })
    render(<RangerPanel ranger={3} character={char} />)
    expect(screen.getByText('Falcão')).toBeInTheDocument()
    expect(screen.getByText('5/6')).toBeInTheDocument()
  })

  it('Caçador nv 7: Táticas Defensivas mostra label', () => {
    const char = makeChar({ info: {
      level: 7,
      chosenFeatures: { ranger_archetype: 'cacador', patrulheiro_defensive_tactics: 'manada_furiosa' },
    } })
    render(<RangerPanel ranger={7} character={char} />)
    expect(screen.getByText(/Manada Furiosa/)).toBeInTheDocument()
  })
})
