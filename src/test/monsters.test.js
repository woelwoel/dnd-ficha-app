import { describe, it, expect } from 'vitest'
import {
  matchesMonsterFilters,
  formatCR,
  countActiveMonsterFilters,
  EMPTY_MONSTER_FILTERS,
} from '../utils/monsters'

const goblin = {
  index: 'goblin', name: 'Goblin',
  size: 'Small', type: 'humanoid', alignment: 'neutral evil',
  challenge_rating: 0.25,
}
const dragon = {
  index: 'ancient-red-dragon', name: 'Ancient Red Dragon',
  size: 'Gargantuan', type: 'dragon', alignment: 'chaotic evil',
  challenge_rating: 24,
}
const sphinx = {
  index: 'androsphinx', name: 'Androsphinx',
  size: 'Large', type: 'monstrosity', alignment: 'lawful neutral',
  challenge_rating: 17,
}
const commoner = {
  index: 'commoner', name: 'Commoner',
  size: 'Medium', type: 'humanoid', alignment: 'any alignment',
  challenge_rating: 0,
}

describe('matchesMonsterFilters', () => {
  it('vazio passa qualquer monstro', () => {
    expect(matchesMonsterFilters(goblin, EMPTY_MONSTER_FILTERS)).toBe(true)
    expect(matchesMonsterFilters(dragon, EMPTY_MONSTER_FILTERS)).toBe(true)
  })

  it('CR min/max isolado', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, cr: { min: 1, max: 5 } }
    expect(matchesMonsterFilters(goblin, f)).toBe(false)
    expect(matchesMonsterFilters(commoner, f)).toBe(false)
    expect(matchesMonsterFilters(dragon, f)).toBe(false)
    const f2 = { ...EMPTY_MONSTER_FILTERS, cr: { min: 0, max: 0.5 } }
    expect(matchesMonsterFilters(goblin, f2)).toBe(true)
  })

  it('tipo single', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, types: new Set(['dragon']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(false)
  })

  it('tipo múltiplo (OR)', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, types: new Set(['dragon', 'humanoid']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(true)
    expect(matchesMonsterFilters(sphinx, f)).toBe(false)
  })

  it('tamanho', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, sizes: new Set(['Small', 'Medium']) }
    expect(matchesMonsterFilters(goblin, f)).toBe(true)
    expect(matchesMonsterFilters(commoner, f)).toBe(true)
    expect(matchesMonsterFilters(dragon, f)).toBe(false)
  })

  it('alinhamento case-insensitive (casa exato após lowercase)', () => {
    const f = { ...EMPTY_MONSTER_FILTERS, alignments: new Set(['chaotic evil']) }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters({ ...dragon, alignment: 'Chaotic Evil' }, f)).toBe(true)
    expect(matchesMonsterFilters(goblin, f)).toBe(false)
  })

  it('AND entre dimensões', () => {
    const f = {
      cr: { min: 10, max: 30 },
      types: new Set(['dragon']),
      sizes: new Set(['Gargantuan']),
      alignments: new Set(['chaotic evil']),
    }
    expect(matchesMonsterFilters(dragon, f)).toBe(true)
    expect(matchesMonsterFilters(sphinx, f)).toBe(false)
  })
})

describe('formatCR', () => {
  it('valores fracionários', () => {
    expect(formatCR(0)).toBe('0')
    expect(formatCR(0.125)).toBe('1/8')
    expect(formatCR(0.25)).toBe('1/4')
    expect(formatCR(0.5)).toBe('1/2')
  })
  it('inteiros', () => {
    expect(formatCR(1)).toBe('1')
    expect(formatCR(5)).toBe('5')
    expect(formatCR(30)).toBe('30')
  })
})

describe('countActiveMonsterFilters', () => {
  it('vazio retorna 0', () => {
    expect(countActiveMonsterFilters(EMPTY_MONSTER_FILTERS)).toBe(0)
  })

  it('cr.min > 0 e cr.max < 30 contam', () => {
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 5, max: 30 } })).toBe(1)
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 0, max: 10 } })).toBe(1)
    expect(countActiveMonsterFilters({ ...EMPTY_MONSTER_FILTERS, cr: { min: 1, max: 10 } })).toBe(2)
  })

  it('soma sets', () => {
    const f = {
      cr: { min: 0, max: 30 },
      types: new Set(['dragon', 'humanoid']),
      sizes: new Set(['Small']),
      alignments: new Set(['chaotic evil', 'lawful good']),
    }
    expect(countActiveMonsterFilters(f)).toBe(5)
  })
})
