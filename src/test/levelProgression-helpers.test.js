import { describe, it, expect, vi } from 'vitest'
import {
  isASIEntry, calcHpAverage, calcHpMax, rollDie,
} from '../systems/dnd5e/components/CharacterSheet/levelProgression/helpers'

describe('levelProgression/helpers', () => {
  /**
   * Cada fonte escreveu o nome do Incremento de Habilidade do seu jeito, e a
   * deteccao precisa aceitar as tres redacoes que existem na base.
   *
   * Este bloco ja afirmou que "Melhoria de Atributo" era ASI. Aquele nome nao
   * existe em nenhum JSON de progressao -- era fixture inventada --, e casar
   * "Melhoria" fazia Clerigo nv 20 ("Melhoria da Intervencao Divina") e
   * Paladino nv 18 ("Melhoria das Auras") oferecerem um aumento que a regra
   * nao da. As assercoes agora usam so redacoes que existem de verdade.
   */
  describe('isASIEntry', () => {
    it('aceita a redacao do PHB', () => {
      expect(isASIEntry({ features: [{ name: 'Aumento de Atributo' }] })).toBe(true)
    })
    it('aceita a redacao do Tasha', () => {
      expect(isASIEntry({ features: [{ name: 'Aumento no Valor de Atributo' }] })).toBe(true)
    })
    it('aceita a redacao do Cacador de Sangue', () => {
      expect(isASIEntry({ features: [{ name: 'Incremento no Valor de Habilidade' }] })).toBe(true)
    })
    it('NAO casa "Melhoria ..." -- sao features normais, nao aumento', () => {
      expect(isASIEntry({ features: [{ name: 'Melhoria da Intervenção Divina' }] })).toBe(false)
      expect(isASIEntry({ features: [{ name: 'Melhoria das Auras' }] })).toBe(false)
    })
    it('retorna false quando nenhuma feature é ASI', () => {
      expect(isASIEntry({ features: [{ name: 'Ataque Extra' }] })).toBe(false)
    })
    it('retorna falsy quando entry ou features ausentes', () => {
      expect(isASIEntry(null)).toBeFalsy()
      expect(isASIEntry({})).toBeFalsy()
      expect(isASIEntry({ features: [] })).toBe(false)
    })
  })

  describe('calcHpAverage', () => {
    it('d8 + CON 0 = 5', () => {
      expect(calcHpAverage(8, 0)).toBe(5)
    })
    it('d10 + CON 2 = 8', () => {
      expect(calcHpAverage(10, 2)).toBe(8)
    })
    it('d6 + CON -3 = 1 (clampa em 1 mínimo)', () => {
      expect(calcHpAverage(6, -3)).toBe(1)
    })
  })

  describe('calcHpMax', () => {
    it('d8 + CON 0 = 8', () => {
      expect(calcHpMax(8, 0)).toBe(8)
    })
    it('d12 + CON 3 = 15', () => {
      expect(calcHpMax(12, 3)).toBe(15)
    })
    it('clampa em 1 mínimo', () => {
      expect(calcHpMax(4, -10)).toBe(1)
    })
  })

  describe('rollDie', () => {
    it('rolagem fica dentro de 1..sides', () => {
      for (let i = 0; i < 200; i++) {
        const v = rollDie(8)
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(8)
      }
    })
    it('determinístico com Math.random mockado', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(rollDie(8)).toBe(4) // ceil(0.5*8) = 4
      spy.mockRestore()
    })
  })
})
