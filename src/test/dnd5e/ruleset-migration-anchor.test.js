/**
 * Âncora: subir para v5 pode acrescentar `meta.ruleset` e mexer em
 * `meta.schemaVersion` — e NADA mais. O teste não escreve o resultado
 * esperado à mão; compara o documento migrado contra ele mesmo com esses
 * dois campos neutralizados.
 */
import { describe, it, expect } from 'vitest'
import { migrateCharacter, parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

/** Ficha v4 completa e realista — multiclasse, magias, itens, condições. */
function fichaV4() {
  return {
    id: 'anchor-1',
    meta: {
      schemaVersion: 4,
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-02-03T04:05:06.000Z',
      version: '1.0',
      creationMethod: 'wizard-v2',
      settings: {
        abilityScoreMethod: 'standard-array',
        allowFeats: true,
        allowMulticlass: true,
        sources: ['phb', 'tasha'],
        flexibleRacialAsi: false,
      },
    },
    info: {
      name: 'Vestrit', playerName: 'Gabriel',
      race: 'anao', subrace: 'anao-da-montanha',
      class: 'guerreiro', subclass: 'campeao', level: 6,
      multiclasses: [{ class: 'mago', level: 2 }],
      chosenFeatures: { 'guerreiro-estilo-de-combate': 'defesa' },
      background: 'soldado', alignment: 'leal-neutro', xp: 14000,
      scoreMethod: 'standard-array',
      feats: [{ index: 'alerta', name: 'Alerta', takenAtLevel: 4 }],
      asiOrFeatByLevel: { 'guerreiro:4': 'feat' },
    },
    attributes: { str: 18, dex: 12, con: 16, int: 14, wis: 10, cha: 8 },
    appliedRacialBonuses: { str: 2, con: 2 },
    combat: {
      maxHp: 52, currentHp: 41, tempHp: 5, armorClass: 18, speed: 7.5,
      hitDice: { pool: { d10: { total: 6, used: 2 }, d6: { total: 2, used: 0 } } },
      deathSaves: { successes: 0, failures: 0 },
      isDead: false, isStable: false,
      exhaustion: 2, inspiration: true,
      conditions: ['prone'],
      attacks: [], concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [
        { id: 'fighter-action-surge', name: 'Surto de Ação', max: 1, used: 1, recharge: 'short', source: 'guerreiro' },
      ],
    },
    spellcasting: { abilitiesByClass: { mago: 'int' } },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 120, pp: 0 }, items: [] },
    proficiencies: {
      savingThrows: ['str', 'con'],
      skills: ['atletismo', 'intimidacao'],
      expertiseSkills: [],
      backgroundSkills: [],
      armor: ['leve', 'media', 'pesada', 'escudos'],
      weapons: ['simples', 'marciais'],
      tools: [],
      languages: ['comum', 'anao'],
    },
  }
}

/** Remove os campos que a migração v4→v5 TEM licença para tocar. */
function semCamposDaMigracao(doc) {
  const { schemaVersion, ruleset, ...restoMeta } = doc.meta ?? {}
  return { ...doc, meta: restoMeta }
}

describe('âncora da migração v4 → v5', () => {
  it('o único delta é meta.schemaVersion e meta.ruleset', () => {
    const antes = fichaV4()
    const depois = migrateCharacter(fichaV4())
    expect(semCamposDaMigracao(depois)).toEqual(semCamposDaMigracao(antes))
    expect(depois.meta.ruleset).toBe('2014')
  })

  it('a ficha migrada passa por parseCharacter sem perder campo', () => {
    const parsed = parseCharacter(fichaV4())
    expect(parsed.meta.ruleset).toBe('2014')
    expect(parsed.info.name).toBe('Vestrit')
    expect(parsed.combat.exhaustion).toBe(2)
    expect(parsed.combat.hitDice.pool.d10.total).toBe(6)
    expect(parsed.meta.settings.sources).toEqual(['phb', 'tasha'])
  })

  it('não dispara autosave à toa: migrar já-migrada devolve valor igual', () => {
    const once = migrateCharacter(fichaV4())
    expect(migrateCharacter(once)).toEqual(once)
  })
})
