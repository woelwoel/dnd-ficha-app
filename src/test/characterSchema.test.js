import { describe, it, expect } from 'vitest'
import { migrateCharacter, safeParseCharacter, SCHEMA_VERSION } from '../systems/dnd5e/domain/characterSchema'

function v1Character(overrides = {}) {
  return {
    id: 'test-id',
    meta: { schemaVersion: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', version: '1.0' },
    info: { name: 'Legado', playerName: '', race: '', class: 'guerreiro', level: 3, multiclasses: [], background: '', alignment: '', xp: 0 },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: { maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 10, speed: 30, hitDice: '3d10', deathSaves: { successes: 0, failures: 0 } },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    ...overrides,
  }
}

describe('migração v1 → v2', () => {
  it('converte hitDice string em pool por tipo de dado', () => {
    const migrated = migrateCharacter(v1Character())
    expect(migrated.combat.hitDice).toEqual({ pool: { d10: { total: 3, used: 0 } } })
    expect(migrated.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('mantém campo em v2 se já estiver no formato novo (idempotente)', () => {
    const v2 = v1Character({
      meta: { schemaVersion: 2, createdAt: '', updatedAt: '', version: '1.0' },
      combat: { maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 10, speed: 30, hitDice: { pool: { d8: { total: 1, used: 0 } } }, deathSaves: { successes: 0, failures: 0 } },
    })
    const migrated = migrateCharacter(v2)
    expect(migrated.combat.hitDice.pool.d8).toEqual({ total: 1, used: 0 })
  })

  it('default seguro quando hitDice é inválido', () => {
    const broken = v1Character({ combat: { maxHp: 10, currentHp: 10, tempHp: 0, armorClass: 10, speed: 30, hitDice: null, deathSaves: { successes: 0, failures: 0 } } })
    const migrated = migrateCharacter(broken)
    expect(migrated.combat.hitDice.pool.d8).toBeDefined()
  })
})

describe('migração v3 → v4 (bônus racial)', () => {
  function v3(race, subrace, attributes, appliedRacialBonuses) {
    return v1Character({
      meta: { schemaVersion: 3, createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'n', playerName: '', race, subrace, class: 'guerreiro', level: 3, multiclasses: [], background: '', alignment: '', xp: 0 },
      attributes,
      appliedRacialBonuses,
      combat: { maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 10, speed: 30, hitDice: { pool: { d10: { total: 3, used: 0 } } }, deathSaves: { successes: 0, failures: 0 } },
    })
  }

  it('meio-orc com bônus perdido ganha +2 Força e +1 Constituição', () => {
    const m = migrateCharacter(v3('meio-orc', '', { str: 15, dex: 12, con: 13, int: 10, wis: 10, cha: 8 }, {}))
    expect(m.attributes.str).toBe(17)
    expect(m.attributes.con).toBe(14)
    expect(m.attributes.dex).toBe(12) // inalterado
    expect(m.appliedRacialBonuses).toEqual({ str: 2, con: 1 })
    expect(m.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('idempotente: ficha já correta não soma de novo', () => {
    const m = migrateCharacter(v3('meio-orc', '', { str: 17, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, { str: 2, con: 1 }))
    expect(m.attributes.str).toBe(17)
    expect(m.attributes.con).toBe(14)
    expect(m.appliedRacialBonuses).toEqual({ str: 2, con: 1 })
  })

  it('humano variante NÃO ganha +1 em tudo (escolhas livres intocadas)', () => {
    const c = v3('humano', 'tracos-raciais-alternativos', { str: 16, dex: 14, con: 13, int: 10, wis: 10, cha: 8 }, { str: 1, dex: 1 })
    const m = migrateCharacter(c)
    expect(m.attributes).toEqual(c.attributes)
    expect(m.appliedRacialBonuses).toEqual({ str: 1, dex: 1 })
  })

  it('raça vazia/desconhecida não quebra', () => {
    const m = migrateCharacter(v3('', '', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, {}))
    expect(m.attributes.str).toBe(10)
    expect(m.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })
})

describe('refine: nível total ≤ 20', () => {
  it('aceita soma exatamente 20', () => {
    const c = v1Character({ info: { name: 'n', playerName: '', race: '', class: 'guerreiro', level: 15, multiclasses: [{ class: 'mago', level: 5 }], background: '', alignment: '', xp: 0 } })
    const r = safeParseCharacter(c)
    expect(r.success).toBe(true)
  })
  it('rejeita soma > 20', () => {
    const c = v1Character({ info: { name: 'n', playerName: '', race: '', class: 'guerreiro', level: 20, multiclasses: [{ class: 'mago', level: 1 }], background: '', alignment: '', xp: 0 } })
    const r = safeParseCharacter(c)
    expect(r.success).toBe(false)
  })
})

describe('defaults de concentração e attacks', () => {
  it('parse adiciona defaults para concentrating e attacks', () => {
    const c = v1Character()
    const r = safeParseCharacter(c)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.combat.concentrating).toEqual({ spellIndex: null, spellName: null })
      expect(Array.isArray(r.data.combat.attacks)).toBe(true)
    }
  })
})

describe('migração v4 → v5 (eixo ruleset)', () => {
  it('carimba 2014 em ficha legada sem o campo', () => {
    const doc = {
      meta: { schemaVersion: 4, createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'Legada', race: 'humano', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    const m = migrateCharacter(doc)
    expect(m.meta.ruleset).toBe('2014')
    expect(m.meta.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('PRESERVA um ruleset já escolhido ao subir a escada de migração', () => {
    // build-character.js grava schemaVersion: 2 hard-coded, então TODA ficha
    // criada pelo wizard sobe a escada inteira no primeiro parse. Se a
    // migração sobrescrevesse, apagaria a escolha do jogador.
    const doc = {
      meta: { schemaVersion: 2, ruleset: '2024', createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'Nova', race: '', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10, hitDice: '1d6' },
    }
    expect(migrateCharacter(doc).meta.ruleset).toBe('2024')
  })

  it('é idempotente: migrar duas vezes não muda nada', () => {
    const doc = {
      meta: { schemaVersion: 4, createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'X', race: 'humano', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    const once = migrateCharacter(doc)
    expect(migrateCharacter(once)).toEqual(once)
  })

  it('schema rejeita ruleset fora do enum', () => {
    const bad = {
      meta: { schemaVersion: 5, ruleset: '2077', createdAt: '', updatedAt: '', version: '1.0' },
      info: { name: 'X', race: '', subrace: '', class: 'mago', level: 1 },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 6, currentHp: 6, armorClass: 10 },
    }
    expect(safeParseCharacter(bad).success).toBe(false)
  })
})
