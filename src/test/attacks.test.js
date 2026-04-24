import { describe, it, expect } from 'vitest'
import { calculateWeaponAttackBonus, calculateWeaponDamage, resolveAttackAbility } from '../utils/attacks'

const atts = (str = 10, dex = 10) => ({ str, dex, con: 10, int: 10, wis: 10, cha: 10 })

describe('resolveAttackAbility', () => {
  it('corpo-a-corpo sem propriedades → FOR', () => {
    expect(resolveAttackAbility({ properties: [] }, atts(14, 10))).toBe('str')
  })
  it('arma à distância → DES', () => {
    expect(resolveAttackAbility({ properties: ['ranged'] }, atts(14, 18))).toBe('dex')
  })
  it('finesse escolhe o maior entre FOR/DES', () => {
    expect(resolveAttackAbility({ properties: ['finesse'] }, atts(14, 18))).toBe('dex')
    expect(resolveAttackAbility({ properties: ['finesse'] }, atts(18, 14))).toBe('str')
  })
  it('abilityOverride sempre vence', () => {
    expect(resolveAttackAbility({ properties: ['finesse'], abilityOverride: 'cha' }, atts(18, 18))).toBe('cha')
  })
})

describe('calculateWeaponAttackBonus', () => {
  it('proficiente + FOR 16 + BP 3 → +6', () => {
    const atk = { properties: [], proficient: true }
    // FOR 16 = mod +3, + BP 3 = +6
    expect(calculateWeaponAttackBonus(atk, atts(16, 10), 3)).toBe(6)
  })
  it('não proficiente não soma BP', () => {
    const atk = { properties: [], proficient: false }
    expect(calculateWeaponAttackBonus(atk, atts(16, 10), 3)).toBe(3) // só +3 FOR
  })
  it('bônus mágico soma', () => {
    const atk = { properties: [], proficient: true, magicBonus: 2 }
    // +3 FOR + 3 BP + 2 mágico = +8
    expect(calculateWeaponAttackBonus(atk, atts(16, 10), 3)).toBe(8)
  })
})

describe('calculateWeaponDamage', () => {
  it('FOR 16, d8 → "1d8 + 3"', () => {
    const atk = { damageDice: '1d8', properties: [] }
    const r = calculateWeaponDamage(atk, atts(16, 10))
    expect(r.expression).toBe('1d8 + 3')
    expect(r.modifier).toBe(3)
  })
  it('versátil a duas mãos usa versatileDice', () => {
    const atk = { damageDice: '1d8', versatileDice: '1d10', properties: ['versatile'] }
    const r = calculateWeaponDamage(atk, atts(16), { versatileTwoHanded: true })
    expect(r.dice).toBe('1d10')
    expect(r.expression).toBe('1d10 + 3')
  })
  it('mod 0 não mostra sinal', () => {
    const atk = { damageDice: '1d4', properties: [] }
    const r = calculateWeaponDamage(atk, atts(10))
    expect(r.expression).toBe('1d4')
    expect(r.modifier).toBe(0)
  })
  it('bônus mágico soma no dano', () => {
    const atk = { damageDice: '1d8', properties: [], magicBonus: 1 }
    const r = calculateWeaponDamage(atk, atts(16))
    expect(r.modifier).toBe(4) // 3 FOR + 1 mágico
  })
})
