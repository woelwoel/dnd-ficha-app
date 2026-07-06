import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ManeuversPanel } from '../systems/dnd5e/components/CharacterSheet/ManeuversPanel'

// Mock do hook do roller — captura chamadas pra verificar
const mockRoll = vi.fn()
const mockOpenPanel = vi.fn()
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: mockRoll, openPanel: mockOpenPanel }),
}))

const MANEUVERS_JSON = {
  maneuvers: [
    { index: 'ataque-ardiloso', name: 'Ataque Ardiloso', type: 'passiva',     trigger: 'Ao acertar um ataque',          desc: 'Soma 1 dado ao dano.' },
    { index: 'resposta',         name: 'Resposta',         type: 'reação',      trigger: 'Quando alguém erra você',       desc: 'Reação: ataque + dado.' },
    { index: 'comandar-ataque',  name: 'Comandar Ataque',  type: 'ação bônus',  trigger: 'Como ação bônus',               desc: 'Aliado ataca.' },
  ],
}

beforeEach(() => {
  mockRoll.mockClear()
  mockOpenPanel.mockClear()
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(MANEUVERS_JSON) }))
})

function makeChar(overrides = {}) {
  return {
    info: {
      class: 'guerreiro',
      level: 3,
      chosenFeatures: {
        martial_archetype: 'mestre_combate',
        martial_archetype_maneuvers: ['ataque-ardiloso', 'resposta'],
      },
      ...overrides.info,
    },
  }
}

const defaultFeatureUses = [
  { id: 'guerreiro-superiority-dice', name: 'Dado de Superioridade (d8)', max: 4, used: 0, recharge: 'short' },
]

describe('<ManeuversPanel>', () => {
  it('não renderiza pra Guerreiro Campeão (sem manobras escolhidas)', () => {
    const char = makeChar({ info: { chosenFeatures: { martial_archetype: 'campeao' } } })
    const { container } = render(<ManeuversPanel character={char} featureUses={defaultFeatureUses} onSpend={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza pra não-Guerreiro', () => {
    const char = makeChar({ info: { class: 'paladino' } })
    const { container } = render(<ManeuversPanel character={char} featureUses={defaultFeatureUses} onSpend={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('não renderiza quando martial_archetype_maneuvers está vazio', () => {
    const char = makeChar({ info: {
      chosenFeatures: { martial_archetype: 'mestre_combate', martial_archetype_maneuvers: [] },
    } })
    const { container } = render(<ManeuversPanel character={char} featureUses={defaultFeatureUses} onSpend={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza header com contagem e dado certo', async () => {
    render(<ManeuversPanel character={makeChar()} featureUses={defaultFeatureUses} onSpend={() => {}} />)
    expect(screen.getByRole('heading', { name: /Manobras/i })).toBeInTheDocument()
    expect(screen.getByText(/4\/4 d8/)).toBeInTheDocument()
    expect(await screen.findByText('Ataque Ardiloso')).toBeInTheDocument()
    expect(screen.getByText('Resposta')).toBeInTheDocument()
  })

  it('escala dado conforme name (d10 no nv 10)', async () => {
    const featureUses = [{ id: 'guerreiro-superiority-dice', name: 'Dado de Superioridade (d10)', max: 5, used: 0, recharge: 'short' }]
    render(<ManeuversPanel character={makeChar()} featureUses={featureUses} onSpend={() => {}} />)
    expect(screen.getByText(/5\/5 d10/)).toBeInTheDocument()
  })

  it('mostra contagem em vermelho quando 0 dados restantes', () => {
    const featureUses = [{ id: 'guerreiro-superiority-dice', name: 'Dado de Superioridade (d8)', max: 4, used: 4, recharge: 'short' }]
    render(<ManeuversPanel character={makeChar()} featureUses={featureUses} onSpend={() => {}} />)
    const badge = screen.getByText(/0\/4 d8/)
    expect(badge.className).toMatch(/red/)
  })

  it('click no botão dado chama onSpend + roll com label da manobra', async () => {
    const onSpend = vi.fn()
    render(<ManeuversPanel character={makeChar()} featureUses={defaultFeatureUses} onSpend={onSpend} />)
    await screen.findByText('Ataque Ardiloso')
    // Botão da manobra agora tem Icon dice + texto "d8" (sem emoji)
    const diceButtons = screen.getAllByRole('button').filter(b => /^\s*d8\s*$/.test(b.textContent))
    expect(diceButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(diceButtons[0])
    expect(onSpend).toHaveBeenCalledWith('guerreiro-superiority-dice')
    expect(mockRoll).toHaveBeenCalledWith('1d8', expect.stringContaining('Ataque Ardiloso'))
  })

  it('botão desabilitado e não rola quando sem dados', async () => {
    const featureUses = [{ id: 'guerreiro-superiority-dice', name: 'Dado de Superioridade (d8)', max: 4, used: 4, recharge: 'short' }]
    const onSpend = vi.fn()
    render(<ManeuversPanel character={makeChar()} featureUses={featureUses} onSpend={onSpend} />)
    await screen.findByText('Ataque Ardiloso')
    const diceButtons = screen.getAllByRole('button').filter(b => /^\s*d8\s*$/.test(b.textContent))
    expect(diceButtons[0]).toBeDisabled()
    fireEvent.click(diceButtons[0])
    expect(onSpend).not.toHaveBeenCalled()
    expect(mockRoll).not.toHaveBeenCalled()
  })

  it('renderiza tipos diferentes (passiva, reação, ação bônus) com badges', async () => {
    const char = makeChar({ info: {
      chosenFeatures: {
        martial_archetype: 'mestre_combate',
        martial_archetype_maneuvers: ['ataque-ardiloso', 'resposta', 'comandar-ataque'],
      },
    } })
    render(<ManeuversPanel character={char} featureUses={defaultFeatureUses} onSpend={() => {}} />)
    await screen.findByText('Comandar Ataque')
    expect(screen.getByText('PAS')).toBeInTheDocument()
    expect(screen.getByText('REAÇÃO')).toBeInTheDocument()
    expect(screen.getByText('BÔNUS')).toBeInTheDocument()
  })
})
