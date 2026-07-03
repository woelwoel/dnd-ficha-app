/** Fixtures de personagem para E2E (schema v4 válido, mínimo jogável). */
export function makeCharacter(id, name, extra = {}) {
  return {
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', version: '1.0', schemaVersion: 4 },
    info: { name, race: 'humano', class: 'guerreiro', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'soldado' },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    appliedRacialBonuses: {},
    combat: {
      maxHp: 28, currentHp: 28, tempHp: 0, armorClass: 16, speed: 9,
      hitDice: { pool: { d10: { total: 3, used: 0 } } }, attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      conditions: [], inspiration: false, exhaustion: 0,
    },
    proficiencies: { savingThrows: ['str', 'con'], skills: ['atletismo'], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [], pactSlotsUsed: 0 },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
    ...extra,
  }
}
