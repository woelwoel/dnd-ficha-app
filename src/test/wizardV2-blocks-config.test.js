import { describe, it, expect } from 'vitest'
import { BLOCKS } from '../components/CharacterWizardV2/blocks-config'

describe('BLOCKS config', () => {
  it('lista 8 blocos na ordem recomendada (Atributos antes de Classe)', () => {
    // Conceito primeiro (engajamento). Atributos vem ANTES de Classe porque
    // o ASI é distribuído na Classe e alocá-lo sem os atributos base é cego.
    expect(BLOCKS.map(b => b.id)).toEqual([
      'concept', 'race', 'attributes', 'class', 'background',
      'skills', 'spells', 'review',
    ])
  })

  it('Atributos vem antes de Classe e está em Fundamentos', () => {
    const ids = BLOCKS.map(b => b.id)
    expect(ids.indexOf('attributes')).toBeLessThan(ids.indexOf('class'))
    expect(BLOCKS.find(b => b.id === 'attributes').group).toBe('fundamentos')
  })

  it('cada bloco tem id e label', () => {
    BLOCKS.forEach(b => {
      expect(typeof b.id).toBe('string')
      expect(typeof b.label).toBe('string')
      expect(b.id.length).toBeGreaterThan(0)
      expect(b.label.length).toBeGreaterThan(0)
    })
  })
})
