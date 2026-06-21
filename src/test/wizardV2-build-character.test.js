import { describe, it, expect } from 'vitest'
import {
  buildCharacter, resolveClassEquipmentItems, computeFinalAttributes,
  computeDraftMaxHp, totalCharacterLevel,
} from '../components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

describe('computeFinalAttributes', () => {
  it('soma base + racial + ASI (teto 20 no ASI, 30 no racial)', () => {
    const draft = {
      baseAttributes: { str: 15, dex: 15, con: 12, int: 10, wis: 12, cha: 11 },
      racialBonuses: { dex: 2 },
      asiChoices: { 4: { type: 'asi', bonuses: { dex: 2 } } },
    }
    expect(computeFinalAttributes(draft).dex).toBe(19) // 15 + 2 + 2
  })

  it('ASI não ultrapassa 20', () => {
    const draft = {
      baseAttributes: { str: 19, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      racialBonuses: {},
      asiChoices: { 4: { type: 'asi', bonuses: { str: 2 } } }, // 19+2 → capado em 20
    }
    expect(computeFinalAttributes(draft).str).toBe(20)
  })

  it('inclui talento com bônus de atributo e multiclasse', () => {
    const draft = {
      baseAttributes: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      racialBonuses: {},
      asiChoices: { 4: { type: 'feat', featAttrBonus: { amount: 1, choices: ['str'] }, featChosenAttr: 'str' } },
      multiclasses: [{ class: 'guerreiro', level: 4, asiChoices: { 4: { type: 'asi', bonuses: { str: 2 } } } }],
    }
    expect(computeFinalAttributes(draft).str).toBe(17) // 14 + 1 (feat) + 2 (mc asi)
  })

  it('aplica bônus de atributo do talento racial (Humano Variante)', () => {
    const draft = {
      baseAttributes: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      racialBonuses: { dex: 1 },
      racialFeat: { featIndex: 'atleta', featName: 'Atleta', featAttrBonus: { amount: 1, choices: ['str', 'dex'] }, featChosenAttr: 'dex' },
    }
    expect(computeFinalAttributes(draft).dex).toBe(16) // 14 + 1 racial + 1 talento
  })
})

const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }
const baseDraft = {
  ...INITIAL_DRAFT_V2,
  name: 'Heitor', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  savingThrows: ['str', 'con'],
}

describe('buildCharacter', () => {
  it('produz character com info.name preenchido', () => {
    const c = buildCharacter(baseDraft, guerreiro, {})
    expect(c.info.name).toBe('Heitor')
    expect(c.info.class).toBe('guerreiro')
    expect(c.info.level).toBe(1)
  })

  it('aplica bônus raciais ao attributes', () => {
    const draft = { ...baseDraft, racialBonuses: { str: 2, con: 1 } }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.attributes.str).toBe(17)
    expect(c.attributes.con).toBe(14)
  })

  it('aplica ASI por nível em attributes', () => {
    const draft = {
      ...baseDraft,
      asiChoices: { 4: { type: 'asi', bonuses: { str: 2 } } },
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.attributes.str).toBe(17)
  })

  it('coleta o talento racial do Humano Variante em info.feats (nível 1)', () => {
    const draft = {
      ...baseDraft,
      racialFeat: { featIndex: 'robusto', featName: 'Robusto', featAttrBonus: null, featChosenAttr: null },
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.info.feats).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 'robusto', name: 'Robusto', takenAtLevel: 1, source: 'race' }),
    ]))
  })

  it('talento racial Robusto soma PV (Humano Variante)', () => {
    // Robusto (PHB): +2 PV por nível. Guerreiro nv1 → +2.
    const draft = { ...baseDraft, level: 1 }
    const semRobusto = buildCharacter(draft, guerreiro, {}).combat.maxHp
    const comRobusto = buildCharacter(
      { ...draft, racialFeat: { featIndex: 'robusto', featName: 'Robusto' } },
      guerreiro, {},
    ).combat.maxHp
    expect(comRobusto).toBe(semRobusto + 2)
  })

  it('calcula maxHp via classData', () => {
    const c = buildCharacter(baseDraft, guerreiro, {})
    expect(c.combat.maxHp).toBeGreaterThan(0)
  })

  it('maxHp soma os dados de vida das multiclasses (PHB p.164)', () => {
    // Guerreiro 1 (d10) / Mago 2 (d6), CON 13 (+1).
    //  primária nv1: 10+1 = 11 | mago nv1 e nv2: avg d6 = 3+1+1 = 5 cada
    //  total = 11 + 5 + 5 = 21
    const draft = {
      ...baseDraft, level: 1,
      multiclasses: [{ class: 'mago', level: 2, hitDie: 6 }],
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.combat.maxHp).toBe(21)
    expect(c.combat.currentHp).toBe(21) // nasce com PV cheio
  })

  it('grava proficiências e perícia escolhida da multiclasse', () => {
    const draft = {
      ...baseDraft,
      multiclasses: [{
        class: 'ladino', level: 1, hitDie: 8,
        proficiencies: { armor: ['leve'], weapons: [], tools: ['ferramentas de ladrão'], skills: 1 },
        chosenSkills: ['stealth'],
      }],
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.proficiencies.armor).toContain('leve')
    expect(c.proficiencies.tools).toContain('ferramentas de ladrão')
    expect(c.proficiencies.skills).toContain('stealth')
  })

  it('gp soma backgroundGold + classStartingGold (modo gold)', () => {
    const draft = {
      ...baseDraft, backgroundGold: 15,
      classEquipmentChoice: 'gold', classStartingGold: 75,
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.inventory.currency.gp).toBe(90)
  })

  it('gp NÃO inclui classStartingGold no modo equipment', () => {
    const draft = {
      ...baseDraft, backgroundGold: 15,
      classEquipmentChoice: 'equipment', classStartingGold: 0,
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.inventory.currency.gp).toBe(15)
  })

  it('skills combina chosen + racial', () => {
    const draft = {
      ...baseDraft,
      chosenSkills: ['athletics', 'intimidation'],
      racialSkills: ['perception'],
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.proficiencies.skills).toEqual(expect.arrayContaining(['athletics', 'intimidation', 'perception']))
  })

  it('inventory.items inclui backgroundItems e itens da classe', () => {
    const draft = {
      ...baseDraft,
      backgroundItems: [{ name: 'Insígnia', qty: 1 }],
      classEquipmentChoice: 'equipment',
      classEquipmentChoices: { weapon: 'longsword' },
    }
    const classEquipment = {
      guerreiro: { choices: [
        { id: 'weapon', options: [{ value: 'longsword', items: [{ name: 'Espada longa', qty: 1 }] }] },
      ], fixed: [{ name: 'Mochila', qty: 1 }] },
    }
    const c = buildCharacter(draft, guerreiro, classEquipment)
    const names = c.inventory.items.map(i => i.name)
    expect(names).toContain('Insígnia')
    expect(names).toContain('Espada longa')
    expect(names).toContain('Mochila')
  })

  it('meta.creationMethod é wizard-v2', () => {
    const c = buildCharacter(baseDraft, guerreiro, {})
    expect(c.meta.creationMethod).toBe('wizard-v2')
  })
})

describe('totalCharacterLevel', () => {
  it('soma primária + multiclasses', () => {
    expect(totalCharacterLevel({ level: 3, multiclasses: [{ class: 'mago', level: 2 }] })).toBe(5)
  })
  it('default nível 1 sem multiclasse', () => {
    expect(totalCharacterLevel({})).toBe(1)
  })
})

describe('computeDraftMaxHp', () => {
  it('single-class = dado máximo no nv1 + média depois', () => {
    // Guerreiro 3 (d10), CON 13 (+1): nv1=11; média d10 = 7 → 11 + 7 + 7 = 25
    const draft = { ...baseDraft, level: 3 }
    expect(computeDraftMaxHp(draft, guerreiro)).toBe(25)
  })
  it('aplica +2/nível total com talento Robusto', () => {
    // Guerreiro 1 (d10) CON 13: base 11; Robusto +2*1 = 13
    const draft = {
      ...baseDraft, level: 1,
      asiChoices: { 1: { type: 'feat', featIndex: 'robusto' } },
    }
    expect(computeDraftMaxHp(draft, guerreiro)).toBe(13)
  })
  it('retorna 0 sem classData', () => {
    expect(computeDraftMaxHp(baseDraft, null)).toBe(0)
  })
})

describe('resolveClassEquipmentItems', () => {
  it('[] quando modo gold', () => {
    expect(resolveClassEquipmentItems({ classEquipmentChoice: 'gold' }, {})).toEqual([])
  })

  it('propaga chosenFeatures.martial_archetype_maneuvers (Mestre de Combate)', () => {
    const draft = {
      ...baseDraft, level: 3,
      chosenFeatures: {
        martial_archetype: 'mestre_combate',
        martial_archetype_maneuvers: ['estocada', 'resposta', 'precisao'],
      },
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.info.chosenFeatures.martial_archetype).toBe('mestre_combate')
    expect(c.info.chosenFeatures.martial_archetype_maneuvers).toEqual(
      ['estocada', 'resposta', 'precisao'],
    )
  })

  it('resolve choice + fixed', () => {
    const draft = {
      class: 'guerreiro', classEquipmentChoice: 'equipment',
      classEquipmentChoices: { weapon: 'longsword' }, classEquipmentPicks: {},
    }
    const classEquipment = {
      guerreiro: {
        choices: [{ id: 'weapon', options: [{ value: 'longsword', items: [{ name: 'Espada', qty: 1 }] }] }],
        fixed: [{ name: 'Mochila', qty: 1 }],
      },
    }
    const r = resolveClassEquipmentItems(draft, classEquipment)
    expect(r).toContainEqual({ name: 'Espada', qty: 1, source: 'class' })
    expect(r).toContainEqual({ name: 'Mochila', qty: 1, source: 'class' })
  })
})
