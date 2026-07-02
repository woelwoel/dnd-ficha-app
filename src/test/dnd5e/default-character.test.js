import { describe, it, expect } from 'vitest'
import { DEFAULT_CHARACTER } from '../../systems/dnd5e/hooks/useCharacter'

describe('DEFAULT_CHARACTER', () => {
  it('deslocamento default é 9 metros (não 30 — resquício da era em pés)', () => {
    expect(DEFAULT_CHARACTER.combat.speed).toBe(9)
  })
})
