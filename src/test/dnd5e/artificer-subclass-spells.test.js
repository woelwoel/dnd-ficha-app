import { describe, it, expect } from 'vitest'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'

describe('Artífice — magias sempre-preparadas de Especialização (Tasha)', () => {
  it('Ferreiro de Batalha nv3: tier 3 sempre-preparado (Heroísmo)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 3,
    })
    expect(result.indices).toEqual(['heroismo'])
    expect(result.alwaysPrepared).toBe(true)
    expect(result.source).toBe('specialization')
    expect(result.label).toBe('Especialização: ferreiro-de-batalha')
  })

  it('Ferreiro de Batalha nv5: tier 5 sempre-preparado (Marca da Punição, Vínculo Protetor)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 5,
    })
    expect(result.indices).toEqual(['marca-da-punicao', 'vinculo-protetor'])
    expect(result.alwaysPrepared).toBe(true)
  })

  it('Ferreiro de Batalha nv4 (não é nível de tier): nenhuma magia concedida', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 4,
    })
    expect(result.indices).toEqual([])
  })

  it('Alquimista nv9: tier 9 sempre-preparado (Forma Gasosa, Palavra Curativa em Massa)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'alquimista' },
      classLevel: 9,
    })
    expect(result.indices).toEqual(['forma-gasosa', 'palavra-curativa-em-massa'])
    expect(result.alwaysPrepared).toBe(true)
    expect(result.label).toBe('Especialização: alquimista')
  })

  it('Armeiro nv13: tier 13 sempre-preparado (Escudo de Fogo, Invisibilidade Maior)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'armeiro' },
      classLevel: 13,
    })
    expect(result.indices).toEqual(['escudo-de-fogo', 'invisibilidade-maior'])
  })

  it('Atirador nv17: tier 17 sempre-preparado (Cone de Frio, Muralha de Energia)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'atirador' },
      classLevel: 17,
    })
    expect(result.indices).toEqual(['cone-de-frio', 'muralha-de-energia'])
  })

  it('sem especialização escolhida: nenhuma magia concedida mesmo em nível de tier', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: {},
      classLevel: 3,
    })
    expect(result.indices).toEqual([])
  })
})
