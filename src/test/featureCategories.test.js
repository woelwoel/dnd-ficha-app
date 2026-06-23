// src/test/featureCategories.test.js
import { describe, it, expect } from 'vitest'
import {
  detectActionType, combatTier, featureCategory, actionTypeOf,
  isAttributeIncrease, featureUseId, collapseScalingFeatures,
  COMBAT_TIERS, FEATURE_CATEGORIES,
} from '../systems/dnd5e/domain/featureCategories'

describe('featureCategories', () => {
  it('detectActionType reconhece os três tipos pela descrição', () => {
    expect(detectActionType('Como ação bônus, você entra em fúria')).toBe('ação bônus')
    expect(detectActionType('Como reação ao ser acertado')).toBe('reação')
    expect(detectActionType('Como ação, você assume a forma')).toBe('ação')
    expect(detectActionType('Você ganha +1 de CA')).toBe(null)
    // case-insensitive por design
    expect(detectActionType('COMO REAÇÃO ao ser acertado')).toBe('reação')
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
    expect(isAttributeIncrease({ name: 'Aumento de Atributo (Nível 4)' })).toBe(true)
    expect(isAttributeIncrease({ name: '  Aumento de Atributo' })).toBe(true)
    expect(isAttributeIncrease({ name: 'Ataque Extra' })).toBe(false)
    expect(isAttributeIncrease({})).toBe(false)
  })

  it('expõe as listas de valores válidos', () => {
    expect(COMBAT_TIERS).toEqual(['essencial', 'situacional'])
    expect(FEATURE_CATEGORIES).toEqual(['defesa', 'exploracao', 'social', 'magia'])
  })

  it('featureUseId liga feature ao recurso rastreável', () => {
    // nome exato
    expect(featureUseId('barbaro', 'Fúria')).toBe('barbaro-rage')
    // nome do recurso diverge do nome da feature
    expect(featureUseId('guerreiro', 'Segunda Rajada')).toBe('guerreiro-second-wind')
    expect(featureUseId('feiticeiro', 'Fonte de Magia')).toBe('feiticeiro-sorcery-points')
    // variantes de nível (sufixo entre parênteses) casam o mesmo recurso
    expect(featureUseId('guerreiro', 'Surto de Ação (1 uso)')).toBe('guerreiro-action-surge')
    expect(featureUseId('bardo', 'Inspiração Bárdica (d8)')).toBe('bardo-bardic-inspiration')
    expect(featureUseId('clerigo', 'Canalizar Divindade (2/descanso)')).toBe('clerigo-channel-divinity')
  })

  it('featureUseId NÃO casa nomes parecidos nem desconhecidos', () => {
    // "Fúria Implacável"/"Fúria Persistente" não são a Fúria (recurso)
    expect(featureUseId('barbaro', 'Fúria Implacável')).toBe(null)
    expect(featureUseId('barbaro', 'Fúria Persistente')).toBe(null)
    // feature sem recurso
    expect(featureUseId('ladino', 'Ataque Furtivo (1d6)')).toBe(null)
    // classe errada
    expect(featureUseId('mago', 'Fúria')).toBe(null)
  })
})

describe('collapseScalingFeatures', () => {
  it('colapsa Ataque Furtivo para só a variante do nível mais alto', () => {
    const features = [
      { id: 'a', name: 'Ataque Furtivo (1d6)', desc: 'Uma vez por turno, você causa dano extra. Regras completas aqui.', source: 'Ladino', level: 1, combat: 'essencial' },
      { id: 'b', name: 'Ataque Furtivo (2d6)', desc: 'Aumenta para 2d6.', source: 'Ladino', level: 3, combat: 'essencial' },
      { id: 'c', name: 'Ataque Furtivo (3d6)', desc: 'Aumenta para 3d6.', source: 'Ladino', level: 5, combat: 'essencial' },
    ]
    const out = collapseScalingFeatures(features)
    expect(out).toHaveLength(1)
    // nome carrega o valor atual (nível mais alto)
    expect(out[0].name).toBe('Ataque Furtivo (3d6)')
    // descrição preserva a mais completa (regras inteiras do 1º nível)
    expect(out[0].desc).toContain('Regras completas')
    // nível em que foi adquirida (primeiro)
    expect(out[0].level).toBe(1)
    // mantém a tag de combate
    expect(out[0].combat).toBe('essencial')
  })

  it('não funde features de mesmo nome-base mas de origens diferentes', () => {
    const features = [
      { name: 'Ataque Extra', source: 'Guerreiro', level: 5 },
      { name: 'Ataque Extra', source: 'Patrulheiro', level: 5 },
    ]
    expect(collapseScalingFeatures(features)).toHaveLength(2)
  })

  it('preserva features únicas e a ordem de entrada', () => {
    const features = [
      { name: 'Ação Ardilosa', source: 'Ladino', level: 2 },
      { name: 'Ataque Furtivo (1d6)', source: 'Ladino', level: 1 },
      { name: 'Ataque Furtivo (2d6)', source: 'Ladino', level: 3 },
      { name: 'Evasão', source: 'Ladino', level: 7 },
    ]
    const out = collapseScalingFeatures(features)
    expect(out.map(f => f.name)).toEqual(['Ação Ardilosa', 'Ataque Furtivo (2d6)', 'Evasão'])
  })
})
