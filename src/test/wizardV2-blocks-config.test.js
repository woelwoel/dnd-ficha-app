import { describe, it, expect } from 'vitest'
import { BLOCKS } from '../components/CharacterWizardV2/blocks-config'

describe('BLOCKS config', () => {
  it('lista 8 blocos na ordem recomendada (Conceito primeiro em Fundamentos)', () => {
    // Conceito (nome) vem PRIMEIRO em Fundamentos pra dar engajamento
    // emocional cedo no fluxo de criação — jogador novo nomeia o
    // personagem antes de mexer em raça/classe/atributos.
    expect(BLOCKS.map(b => b.id)).toEqual([
      'concept', 'race', 'class', 'background',
      'attributes', 'skills', 'spells', 'review',
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
