import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RulesetBadge } from '../../systems/dnd5e/components/RulesetBadge'
import { CombatantRow } from '../../systems/dnd5e/components/Encounter/CombatantRow'

describe('RulesetBadge', () => {
  it('não renderiza nada em ficha 2014 — a ficha fica idêntica ao que era', () => {
    const { container } = render(<RulesetBadge character={{ meta: { ruleset: '2014' } }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não renderiza nada em ficha legada sem o campo', () => {
    const { container } = render(<RulesetBadge character={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra o selo em ficha 2024', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24')).toBeInTheDocument()
  })

  it('explica o selo no title', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24').closest('[title]')?.getAttribute('title'))
      .toMatch(/2024/)
  })
})

describe('badge de ruleset na mesa do Mestre', () => {
  const handlers = {
    onDamage: vi.fn(), onHeal: vi.fn(), onSelect: vi.fn(),
    onRemove: vi.fn(), onInitiativeChange: vi.fn(),
  }
  const pc = {
    id: 'k2', kind: 'pc', name: 'Ana', characterId: 'a',
    initiative: 13, initiativeBonus: 2, orphaned: false,
  }
  const monster = {
    id: 'k1', kind: 'npc', name: 'Goblin', monsterIndex: 'goblin',
    initiative: 16, initiativeBonus: 2, ac: 15,
    maxHp: 7, currentHp: 7, tempHp: 0, conditions: [], defeated: false,
  }

  it('ficha 2024 do jogador mostra o selo na linha', () => {
    const doc = { id: 'a', meta: { ruleset: '2024' }, combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [] } }
    render(<CombatantRow combatant={pc} doc={doc} active={false} {...handlers} />)
    expect(screen.getByText('5e24')).toBeInTheDocument()
  })

  it('ficha 2014 não polui a linha', () => {
    const doc = { id: 'a', meta: { ruleset: '2014' }, combat: { maxHp: 20, currentHp: 18, tempHp: 0, conditions: [] } }
    render(<CombatantRow combatant={pc} doc={doc} active={false} {...handlers} />)
    expect(screen.queryByText('5e24')).not.toBeInTheDocument()
  })

  it('monstro (sem doc) não quebra nem mostra selo', () => {
    render(<CombatantRow combatant={monster} doc={null} active={false} {...handlers} />)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.queryByText('5e24')).not.toBeInTheDocument()
  })
})
