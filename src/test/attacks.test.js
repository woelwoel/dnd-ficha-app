import { describe, it, expect } from 'vitest'
import { calculateWeaponAttackBonus, calculateWeaponDamage, resolveAttackAbility } from '../systems/dnd5e/utils/attacks'

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

/**
 * Estilos de Combate (PHB p.72). O personagem pode ter MAIS DE UM (multiclasse
 * guerreiro+paladino, Campeão nv10), então o campo é uma lista — cada estilo
 * aplica-se só à arma que se qualifica.
 */
describe('estilos de combate nos ataques', () => {
  it('Arqueiro dá +2 no ataque à distância', () => {
    const atk = { properties: ['ranged'], proficient: true, fightingStyles: ['archery'] }
    // DES 16 (+3) + BP 3 + 2 do estilo
    expect(calculateWeaponAttackBonus(atk, atts(10, 16), 3)).toBe(8)
  })

  it('Arqueiro não afeta arma corpo a corpo', () => {
    const atk = { properties: [], proficient: true, fightingStyles: ['archery'] }
    expect(calculateWeaponAttackBonus(atk, atts(16, 10), 3)).toBe(6)
  })

  it('Duelo dá +2 de dano com arma de uma mão', () => {
    const atk = { damageDice: '1d8', properties: [], fightingStyles: ['dueling'] }
    expect(calculateWeaponDamage(atk, atts(16)).modifier).toBe(5) // 3 FOR + 2
  })

  it('Duelo não vale para arma de duas mãos nem à distância', () => {
    const twoHanded = { damageDice: '2d6', properties: ['two-handed'], fightingStyles: ['dueling'] }
    expect(calculateWeaponDamage(twoHanded, atts(16)).modifier).toBe(3)
    const bow = { damageDice: '1d8', properties: ['ranged'], fightingStyles: ['dueling'] }
    expect(calculateWeaponDamage(bow, atts(10, 16)).modifier).toBe(3)
  })

  it('Grande Arma marca a rerrolagem de 1 e 2 na arma de duas mãos', () => {
    const atk = { damageDice: '2d6', properties: ['two-handed'], fightingStyles: ['great-weapon'] }
    expect(calculateWeaponDamage(atk, atts(16)).dice).toBe('2d6 (rr 1-2)')
  })

  it('Combate com Duas Armas devolve o modificador no golpe off-hand', () => {
    const semEstilo = { damageDice: '1d6', properties: ['light'], offHand: true }
    expect(calculateWeaponDamage(semEstilo, atts(16)).modifier).toBe(0)
    const comEstilo = { ...semEstilo, fightingStyles: ['two-weapon'] }
    expect(calculateWeaponDamage(comEstilo, atts(16)).modifier).toBe(3)
  })

  it('estilos que não são de arma (Defesa) não mexem em ataque nem dano', () => {
    const atk = { damageDice: '1d8', properties: [], proficient: true, fightingStyles: ['defense'] }
    expect(calculateWeaponAttackBonus(atk, atts(16), 3)).toBe(6)
    expect(calculateWeaponDamage(atk, atts(16)).modifier).toBe(3)
  })

  it('com dois estilos, cada arma recebe o que se qualifica', () => {
    const styles = ['dueling', 'great-weapon'] // Campeão nv10
    const espada = { damageDice: '1d8', properties: [], fightingStyles: styles }
    expect(calculateWeaponDamage(espada, atts(16)).modifier).toBe(5)
    expect(calculateWeaponDamage(espada, atts(16)).dice).toBe('1d8')

    const montante = { damageDice: '2d6', properties: ['two-handed'], fightingStyles: styles }
    expect(calculateWeaponDamage(montante, atts(16)).modifier).toBe(3)
    expect(calculateWeaponDamage(montante, atts(16)).dice).toBe('2d6 (rr 1-2)')
  })

  it('aceita o campo singular legado do schema', () => {
    const atk = { properties: ['ranged'], proficient: true, fightingStyle: 'archery' }
    expect(calculateWeaponAttackBonus(atk, atts(10, 16), 3)).toBe(8)
  })
})
