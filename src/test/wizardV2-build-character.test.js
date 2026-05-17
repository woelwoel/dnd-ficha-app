import { describe, it, expect } from 'vitest'
import { buildCharacter, resolveClassEquipmentItems } from '../components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

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

  it('calcula maxHp via classData', () => {
    const c = buildCharacter(baseDraft, guerreiro, {})
    expect(c.combat.maxHp).toBeGreaterThan(0)
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

describe('resolveClassEquipmentItems', () => {
  it('[] quando modo gold', () => {
    expect(resolveClassEquipmentItems({ classEquipmentChoice: 'gold' }, {})).toEqual([])
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
