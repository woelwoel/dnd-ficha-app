import { describe, it, expect } from 'vitest'
import {
  aggregateSpellEffects, upsertEffect, removeEffect,
  pruneOnConcentrationChange, buildEffectInstance, EFFECT_CATEGORIES,
} from '../systems/dnd5e/domain/activeEffects'

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const BENCAO = { id: 'bencao', name: 'Bênção', source: 'cast', concentration: true, riders: [{ dice: '1d4', categories: ['attack', 'save'] }], summary: '+1d4' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, mods: { ac: 2, speedMultiplier: 2 }, advantages: [{ categories: ['save'], abilities: ['dex'] }], summary: 'x2' }
const ORIENT = { id: 'orientacao', name: 'Orientação', source: 'manual', concentration: true, riders: [{ dice: '1d4', categories: ['check'], oneShot: true }], summary: '+1d4 teste' }

describe('aggregateSpellEffects', () => {
  it('vazio → neutro', () => {
    const { fx, riders, advantages } = aggregateSpellEffects([])
    expect(fx).toMatchObject({ ac: 0, saves: 0, speed: 0, speedMultiplier: 1 })
    expect(riders).toEqual([])
    expect(advantages).toEqual([])
  })
  it('soma fixos e multiplica multiplicadores', () => {
    const { fx } = aggregateSpellEffects([ESCUDO, VELOC])
    expect(fx.ac).toBe(4)
    expect(fx.speedMultiplier).toBe(2)
  })
  it('riders e advantages carregam effectId/effectName', () => {
    const { riders, advantages } = aggregateSpellEffects([BENCAO, VELOC, ORIENT])
    expect(riders).toEqual([
      { dice: '1d4', categories: ['attack', 'save'], oneShot: false, effectId: 'bencao', effectName: 'Bênção' },
      { dice: '1d4', categories: ['check'], oneShot: true, effectId: 'orientacao', effectName: 'Orientação' },
    ])
    expect(advantages).toEqual([{ mode: 'adv', categories: ['save'], abilities: ['dex'], effectId: 'velocidade' }])
  })
  it('saveAbility soma por chave', () => {
    const a = { id: 'a', name: 'A', source: 'manual', mods: { saveAbility: { con: 1 } } }
    const b = { id: 'b', name: 'B', source: 'manual', mods: { saveAbility: { con: 2, dex: 1 } } }
    expect(aggregateSpellEffects([a, b]).fx.saveAbility).toMatchObject({ con: 3, dex: 1 })
  })
})

describe('upsert/remove/prune', () => {
  it('upsert substitui por id (mesma magia nao empilha)', () => {
    const list = upsertEffect([ESCUDO], { ...ESCUDO, mods: { ac: 2 } })
    expect(list).toHaveLength(1)
  })
  it('ids distintos coexistem', () => {
    expect(upsertEffect([ESCUDO], BENCAO)).toHaveLength(2)
  })
  it('removeEffect tira por id', () => {
    expect(removeEffect([ESCUDO, BENCAO], 'bencao')).toEqual([ESCUDO])
  })
  it('prune remove cast+concentration da magia que saiu; manual fica', () => {
    const list = [ESCUDO, VELOC] // ESCUDO cast, VELOC manual
    expect(pruneOnConcentrationChange(list, 'escudo-da-fe')).toEqual([VELOC])
    expect(pruneOnConcentrationChange(list, 'outra-magia')).toEqual(list)
    expect(pruneOnConcentrationChange(list, null)).toEqual(list)
  })
})

describe('buildEffectInstance', () => {
  it('monta a instancia a partir da magia + effect curado', () => {
    const def = { concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
    expect(buildEffectInstance({ index: 'escudo-da-fe', name: 'Escudo da Fé' }, def, 'cast')).toEqual({
      id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true,
      mods: { ac: 2 }, riders: [], advantages: [], summary: '+2 CA',
    })
  })
})

describe('EFFECT_CATEGORIES', () => {
  it('exporta as categorias canonicas', () => {
    expect(EFFECT_CATEGORIES).toEqual(['attack', 'save', 'check'])
  })
})
