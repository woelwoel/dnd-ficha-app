import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../systems/dnd5e/domain/rules'
import { resolveMultiSelect, isChoiceDone } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'
import { ACTION_BADGES } from '../systems/dnd5e/components/CharacterSheet/actionBadges'
import tashaChoices from '../../public/srd-data/tasha-class-choices-pt.json'

function fighterChar(level, chosenArchetype = null) {
  return {
    info: {
      class: 'guerreiro',
      level,
      chosenFeatures: chosenArchetype ? { martial_archetype: chosenArchetype } : {},
    },
    attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 10 },
  }
}

describe('Dado de Superioridade (Mestre de Combate)', () => {
  it('não aparece pra Guerreiro sem arquétipo escolhido', () => {
    const uses = defaultClassFeatureUses(fighterChar(3))
    expect(uses.find(u => u.id === 'guerreiro-superiority-dice')).toBeUndefined()
  })

  it('não aparece pra Campeão', () => {
    const uses = defaultClassFeatureUses(fighterChar(3, 'campeao'))
    expect(uses.find(u => u.id === 'guerreiro-superiority-dice')).toBeUndefined()
  })

  it('aparece pra Mestre de Combate nv 3 — 4 dados d8', () => {
    const uses = defaultClassFeatureUses(fighterChar(3, 'mestre_combate'))
    const sup = uses.find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup).toBeDefined()
    expect(sup.max).toBe(4)
    expect(sup.name).toContain('d8')
    expect(sup.recharge).toBe('short')
  })

  it('5 dados no nv 7', () => {
    const sup = defaultClassFeatureUses(fighterChar(7, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(5)
    expect(sup.name).toContain('d8')
  })

  it('d10 no nv 10', () => {
    const sup = defaultClassFeatureUses(fighterChar(10, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(5)
    expect(sup.name).toContain('d10')
  })

  it('6 dados d10 no nv 15', () => {
    const sup = defaultClassFeatureUses(fighterChar(15, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(6)
    expect(sup.name).toContain('d10')
  })

  it('6 dados d12 no nv 18', () => {
    const sup = defaultClassFeatureUses(fighterChar(18, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(6)
    expect(sup.name).toContain('d12')
  })
})

describe('manobras de Tasha: tipo de ação curado nas options', () => {
  const options = tashaChoices.guerreiro.choices
    .find(c => c.id === 'martial_archetype_maneuvers').options

  it('as 7 options declaram um `type` do vocabulário do painel', () => {
    expect(options).toHaveLength(7)
    for (const o of options) {
      expect(Object.keys(ACTION_BADGES), `manobra ${o.value}`).toContain(o.type)
    }
  })

  it('as 7 options têm `trigger` no estilo do catálogo do PHB', () => {
    for (const o of options) {
      // linha de gatilho é curta (a UI trunca) e sem ponto final, como no PHB
      expect(o.trigger, `manobra ${o.value}`).toBeTruthy()
      expect(o.trigger.length, `manobra ${o.value}`).toBeLessThanOrEqual(70)
      expect(o.trigger.endsWith('.'), `manobra ${o.value}`).toBe(false)
    }
  })

  it('o tipo bate com o texto da regra', () => {
    const byValue = Object.fromEntries(options.map(o => [o.value, o.type]))
    // somam o dado a um teste/rolagem, sem custar ação
    expect(byValue['emboscada']).toBe('passiva')
    expect(byValue['presenca-dominante']).toBe('passiva')
    expect(byValue['avaliacao-tatica']).toBe('passiva')
    // "como ação bônus"
    expect(byValue['lancamento-rapido']).toBe('ação bônus')
    expect(byValue['golpe-imobilizador']).toBe('ação bônus')
    // "use sua reação" (o texto PT de `enganchar` é o da manobra Brace)
    expect(byValue['enganchar']).toBe('reação')
    // troca de lugar gastando movimento no seu turno — nem ação, nem bônus
    expect(byValue['engodo']).toBe('movimento')
  })
})

describe('resolveMultiSelect (multiSelectByLevel)', () => {
  const maneuversChoice = {
    multiSelectByLevel: { 3: 3, 7: 5, 10: 7, 15: 9 },
  }

  it('escala com nível', () => {
    expect(resolveMultiSelect(maneuversChoice, 3)).toBe(3)
    expect(resolveMultiSelect(maneuversChoice, 6)).toBe(3)
    expect(resolveMultiSelect(maneuversChoice, 7)).toBe(5)
    expect(resolveMultiSelect(maneuversChoice, 10)).toBe(7)
    expect(resolveMultiSelect(maneuversChoice, 20)).toBe(9)
  })

  it('multiSelect fixo tem precedência sobre byLevel', () => {
    expect(resolveMultiSelect({ multiSelect: 2, multiSelectByLevel: { 3: 5 } }, 3)).toBe(2)
  })

  it('0 quando ausente', () => {
    expect(resolveMultiSelect({}, 5)).toBe(0)
    expect(resolveMultiSelect(null, 5)).toBe(0)
  })

  it('isChoiceDone usa byLevel corretamente', () => {
    expect(isChoiceDone(maneuversChoice, ['a', 'b'], 3)).toBe(false)       // precisa 3
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c'], 3)).toBe(true)
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c'], 7)).toBe(false)  // precisa 5 no nv 7
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c', 'd', 'e'], 7)).toBe(true)
  })
})
