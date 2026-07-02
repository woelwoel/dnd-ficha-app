import { describe, it, expect } from 'vitest'
import {
  MAGO_CANTRIPS, computeBonuses, getRaceRequirements,
} from '../systems/dnd5e/components/CharacterWizardV2/blocks/race-helpers'
import racesData from '../../public/srd-data/phb-races-pt.json'
import { ATTR_NAME_TO_KEY, ABBR_TO_KEY } from '../systems/dnd5e/utils/calculations'

describe('MAGO_CANTRIPS', () => {
  it('lista 16 truques em português', () => {
    expect(MAGO_CANTRIPS).toHaveLength(16)
    expect(MAGO_CANTRIPS).toContain('Mãos Mágicas')
    expect(MAGO_CANTRIPS).toContain('Prestidigitação')
  })
})

describe('computeBonuses', () => {
  // Dado real usa NOMES COMPLETOS ("Força"), não abreviações.
  const race = { ability_bonuses: [{ ability: 'Força', bonus: 2 }, { ability: 'Constituição', bonus: 1 }] }
  const subrace = { ability_bonuses: [{ ability: 'Inteligência', bonus: 1 }] }

  it('soma bônus de raça e subraça (nomes completos)', () => {
    expect(computeBonuses(race, subrace, [])).toEqual({ str: 2, con: 1, int: 1 })
  })

  it('aceita abreviações por robustez (fallback)', () => {
    const r = { ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'DES', bonus: 1 }] }
    expect(computeBonuses(r, null, [])).toEqual({ str: 2, dex: 1 })
  })

  it('ignora bônus com "escolha"', () => {
    const r = { ability_bonuses: [{ ability: 'Força', bonus: 2 }, { ability: '2 à escolha', bonus: 1 }] }
    expect(computeBonuses(r, null, [])).toEqual({ str: 2 })
  })

  it('aplica freeChoices como +1 cada', () => {
    expect(computeBonuses(null, null, ['dex', 'wis'])).toEqual({ dex: 1, wis: 1 })
  })

  it('humano variante NÃO leva o +1-em-tudo da raça base — só as escolhas livres', () => {
    const humano = { ability_bonuses: [
      { ability: 'Força', bonus: 1 }, { ability: 'Destreza', bonus: 1 },
      { ability: 'Constituição', bonus: 1 }, { ability: 'Inteligência', bonus: 1 },
      { ability: 'Sabedoria', bonus: 1 }, { ability: 'Carisma', bonus: 1 },
    ] }
    const variante = { index: 'tracos-raciais-alternativos', ability_bonuses: [{ ability: '2 à escolha', bonus: 1 }] }
    expect(computeBonuses(humano, variante, ['str', 'con'])).toEqual({ str: 1, con: 1 })
  })

  it('aceita race ou subrace null', () => {
    expect(computeBonuses(null, null, [])).toEqual({})
  })

  // Casos reais — pegaria o bug do meio-orc (bônus descartados por mismatch de nome).
  it('meio-orc soma Força +2 e Constituição +1 a partir do dado real', () => {
    const races = Array.isArray(racesData) ? racesData : (racesData.races ?? Object.values(racesData))
    const meioOrc = races.find(r => (r.index ?? r.name)?.toLowerCase().includes('orc'))
    expect(meioOrc).toBeTruthy()
    expect(computeBonuses(meioOrc, null, [])).toEqual({ str: 2, con: 1 })
  })
})

describe('integridade dos bônus raciais (dado real)', () => {
  it('toda entrada de ability_bonuses mapeia para um atributo válido', () => {
    const races = Array.isArray(racesData) ? racesData : (racesData.races ?? Object.values(racesData))
    const resolve = a => ATTR_NAME_TO_KEY[a] ?? ABBR_TO_KEY[a]
    const bad = []
    for (const race of races) {
      const entries = [
        ...(race.ability_bonuses ?? []).map(b => ({ who: race.index ?? race.name, b })),
        ...(race.subraces ?? []).flatMap(sr =>
          (sr.ability_bonuses ?? []).map(b => ({ who: `${race.index}/${sr.index ?? sr.name}`, b }))),
      ]
      for (const { who, b } of entries) {
        if (b.ability.includes('escolha')) continue
        if (!resolve(b.ability)) bad.push(`${who}: "${b.ability}" não mapeia`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('getRaceRequirements', () => {
  it('humano variante: 2 free abilities + 1 perícia + 1 talento', () => {
    const r = getRaceRequirements({ race: 'humano', subrace: 'tracos-raciais-alternativos' }, null, null)
    expect(r.freeAbility).toBe(2)
    expect(r.racialSkills).toBe(1)
    expect(r.racialFeat).toBe(true)
    expect(r.freeAbilityExclude).toBeNull()
  })

  it('humano base (sem subraça): NÃO exige talento', () => {
    const r = getRaceRequirements({ race: 'humano', subrace: '' }, null, null)
    expect(r.racialFeat).toBe(false)
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
