import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PcTacticalCard } from '../../systems/dnd5e/components/Encounter/PcTacticalCard'

const baseDoc = (ruleset, exhaustion) => ({
  id: 'a',
  meta: { ruleset },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  combat: {
    speed: 9, exhaustion, armorClass: 15, currentHp: 10, maxHp: 10, tempHp: 0,
  },
})

describe('PcTacticalCard: deslocamento respeita o ruleset da ficha', () => {
  it('ficha 2014 com exaustão 2 mostra deslocamento pela metade', () => {
    render(<PcTacticalCard doc={baseDoc('2014', 2)} />)
    expect(screen.getByText('4.5 m')).toBeInTheDocument()
  })

  it('ficha 2024 com exaustão 2 mostra deslocamento reduzido em 3 m', () => {
    // 9 m base, exaustão 2 no 2024 = 9 - (1,5 x 2) = 6 m
    // Este é o caso que o defeito quebrava: sem `meta`, caía na regra 2014
    // e mostrava 4.5 m.
    render(<PcTacticalCard doc={baseDoc('2024', 2)} />)
    expect(screen.getByText('6 m')).toBeInTheDocument()
  })

  it('sem exaustão, os dois rulesets mostram o deslocamento base', () => {
    const { unmount } = render(<PcTacticalCard doc={baseDoc('2014', 0)} />)
    expect(screen.getByText('9 m')).toBeInTheDocument()
    unmount()

    render(<PcTacticalCard doc={baseDoc('2024', 0)} />)
    expect(screen.getByText('9 m')).toBeInTheDocument()
  })
})
