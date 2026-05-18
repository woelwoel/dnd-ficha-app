// Testes da nova UI de dano/cura/testes de morte em CombatStats.jsx.
// PR 2 do sistema de dano — wiring entre props e callbacks.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CombatStats } from '../components/CharacterSheet/CombatStats'
import { DiceRollerProvider } from '../context/DiceRollerContext'

function wrap(ui) {
  return <DiceRollerProvider>{ui}</DiceRollerProvider>
}

const baseCombat = {
  maxHp: 30, currentHp: 20, tempHp: 0,
  armorClass: 14, speed: 30,
  deathSaves: { successes: 0, failures: 0 },
  isDead: false, isStable: false,
  hitDice: { pool: { d10: { total: 3, used: 0 } } },
  concentrating: { spellIndex: null, spellName: null },
  attacks: [],
  classFeatureUses: [],
  conditions: [],
  inspiration: false,
  exhaustion: 0,
}

const baseAttrs = { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }

function renderWith(overrides = {}) {
  const props = {
    combat: { ...baseCombat, ...overrides.combat },
    attributes: baseAttrs,
    profBonus: 2,
    passivePerception: 10,
    onUpdateCombat: vi.fn(),
    onUpdateDeathSaves: vi.fn(),
    onToggleCondition: vi.fn(),
    onSetInspiration: vi.fn(),
    onSetExhaustion: vi.fn(),
    ...overrides,
  }
  return { ...render(wrap(<CombatStats {...props} />)), props }
}

describe('CombatStats — Damage/Heal controls', () => {
  it('renderiza inputs quando onApplyDamage é passado', () => {
    renderWith({ onApplyDamage: vi.fn(), onApplyHealing: vi.fn() })
    expect(screen.getByRole('button', { name: /⚔ Dano/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /✚ Cura/i })).toBeInTheDocument()
  })

  it('NÃO renderiza inputs quando onApplyDamage é omitido', () => {
    renderWith({})
    expect(screen.queryByRole('button', { name: /⚔ Dano/i })).not.toBeInTheDocument()
  })

  it('clicar em Dano chama onApplyDamage com valor digitado', async () => {
    const onApplyDamage = vi.fn()
    const onApplyHealing = vi.fn()
    renderWith({ onApplyDamage, onApplyHealing })
    const input = screen.getByLabelText(/quantidade de dano ou cura/i)
    await userEvent.type(input, '7')
    await userEvent.click(screen.getByRole('button', { name: /⚔ Dano/i }))
    expect(onApplyDamage).toHaveBeenCalledWith(7)
  })

  it('clicar em Cura chama onApplyHealing', async () => {
    const onApplyDamage = vi.fn()
    const onApplyHealing = vi.fn()
    renderWith({ onApplyDamage, onApplyHealing })
    const input = screen.getByLabelText(/quantidade de dano ou cura/i)
    await userEvent.type(input, '5')
    await userEvent.click(screen.getByRole('button', { name: /✚ Cura/i }))
    expect(onApplyHealing).toHaveBeenCalledWith(5)
  })

  it('Enter no input aplica dano', async () => {
    const onApplyDamage = vi.fn()
    renderWith({ onApplyDamage, onApplyHealing: vi.fn() })
    const input = screen.getByLabelText(/quantidade de dano ou cura/i)
    await userEvent.type(input, '3{Enter}')
    expect(onApplyDamage).toHaveBeenCalledWith(3)
  })

  it('botões desabilitados quando personagem morto', () => {
    renderWith({
      combat: { ...baseCombat, currentHp: 0, isDead: true },
      onApplyDamage: vi.fn(), onApplyHealing: vi.fn(),
    })
    const danoBtn = screen.getByRole('button', { name: /⚔ Dano/i })
    const curaBtn = screen.getByRole('button', { name: /✚ Cura/i })
    expect(danoBtn).toBeDisabled()
    expect(curaBtn).toBeDisabled()
  })

  it('botões ficam HABILITADOS com input vazio; clicar foca o input e mostra hint', async () => {
    const onApplyDamage = vi.fn()
    renderWith({ onApplyDamage, onApplyHealing: vi.fn() })
    const danoBtn = screen.getByRole('button', { name: /⚔ Dano/i })
    expect(danoBtn).not.toBeDisabled()
    await userEvent.click(danoBtn)
    expect(onApplyDamage).not.toHaveBeenCalled()
    expect(screen.getByText(/digite quanto/i)).toBeInTheDocument()
  })

})

describe('CombatStats — DeathSavesTracker', () => {
  it('mostra tracker quando HP=0', () => {
    renderWith({ combat: { ...baseCombat, currentHp: 0 } })
    expect(screen.getByText(/testes de morte/i)).toBeInTheDocument()
  })

  it('mostra banner ESTABILIZADO quando isStable', () => {
    renderWith({ combat: { ...baseCombat, currentHp: 0, isStable: true } })
    expect(screen.getByText(/estabilizado/i)).toBeInTheDocument()
  })

  it('mostra banner MORTO quando isDead', () => {
    renderWith({ combat: { ...baseCombat, currentHp: 0, isDead: true } })
    expect(screen.getByText(/^☠ Morto$/)).toBeInTheDocument()
  })

  it('botão "Rolar" chama onRollDeathSave', () => {
    const onRollDeathSave = vi.fn()
    renderWith({
      combat: { ...baseCombat, currentHp: 0 },
      onRollDeathSave,
    })
    fireEvent.click(screen.getByRole('button', { name: /🎲 Rolar/ }))
    expect(onRollDeathSave).toHaveBeenCalled()
  })

  it('botão "Estabilizar" chama onStabilize', () => {
    const onStabilize = vi.fn()
    renderWith({
      combat: { ...baseCombat, currentHp: 0 },
      onStabilize,
    })
    fireEvent.click(screen.getByRole('button', { name: /Estabilizar/i }))
    expect(onStabilize).toHaveBeenCalled()
  })

  it('botões de rolar/estabilizar somem quando isStable', () => {
    renderWith({
      combat: { ...baseCombat, currentHp: 0, isStable: true },
      onRollDeathSave: vi.fn(),
      onStabilize: vi.fn(),
    })
    expect(screen.queryByRole('button', { name: /🎲 Rolar/ })).not.toBeInTheDocument()
  })
})

describe('CombatStats — DamageEventBanner', () => {
  it('mostra banner de dano com PV perdido', () => {
    renderWith({
      lastDamageEvent: { kind: 'damage', damageDealt: 8 },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/-8 PV/)).toBeInTheDocument()
  })

  it('mostra alerta de queda a 0 PV', () => {
    renderWith({
      lastDamageEvent: { kind: 'damage', damageDealt: 30, droppedTo0: true },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/caiu para 0 PV/i)).toBeInTheDocument()
  })

  it('mostra concentration check DC', () => {
    renderWith({
      lastDamageEvent: { kind: 'damage', damageDealt: 20, concentrationCheckDC: 10 },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/CON CD 10/i)).toBeInTheDocument()
  })

  it('mostra morte instantânea', () => {
    renderWith({
      lastDamageEvent: { kind: 'damage', damageDealt: 99, instakill: true },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/morte instant/i)).toBeInTheDocument()
  })

  it('mostra cura com revival', () => {
    renderWith({
      lastDamageEvent: { kind: 'heal', healed: 10, revived: true },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/\+10 PV/)).toBeInTheDocument()
    expect(screen.getByText(/recuperou a consciência/i)).toBeInTheDocument()
  })

  it('mostra resultado de Nat 20', () => {
    renderWith({
      lastDamageEvent: { kind: 'deathSave', roll: 20, recovered: true },
      onClearDamageEvent: vi.fn(),
    })
    expect(screen.getByText(/Rolou 20/i)).toBeInTheDocument()
    expect(screen.getByText(/Nat 20.*1 PV/i)).toBeInTheDocument()
  })

  it('clicar em ✕ chama onClearDamageEvent', () => {
    const onClearDamageEvent = vi.fn()
    renderWith({
      lastDamageEvent: { kind: 'damage', damageDealt: 5 },
      onClearDamageEvent,
    })
    fireEvent.click(screen.getByTitle('Fechar'))
    expect(onClearDamageEvent).toHaveBeenCalled()
  })
})
