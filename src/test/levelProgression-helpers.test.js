import { describe, it, expect, vi } from 'vitest'
import {
  isASIEntry, calcHpAverage, calcHpMax, rollDie,
} from '../components/CharacterSheet/levelProgression/helpers'

describe('levelProgression/helpers', () => {
  describe('isASIEntry', () => {
    it('retorna true quando feature contém "Aumento"', () => {
      expect(isASIEntry({ features: [{ name: 'Aumento de Habilidade' }] })).toBe(true)
    })
    it('retorna true quando feature contém "Melhoria"', () => {
      expect(isASIEntry({ features: [{ name: 'Melhoria de Atributo' }] })).toBe(true)
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
