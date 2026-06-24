import { describe, it, expect } from 'vitest'
import { getMaxAttunement } from '../../systems/dnd5e/domain/artificerInfusions'

const char = (cls, level, mcs = []) => ({ info: { class: cls, level, multiclasses: mcs } })

describe('getMaxAttunement', () => {
  it('não-Artífice = 3', () => expect(getMaxAttunement(char('mago', 20))).toBe(3))
  it('Artífice nv9 = 3', () => expect(getMaxAttunement(char('artifice', 9))).toBe(3))
  it('Artífice nv10 = 4', () => expect(getMaxAttunement(char('artifice', 10))).toBe(4))
  it('Artífice nv14 = 5', () => expect(getMaxAttunement(char('artifice', 14))).toBe(5))
  it('Artífice nv18 = 6', () => expect(getMaxAttunement(char('artifice', 18))).toBe(6))
  it('Artífice em multiclasse usa o nível DA classe', () => {
    expect(getMaxAttunement(char('mago', 5, [{ class: 'artifice', level: 14 }]))).toBe(5)
  })
})
