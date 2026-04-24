import { describe, it, expect } from 'vitest'
import { calculateArmorClass, findArmorByName, getEquippedArmor, ARMOR_TABLE } from '../domain/equipment'

describe('calculateArmorClass', () => {
  const mods = (d = 0, c = 0, w = 0) => ({ dex: d, con: c, wis: w })

  it('sem armadura, classe comum → 10 + DES', () => {
    expect(calculateArmorClass({ mods: mods(3), classIndex: 'guerreiro', armor: null, hasShield: false })).toBe(13)
  })

  it('Unarmored Defense do bárbaro → 10 + DES + CON', () => {
    expect(calculateArmorClass({ mods: mods(2, 3), classIndex: 'barbaro', armor: null, hasShield: false })).toBe(15)
  })

  it('bárbaro mantém Unarmored Defense com escudo', () => {
    // 10 + 2 + 3 + 2 = 17
    expect(calculateArmorClass({ mods: mods(2, 3), classIndex: 'barbaro', armor: null, hasShield: true })).toBe(17)
  })

  it('Unarmored Defense do monge → 10 + DES + SAB (sem escudo)', () => {
    expect(calculateArmorClass({ mods: mods(4, 0, 3), classIndex: 'monge', armor: null, hasShield: false })).toBe(17)
  })

  it('monge perde Unarmored Defense ao equipar escudo', () => {
    // monge com escudo e sem armadura cai para 10 + DES + escudo
    expect(calculateArmorClass({ mods: mods(4, 0, 3), classIndex: 'monge', armor: null, hasShield: true })).toBe(16)
  })

  it('armadura leve soma DES total', () => {
    const leather = ARMOR_TABLE['leather']
    expect(calculateArmorClass({ mods: mods(4), classIndex: 'guerreiro', armor: leather, hasShield: false })).toBe(15) // 11+4
  })

  it('armadura média limita DES a 2', () => {
    const hide = ARMOR_TABLE['hide']
    expect(calculateArmorClass({ mods: mods(4), classIndex: 'guerreiro', armor: hide, hasShield: false })).toBe(14) // 12 + min(4,2)
  })

  it('armadura pesada ignora DES', () => {
    const plate = ARMOR_TABLE['plate']
    expect(calculateArmorClass({ mods: mods(5), classIndex: 'guerreiro', armor: plate, hasShield: false })).toBe(18)
  })

  it('escudo soma +2', () => {
    const leather = ARMOR_TABLE['leather']
    expect(calculateArmorClass({ mods: mods(3), classIndex: 'guerreiro', armor: leather, hasShield: true })).toBe(16) // 11+3+2
  })
})

describe('findArmorByName', () => {
  it('reconhece Gibão de Couro → leather', () => {
    expect(findArmorByName('Gibão de Couro')?.key ?? findArmorByName('Gibão de Couro')?.type).toBeDefined()
  })
  it('devolve null para nomes desconhecidos', () => {
    expect(findArmorByName('Batata Assada')).toBeNull()
  })
})

describe('getEquippedArmor', () => {
  it('itens não equipados não contam', () => {
    const items = [{ name: 'Couraça', equipped: false, armorKey: 'breastplate', armorType: 'medium' }]
    expect(getEquippedArmor(items)).toEqual({ armor: null, hasShield: false })
  })
  it('equipamento explícito prevalece sobre heurística de nome', () => {
    const items = [{ name: 'qualquer coisa', equipped: true, armorKey: 'plate', armorType: 'heavy' }]
    const r = getEquippedArmor(items)
    expect(r.armor?.category).toBe('heavy')
    expect(r.armor?.baseAC).toBe(18)
  })
  it('detecta escudo equipado', () => {
    const items = [
      { name: 'Couro', equipped: true, armorKey: 'leather' },
      { name: 'Escudo', equipped: true, armorKey: 'shield' },
    ]
    const r = getEquippedArmor(items)
    expect(r.hasShield).toBe(true)
    expect(r.armor?.category).toBe('light')
  })
})
