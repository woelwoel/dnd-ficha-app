import { describe, it, expect } from 'vitest'
import {
  totalAttributes, meetsPrereqs, formatPrereqs, totalLevels, takenClassIndices,
} from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/multiclass-helpers'
import { INITIAL_DRAFT_V2 } from '../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

describe('totalAttributes', () => {
  it('soma base + racial', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      racialBonuses: { str: 2, con: 1 },
    }
    const t = totalAttributes(draft)
    expect(t.str).toBe(17)
    expect(t.con).toBe(14)
    expect(t.dex).toBe(14)
  })

  it('atributo zero permanece zero', () => {
    const draft = { ...INITIAL_DRAFT_V2, baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }
    const t = totalAttributes(draft)
    expect(t.str).toBe(0)
  })
})

describe('meetsPrereqs', () => {
  it('true sem prereqs', () => expect(meetsPrereqs(null, {})).toBe(true))
  it('true quando prereq atendido', () => {
    expect(meetsPrereqs({ str: 13 }, { str: 15 })).toBe(true)
  })
  it('false quando prereq não atendido', () => {
    expect(meetsPrereqs({ str: 13 }, { str: 12 })).toBe(false)
  })
  it('AND: ambos devem ser atendidos', () => {
    expect(meetsPrereqs({ dex: 13, wis: 13 }, { dex: 14, wis: 14 })).toBe(true)
    expect(meetsPrereqs({ dex: 13, wis: 13 }, { dex: 14, wis: 10 })).toBe(false)
  })
  it('OR: qualquer um basta', () => {
    expect(meetsPrereqs({ str: 13, or: 'dex' }, { str: 12, dex: 15 })).toBe(true)
    expect(meetsPrereqs({ str: 13, or: 'dex' }, { str: 15, dex: 10 })).toBe(true)
    expect(meetsPrereqs({ str: 13, or: 'dex' }, { str: 10, dex: 10 })).toBe(false)
  })
})

describe('formatPrereqs', () => {
  it('formata single', () => expect(formatPrereqs({ str: 13 })).toBe('FOR 13'))
  it('formata AND', () => expect(formatPrereqs({ dex: 13, wis: 13 })).toBe('DES 13, SAB 13'))
  it('formata OR', () => expect(formatPrereqs({ str: 13, or: 'dex' })).toBe('FOR ou DES ≥ 13'))
})

describe('totalLevels', () => {
  it('soma primária + multiclasses', () => {
    const draft = { ...INITIAL_DRAFT_V2, level: 3, multiclasses: [{ class: 'mago', level: 2 }] }
    expect(totalLevels(draft)).toBe(5)
  })
})

describe('takenClassIndices', () => {
  it('inclui primária + multiclasses', () => {
    const draft = { ...INITIAL_DRAFT_V2, class: 'guerreiro', multiclasses: [{ class: 'mago', level: 1 }] }
    const set = takenClassIndices(draft)
    expect(set.has('guerreiro')).toBe(true)
    expect(set.has('mago')).toBe(true)
  })
})
