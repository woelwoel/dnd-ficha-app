import { describe, it, expect } from 'vitest'
import { BLOCKS } from '../components/CharacterWizardV2/blocks-config'

describe('BLOCKS config', () => {
  it('lista 8 blocos na ordem recomendada', () => {
    expect(BLOCKS.map(b => b.id)).toEqual([
      'race', 'class', 'background', 'attributes',
      'skills', 'spells', 'concept', 'review',
    ])
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
