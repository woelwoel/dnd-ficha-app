import { describe, it, expect } from 'vitest'
import {
  getProficiencyBonus,
  getModifier,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateSkillModifier,
  calculatePassivePerception,
  calculateMaxHp,
  calculateMaxHpFromHitDice,
} from '../utils/calculations'

describe('calculateMaxHpFromHitDice', () => {
  it('single-class nv1 = dado máximo + CON', () => {
    // d10, CON 14 (+2) → 12
    expect(calculateMaxHpFromHitDice({ primaryDie: 10, primaryLevel: 1, conScore: 14 })).toBe(12)
  })
  it('níveis 2+ usam média (floor(die/2)+1+CON)', () => {
    // d10 nv3, CON 13 (+1): nv1=11; média = floor(10/2)+1+1 = 7 → 11 + 7 + 7 = 25
    expect(calculateMaxHpFromHitDice({ primaryDie: 10, primaryLevel: 3, conScore: 13 })).toBe(25)
  })
  it('soma os dados das multiclasses (média por nível)', () => {
    // Guerreiro 1 (d10) / Mago 2 (d6), CON 13 (+1): 11 + 5 + 5 = 21
    const hp = calculateMaxHpFromHitDice({
      primaryDie: 10, primaryLevel: 1, conScore: 13,
      extras: [{ die: 6, level: 2 }],
    })
    expect(hp).toBe(21)
  })
  it('Robusto soma +2 por nível total', () => {
    // d10 nv1 CON 13 = 11; Robusto +2*total(=3 se houver mc) ...
    const hp = calculateMaxHpFromHitDice({
      primaryDie: 10, primaryLevel: 1, conScore: 13,
      extras: [{ die: 6, level: 2 }], robustoLevels: 3,
    })
    expect(hp).toBe(21 + 6)
  })
  it('mínimo +1 por nível mesmo com CON muito negativa', () => {
    // d6, CON 1 (-5): nv1 max(1, 6-5)=1; nv2 média max(1, 3+1-5)=1 → total 2
    expect(calculateMaxHpFromHitDice({ primaryDie: 6, primaryLevel: 2, conScore: 1 })).toBe(2)
  })
  it('calculateMaxHp (single-class) bate com o helper', () => {
    const classData = { hit_die: 8 }
    expect(calculateMaxHp(classData, 5, 12)).toBe(
      calculateMaxHpFromHitDice({ primaryDie: 8, primaryLevel: 5, conScore: 12 })
    )
  })
})

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
