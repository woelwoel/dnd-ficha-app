import { describe, it, expect } from 'vitest'
import {
  MAGO_CANTRIPS, computeBonuses, getRaceRequirements,
} from '../components/CharacterWizardV2/blocks/race-helpers'

describe('MAGO_CANTRIPS', () => {
  it('lista 16 truques em português', () => {
    expect(MAGO_CANTRIPS).toHaveLength(16)
    expect(MAGO_CANTRIPS).toContain('Mãos Mágicas')
    expect(MAGO_CANTRIPS).toContain('Prestidigitação')
  })
})

describe('computeBonuses', () => {
  const race = { ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'CON', bonus: 1 }] }
  const subrace = { ability_bonuses: [{ ability: 'INT', bonus: 1 }] }

  it('soma bônus de raça e subraça', () => {
    expect(computeBonuses(race, subrace, [])).toEqual({ str: 2, con: 1, int: 1 })
  })

  it('ignora bônus com "escolha"', () => {
    const r = { ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: '2 à escolha', bonus: 1 }] }
    expect(computeBonuses(r, null, [])).toEqual({ str: 2 })
  })

  it('aplica freeChoices como +1 cada', () => {
    expect(computeBonuses(null, null, ['dex', 'wis'])).toEqual({ dex: 1, wis: 1 })
  })

  it('aceita race ou subrace null', () => {
    expect(computeBonuses(null, null, [])).toEqual({})
  })
})

describe('getRaceRequirements', () => {
  it('humano variante: 2 free abilities + 1 perícia', () => {
    const r = getRaceRequirements({ race: 'humano', subrace: 'tracos-raciais-alternativos' }, null, null)
    expect(r.freeAbility).toBe(2)
    expect(r.racialSkills).toBe(1)
    expect(r.freeAbilityExclude).toBeNull()
  })

  it('meio-elfo: 2 free abilities (exceto CHA) + 2 perícias', () => {
    const r = getRaceRequirements({ race: 'meio-elfo', subrace: '' }, null, null)
    expect(r.freeAbility).toBe(2)
    expect(r.racialSkills).toBe(2)
    expect(r.freeAbilityExclude).toBe('cha')
  })

  it('draconato: requer ancestral dracônico', () => {
    const r = getRaceRequirements({ race: 'draconato', subrace: '' }, null, null)
    expect(r.draconicAncestry).toBe(true)
  })

  it('alto-elfo: requer truque de mago', () => {
    const r = getRaceRequirements({ race: 'elfo', subrace: 'alto-elfo' }, null, null)
    expect(r.highElfCantrip).toBe(true)
  })

  it('raça simples (anão, halfling): zero requisitos extras', () => {
    const r = getRaceRequirements({ race: 'anao', subrace: '' }, null, null)
    expect(r.draconicAncestry).toBe(false)
    expect(r.highElfCantrip).toBe(false)
    expect(r.freeAbility).toBe(0)
    expect(r.racialSkills).toBe(0)
  })
})
