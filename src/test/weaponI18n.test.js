import { describe, it, expect } from 'vitest'
import {
  translateProperty, translateDamageType,
  feetToMeters, formatRange, findAmmoForAttack,
} from '../systems/dnd5e/utils/weaponI18n'

describe('translateProperty', () => {
  it('traduz propriedades conhecidas', () => {
    expect(translateProperty('light')).toBe('leve')
    expect(translateProperty('two-handed')).toBe('2 mãos')
    expect(translateProperty('finesse')).toBe('sutileza')
    expect(translateProperty('Versatile')).toBe('versátil')  // case-insensitive
  })

  it('retorna o original quando desconhecido', () => {
    expect(translateProperty('xyz')).toBe('xyz')
  })

  it('retorna string vazia pra null', () => {
    expect(translateProperty(null)).toBe('')
    expect(translateProperty(undefined)).toBe('')
  })
})

describe('translateDamageType', () => {
  it('traduz tipos comuns', () => {
    expect(translateDamageType('Slashing')).toBe('cortante')
    expect(translateDamageType('Piercing')).toBe('perfurante')
    expect(translateDamageType('bludgeoning')).toBe('contundente')
    expect(translateDamageType('Fire')).toBe('fogo')
  })

  it('preserva tipos desconhecidos', () => {
    expect(translateDamageType('Sonic')).toBe('Sonic')
  })
})

describe('feetToMeters', () => {
  it('5ft = 1.5m', () => {
    expect(feetToMeters(5)).toBe(1.5)
  })

  it('150ft = 45m (arco longo)', () => {
    expect(feetToMeters(150)).toBe(45)
  })

  it('600ft = 180m (alcance longo)', () => {
    expect(feetToMeters(600)).toBe(180)
  })

  it('null para entrada inválida', () => {
    expect(feetToMeters(null)).toBe(null)
    expect(feetToMeters('abc')).toBe(null)
  })
})

describe('formatRange', () => {
  it('"45/180m" quando normal e long diferentes', () => {
    expect(formatRange(150, 600)).toBe('45/180m')
  })

  it('"5m" quando só normal', () => {
    expect(formatRange(5)).toBe('1.5m')
  })

  it('null pra ranges ausentes (corpo a corpo padrão)', () => {
    expect(formatRange(null, null)).toBe(null)
  })
})

describe('findAmmoForAttack', () => {
  const items = [
    { id: '1', name: 'Flecha', qty: 20 },
    { id: '2', name: 'Virote', qty: 10 },
    { id: '3', name: 'Pão', qty: 5 },
  ]

  it('Arco Longo → Flecha', () => {
    const atk = { name: 'Arco Longo', properties: ['ammunition', 'heavy', 'two-handed', 'ranged'] }
    expect(findAmmoForAttack(atk, items)?.name).toBe('Flecha')
  })

  it('Besta Leve → Virote', () => {
    const atk = { name: 'Besta Leve', properties: ['ammunition', 'ranged'] }
    expect(findAmmoForAttack(atk, items)?.name).toBe('Virote')
  })

  it('null quando arma não tem propriedade ammunition', () => {
    const atk = { name: 'Espadão', properties: ['heavy', 'two-handed'] }
    expect(findAmmoForAttack(atk, items)).toBe(null)
  })

  it('null quando nenhum item bate', () => {
    const atk = { name: 'Zarabatana', properties: ['ammunition'] }
    expect(findAmmoForAttack(atk, items)).toBe(null)  // não tem Agulha
  })

  it('aceita propriedade "munição" PT-BR', () => {
    const atk = { name: 'Arco Curto', properties: ['munição'] }
    expect(findAmmoForAttack(atk, items)?.name).toBe('Flecha')
  })
})
