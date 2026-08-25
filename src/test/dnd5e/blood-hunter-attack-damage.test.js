import { describe, it, expect } from 'vitest'
import { calculateWeaponDamage } from '../../systems/dnd5e/utils/attacks'

const forca16 = { str: 16, dex: 10 }

describe('dano de arma com Ritual Vermelho', () => {
  const espada = { id: 'espada', damageDice: '1d8', damageType: 'cortante', properties: [] }

  it('sem rito, a expressão não muda', () => {
    const r = calculateWeaponDamage(espada, forca16)
    expect(r.expression).toBe('1d8 + 3')
    expect(r.rite).toBeNull()
  })

  it('com rito, acrescenta o dado com o tipo de dano do rito', () => {
    const atk = { ...espada, rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.expression).toBe('1d8 + 3 + 1d6 fogo')
    expect(r.rite).toEqual({ dice: '1d6', damageType: 'fogo' })
  })

  it('não contamina dice nem modifier — o rolador depende deles', () => {
    const atk = { ...espada, rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.dice).toBe('1d8')
    expect(r.modifier).toBe(3)
  })

  it('convive com Estilo de Luta na mesma arma sem um comer o outro', () => {
    // Duelismo: +2 no dano de arma corpo-a-corpo em uma mão.
    const atk = { ...espada, fightingStyles: ['dueling'], rite: { dice: '1d6', damageType: 'fogo' } }
    const r = calculateWeaponDamage(atk, forca16)
    expect(r.modifier).toBe(5)
    expect(r.expression).toBe('1d8 + 5 + 1d6 fogo')
  })

  it('com modificador zero, ainda mostra o dado do rito', () => {
    const adaga = { id: 'adaga', damageDice: '1d4', properties: [], rite: { dice: '1d4', damageType: 'frio' } }
    const r = calculateWeaponDamage(adaga, { str: 10, dex: 10 })
    expect(r.expression).toBe('1d4 + 1d4 frio')
  })
})
