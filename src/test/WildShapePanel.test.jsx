import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WildShapePanel } from '../components/CharacterSheet/WildShapePanel'

// Mock do useDiceRoller
const mockRoll = vi.fn()
const mockOpenPanel = vi.fn()
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => ({ roll: mockRoll, openPanel: mockOpenPanel }),
}))

const BEASTS_FIXTURE = {
  beasts: [
    {
      index: 'wolf', name: 'Lobo', nameEn: 'Wolf', cr: 0.25, crLabel: '1/4',
      size: 'Médio', ac: 13, hp: 11, hitDice: '2d8+2',
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' } },
      str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6,
      senses: {}, damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Mordida', attackBonus: 4, damageDice: '2d4+2', damageType: 'perfuração', desc: '' }],
      traits: [{ name: 'Faro Aguçado', desc: 'Vantagem em testes que usem audição ou olfato.' }],
    },
    {
      index: 'brown-bear', name: 'Urso Pardo', nameEn: 'Brown Bear', cr: 1, crLabel: '1',
      size: 'Grande', ac: 11, hp: 34, hitDice: '4d10+12',
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' } },
      str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
      senses: {}, damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Mordida', attackBonus: 5, damageDice: '1d8+4', damageType: 'perfuração', desc: '' }],
      traits: [],
    },
    {
      index: 'eagle', name: 'Águia', nameEn: 'Eagle', cr: 0, crLabel: '0',
      size: 'Pequeno', ac: 12, hp: 3, hitDice: '1d6',
      speed: { walk: { ft: 10, m: 3, label: 'caminhar' }, fly: { ft: 60, m: 18, label: 'voar' } },
      str: 6, dex: 15, con: 10, int: 2, wis: 14, cha: 7,
      senses: {}, damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Garras', attackBonus: 4, damageDice: '1d4+2', damageType: 'corte', desc: '' }],
      traits: [],
    },
  ],
}

beforeEach(() => {
  mockRoll.mockClear()
  mockOpenPanel.mockClear()
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(BEASTS_FIXTURE) }))
})

function makeChar(overrides = {}) {
  return {
    info: { class: 'druida', level: 4, chosenFeatures: {}, ...overrides.info },
    combat: { wildShape: { active: false }, ...overrides.combat },
  }
}

const defaultWsUse = { id: 'druida-wild-shape', name: 'Forma Selvagem', max: 2, used: 0, recharge: 'short' }

describe('<WildShapePanel>', () => {
  it('não renderiza para nv < 2', () => {
    const { container } = render(
      <WildShapePanel
        druidaLevel={1}
        wsUse={defaultWsUse}
        usesRemaining={2}
        onSpend={() => {}}
        character={makeChar({ info: { level: 1 } })}
        onSetWildShape={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('mostra CR ≤ 1/4 sem voo/natação no nv 2-3', () => {
    render(
      <WildShapePanel
        druidaLevel={2} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={makeChar({ info: { level: 2 } })} onSetWildShape={() => {}}
      />
    )
    expect(screen.getByText(/CR ≤ 1\/4/)).toBeInTheDocument()
    expect(screen.getByText(/sem voo/)).toBeInTheDocument()
    expect(screen.getByText(/sem natação/)).toBeInTheDocument()
  })

  it('Círculo da Lua: CR escala para nv/3 (mín 1)', () => {
    const char = makeChar({ info: { level: 2, chosenFeatures: { druid_circle: 'lua' } } })
    render(
      <WildShapePanel
        druidaLevel={2} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={char} onSetWildShape={() => {}}
      />
    )
    expect(screen.getByText(/Círculo da Lua/)).toBeInTheDocument()
    expect(screen.getByText(/ação bônus/)).toBeInTheDocument()
    expect(screen.getByText(/CR ≤ 1/)).toBeInTheDocument()
  })

  it('picker filtra bestas por CR e movimento permitido', async () => {
    const user = userEvent.setup()
    const char = makeChar({ info: { level: 4 } })
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={char} onSetWildShape={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Transformar$/ }))
    // Nv 4 = CR ≤ 1/2, sem voo. Lobo (CR 1/4) OK, Urso Pardo (CR 1) fora, Águia tem voo (fora).
    await screen.findByRole('button', { name: /Lobo/ })
    expect(screen.queryByRole('button', { name: /Urso Pardo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Águia/ })).not.toBeInTheDocument()
  })

  it('nv 8 permite voo e CR 1', async () => {
    const user = userEvent.setup()
    render(
      <WildShapePanel
        druidaLevel={8} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={() => {}} character={makeChar({ info: { level: 8 } })} onSetWildShape={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Transformar$/ }))
    expect(await screen.findByRole('button', { name: /Urso Pardo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Águia/ })).toBeInTheDocument()
  })

  it('selecionar besta chama onSetWildShape e onSpend', async () => {
    const user = userEvent.setup()
    const onSetWildShape = vi.fn()
    const onSpend = vi.fn()
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={2}
        onSpend={onSpend} character={makeChar()} onSetWildShape={onSetWildShape}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Transformar$/ }))
    await user.click(await screen.findByRole('button', { name: /Lobo/ }))
    expect(onSetWildShape).toHaveBeenCalledWith(expect.objectContaining({
      active: true, beastName: 'Lobo', currentHp: 11, maxHp: 11,
    }))
    expect(onSpend).toHaveBeenCalledWith('druida-wild-shape')
  })

  it('estado ativo mostra stat block com AC, atributos e ataque', () => {
    const wolf = BEASTS_FIXTURE.beasts[0]
    const char = makeChar({
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 11, maxHp: 11, beastData: wolf } },
    })
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={() => {}}
      />
    )
    expect(screen.getByText(/EM FORMA SELVAGEM — Lobo/)).toBeInTheDocument()
    expect(screen.getByText('Mordida')).toBeInTheDocument()
    expect(screen.getByText(/1d20\+4/)).toBeInTheDocument()
    expect(screen.getByText(/2d4\+2/)).toBeInTheDocument()
    // Atributos da besta (DEX 15 — único)
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('aplicar dano > currentHp desfaz a forma e passa overflow pro humanoide', () => {
    const onApplyDamage = vi.fn()
    const onSetWildShape = vi.fn()
    const char = makeChar({
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 5, maxHp: 11, beastData: BEASTS_FIXTURE.beasts[0] } },
    })
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={onSetWildShape}
        onApplyDamage={onApplyDamage}
      />
    )
    const dmgInput = screen.getByPlaceholderText('N')
    fireEvent.change(dmgInput, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }))
    expect(onApplyDamage).toHaveBeenCalledWith(3) // 8 - 5 = 3 de overflow
    expect(onSetWildShape).toHaveBeenCalledWith(null)
  })

  it('aplicar dano parcial mantém forma e reduz currentHp', () => {
    const onSetWildShape = vi.fn()
    const char = makeChar({
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 11, maxHp: 11, beastData: BEASTS_FIXTURE.beasts[0] } },
    })
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={onSetWildShape}
        onApplyDamage={vi.fn()}
      />
    )
    const dmgInput = screen.getByPlaceholderText('N')
    fireEvent.change(dmgInput, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }))
    expect(onSetWildShape).toHaveBeenCalledWith(expect.objectContaining({ currentHp: 7 }))
  })

  it('Reverter chama onSetWildShape(null)', async () => {
    const user = userEvent.setup()
    const onSetWildShape = vi.fn()
    const char = makeChar({
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 11, maxHp: 11, beastData: BEASTS_FIXTURE.beasts[0] } },
    })
    render(
      <WildShapePanel
        druidaLevel={4} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={onSetWildShape}
      />
    )
    await user.click(screen.getByRole('button', { name: /Reverter/ }))
    expect(onSetWildShape).toHaveBeenCalledWith(null)
  })

  it('Círculo da Lua nv 6+: painel de Cura Primal aparece em forma ativa', () => {
    const char = makeChar({
      info: { level: 6, chosenFeatures: { druid_circle: 'lua' } },
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 5, maxHp: 11, beastData: BEASTS_FIXTURE.beasts[0] } },
    })
    render(
      <WildShapePanel
        druidaLevel={6} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={() => {}}
        slotsAvailable={{ 1: 4, 2: 3 }}
        onConsumeSlot={() => {}}
      />
    )
    expect(screen.getByText(/Cura Primal/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nv 1.*1d8/ })).toBeInTheDocument()
  })

  it('cura primal: consome slot e cura besta', () => {
    const onConsumeSlot = vi.fn()
    const onSetWildShape = vi.fn()
    const char = makeChar({
      info: { level: 6, chosenFeatures: { druid_circle: 'lua' } },
      combat: { wildShape: { active: true, beastName: 'Lobo', currentHp: 2, maxHp: 11, beastData: BEASTS_FIXTURE.beasts[0] } },
    })
    render(
      <WildShapePanel
        druidaLevel={6} wsUse={defaultWsUse} usesRemaining={1}
        onSpend={() => {}} character={char} onSetWildShape={onSetWildShape}
        slotsAvailable={{ 1: 4 }} onConsumeSlot={onConsumeSlot}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Nv 1.*1d8/ }))
    expect(onConsumeSlot).toHaveBeenCalledWith(1)
    expect(onSetWildShape).toHaveBeenCalledWith(expect.objectContaining({ currentHp: 6 })) // 2 + 4 (média)
    expect(mockRoll).toHaveBeenCalledWith('1d8', expect.stringContaining('Cura Primal'))
  })
})
