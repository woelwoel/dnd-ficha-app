// src/test/featureCategories.test.js
import { describe, it, expect } from 'vitest'
import {
  detectActionType, combatTier, featureCategory, actionTypeOf,
  isAttributeIncrease, COMBAT_TIERS, FEATURE_CATEGORIES,
} from '../domain/featureCategories'

describe('featureCategories', () => {
  it('detectActionType reconhece os três tipos pela descrição', () => {
    expect(detectActionType('Como ação bônus, você entra em fúria')).toBe('ação bônus')
    expect(detectActionType('Como reação ao ser acertado')).toBe('reação')
    expect(detectActionType('Como ação, você assume a forma')).toBe('ação')
    expect(detectActionType('Você ganha +1 de CA')).toBe(null)
  })

  it('combatTier devolve só valores válidos, senão null', () => {
    expect(combatTier({ combat: 'essencial' })).toBe('essencial')
    expect(combatTier({ combat: 'situacional' })).toBe('situacional')
    expect(combatTier({ combat: 'xpto' })).toBe(null)
    expect(combatTier({})).toBe(null)
  })

  it('featureCategory cai em "outras" quando ausente/ inválida', () => {
    expect(featureCategory({ category: 'defesa' })).toBe('defesa')
    expect(featureCategory({ category: 'lixo' })).toBe('outras')
    expect(featureCategory({})).toBe('outras')
  })

  it('actionTypeOf: actionType explícito vence; senão heurística; senão "passiva"', () => {
    expect(actionTypeOf({ actionType: 'reação', desc: 'Como ação' })).toBe('reação')
    expect(actionTypeOf({ desc: 'Como ação bônus, ...' })).toBe('ação bônus')
    expect(actionTypeOf({ desc: 'Bônus passivo de dano' })).toBe('passiva')
  })

  it('isAttributeIncrease pega "Aumento de Atributo"', () => {
    expect(isAttributeIncrease({ name: 'Aumento de Atributo' })).toBe(true)
    expect(isAttributeIncrease({ name: 'Ataque Extra' })).toBe(false)
  })

  it('expõe as listas de valores válidos', () => {
    expect(COMBAT_TIERS).toEqual(['essencial', 'situacional'])
    expect(FEATURE_CATEGORIES).toEqual(['defesa', 'exploracao', 'social', 'magia'])
  })
})
