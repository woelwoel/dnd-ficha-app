import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CombatantRow } from '../systems/dnd5e/components/Encounter/CombatantRow'

const npc = {
  id: 'k1', kind: 'npc', name: 'Goblin', monsterIndex: 'goblin',
  initiative: 16, initiativeBonus: 2, ac: 15,
  maxHp: 7, currentHp: 7, tempHp: 0, conditions: [], defeated: false,
}
const pc = {
  id: 'k2', kind: 'pc', name: 'Ana', characterId: 'a',
  initiative: 13, initiativeBonus: 2, orphaned: false,
}
const anaDoc = { id: 'a', combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [] } }

function setup(combatant, extra = {}) {
  const handlers = {
    onDamage: vi.fn(), onHeal: vi.fn(), onTempHp: vi.fn(),
    onToggleCondition: vi.fn(), onRemove: vi.fn(), onInitiativeChange: vi.fn(),
  }
  render(<CombatantRow combatant={combatant} doc={combatant.kind === 'pc' ? anaDoc : null} active={false} {...handlers} {...extra} />)
  return handlers
}

describe('CombatantRow — monstro', () => {
  it('mostra HP, CA e iniciativa', () => {
    setup(npc)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('7/7')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('16')).toBeInTheDocument()
  })

  it('aplicar dano manda o número digitado', async () => {
    const h = setup(npc)
    await userEvent.type(screen.getByLabelText(/valor de dano ou cura/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /^dano$/i }))
    expect(h.onDamage).toHaveBeenCalledWith('k1', 5)
  })

  it('cura e HP temporário usam o mesmo campo', async () => {
    const h = setup(npc)
    await userEvent.type(screen.getByLabelText(/valor de dano ou cura/i), '4')
    await userEvent.click(screen.getByRole('button', { name: /^cura$/i }))
    expect(h.onHeal).toHaveBeenCalledWith('k1', 4)
    await userEvent.click(screen.getByRole('button', { name: /tempor/i }))
    expect(h.onTempHp).toHaveBeenCalledWith('k1', 4)
  })

  it('editar iniciativa avisa o pai', async () => {
    const h = setup(npc)
    const input = screen.getByDisplayValue('16')
    await userEvent.clear(input)
    await userEvent.type(input, '3')
    expect(h.onInitiativeChange).toHaveBeenLastCalledWith('k1', '3')
  })

  it('condição liga pelo id do catálogo do PHB', async () => {
    const h = setup(npc)
    await userEvent.click(screen.getByRole('button', { name: /condi/i }))
    await userEvent.click(screen.getByRole('button', { name: /prostrado/i }))
    expect(h.onToggleCondition).toHaveBeenCalledWith('k1', 'prone')
  })

  it('monstro derrotado aparece riscado', () => {
    setup({ ...npc, currentHp: 0, defeated: true })
    expect(screen.getByText('Goblin').className).toMatch(/line-through/)
  })
})

describe('CombatantRow — PJ', () => {
  it('lê HP da ficha, não do combatente', () => {
    setup(pc)
    expect(screen.getByText('18/20')).toBeInTheDocument()
  })

  it('PJ órfão desabilita as ações de escrita', () => {
    setup({ ...pc, orphaned: true })
    expect(screen.getByRole('button', { name: /^dano$/i })).toBeDisabled()
    expect(screen.getByText(/fora da mesa/i)).toBeInTheDocument()
  })

  it('mostra aviso de concentração quando o pai passa', () => {
    setup(pc, { warning: 'CD 12 de concentração' })
    expect(screen.getByText(/CD 12 de concentração/)).toBeInTheDocument()
  })
})
