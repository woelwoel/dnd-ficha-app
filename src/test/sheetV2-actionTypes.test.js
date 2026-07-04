import { describe, it, expect } from 'vitest'
import { ACTION_TYPES, actionTypeOf } from '../systems/dnd5e/components/CharacterSheet/v2/actionTypes'

const VALID = new Set(['action', 'bonus', 'reaction', 'passive'])

describe('actionTypes', () => {
  it('todos os valores são tipos de ação válidos', () => {
    for (const t of Object.values(ACTION_TYPES)) {
      expect(VALID.has(t)).toBe(true)
    }
  })

  it('classifica recursos conhecidos e cai em null no desconhecido', () => {
    expect(actionTypeOf('guerreiro-second-wind')).toBe('bonus')
    expect(actionTypeOf('paladino-lay-on-hands')).toBe('action')
    expect(actionTypeOf('artifice-flash-of-genius')).toBe('reaction')
    expect(actionTypeOf('monge-ki')).toBeNull()          // pool → fallback
    expect(actionTypeOf('id-de-subclasse-qualquer')).toBeNull()
  })
})
