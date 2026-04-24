import { describe, it, expect } from 'vitest'
import {
  getProficiencyBonus,
  getModifier,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateSkillModifier,
  calculatePassivePerception,
} from '../utils/calculations'

describe('getProficiencyBonus', () => {
  it('nível 1-4 → +2', () => {
    expect(getProficiencyBonus(1)).toBe(2)
    expect(getProficiencyBonus(4)).toBe(2)
  })
  it('nível 5-8 → +3', () => {
    expect(getProficiencyBonus(5)).toBe(3)
    expect(getProficiencyBonus(8)).toBe(3)
  })
  it('nível 17-20 → +6', () => {
    expect(getProficiencyBonus(17)).toBe(6)
    expect(getProficiencyBonus(20)).toBe(6)
  })
  it('nível total multiclasse 5 (ex: guerreiro2/mago3) → +3', () => {
    expect(getProficiencyBonus(5)).toBe(3)
  })
})

describe('profBonus baseado em nível total (multiclasse)', () => {
  function totalLevelProfBonus(primaryLevel, multiclasses) {
    const total = primaryLevel + multiclasses.reduce((s, m) => s + (m.level ?? 0), 0)
    return getProficiencyBonus(total)
  }

  it('monoclasse nível 3 → +2', () => {
    expect(totalLevelProfBonus(3, [])).toBe(2)
  })

  it('guerreiro 2 / mago 3 (total 5) → +3', () => {
    expect(totalLevelProfBonus(2, [{ level: 3 }])).toBe(3)
  })

  it('paladino 2 / feiticeiro 3 (total 5) → +3', () => {
    expect(totalLevelProfBonus(2, [{ level: 3 }])).toBe(3)
  })

  it('patrulheiro 5 / ladino 2 (total 7) → +3', () => {
    expect(totalLevelProfBonus(5, [{ level: 2 }])).toBe(3)
  })

  it('bruxo 3 / mago 3 (total 6) → +3', () => {
    expect(totalLevelProfBonus(3, [{ level: 3 }])).toBe(3)
  })

  it('multiclasse total 9 → +4', () => {
    expect(totalLevelProfBonus(5, [{ level: 4 }])).toBe(4)
  })

  it('nível total 13 → +5', () => {
    expect(totalLevelProfBonus(7, [{ level: 6 }])).toBe(5)
  })
})

describe('getModifier', () => {
  it('10 → 0', () => expect(getModifier(10)).toBe(0))
  it('8 → -1', () => expect(getModifier(8)).toBe(-1))
  it('15 → +2', () => expect(getModifier(15)).toBe(2))
  it('20 → +5', () => expect(getModifier(20)).toBe(5))
})

describe('Spell Save DC e Attack Bonus', () => {
  it('mago nível 1 com INT 16 → DC 13, ataque +5', () => {
    const profBonus = getProficiencyBonus(1) // +2
    const intScore = 16 // mod +3
    expect(calculateSpellSaveDC(intScore, profBonus)).toBe(13) // 8+2+3
    expect(calculateSpellAttackBonus(intScore, profBonus)).toBe(5) // 2+3
  })
})

describe('calculateSkillModifier', () => {
  it('sem proficiência', () => {
    expect(calculateSkillModifier(14, 3, false, false)).toBe(2)
  })
  it('com proficiência', () => {
    expect(calculateSkillModifier(14, 3, true, false)).toBe(5)
  })
  it('com especialização', () => {
    expect(calculateSkillModifier(14, 3, true, true)).toBe(8)
  })
  it('especialização sem proficiência → apenas modificador (PHB p.96)', () => {
    // expertise só conta se o personagem também for proficiente
    expect(calculateSkillModifier(14, 3, false, true)).toBe(2)
  })
})

describe('calculatePassivePerception', () => {
  it('sem proficiência: 10 + mod SAB', () => {
    expect(calculatePassivePerception(12, 3, false)).toBe(11) // 10+1
  })
  it('com proficiência: 10 + mod SAB + prof', () => {
    expect(calculatePassivePerception(12, 3, true)).toBe(14) // 10+1+3
  })
  it('com especialização: 10 + mod SAB + 2*prof', () => {
    expect(calculatePassivePerception(12, 3, true, true)).toBe(17) // 10+1+3+3
  })
})
