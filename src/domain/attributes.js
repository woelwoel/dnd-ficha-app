/**
 * Fonte única para mapeamentos de atributos PT-BR.
 * Substitui ABBR_TO_KEY, ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY,
 * SPELL_ABILITY_TO_KEY, ATTR_LABELS e KEY_TO_ABBR espalhados pelo código.
 */

export const ABILITIES = [
  { key: 'str', name: 'Força',        abbrPt: 'FOR', abbrEn: 'STR' },
  { key: 'dex', name: 'Destreza',     abbrPt: 'DES', abbrEn: 'DEX' },
  { key: 'con', name: 'Constituição', abbrPt: 'CON', abbrEn: 'CON' },
  { key: 'int', name: 'Inteligência', abbrPt: 'INT', abbrEn: 'INT' },
  { key: 'wis', name: 'Sabedoria',    abbrPt: 'SAB', abbrEn: 'WIS' },
  { key: 'cha', name: 'Carisma',      abbrPt: 'CAR', abbrEn: 'CHA' },
]

export const ABILITY_KEYS = ABILITIES.map(a => a.key)

const BY_KEY  = Object.fromEntries(ABILITIES.map(a => [a.key, a]))
const BY_ABBR = Object.fromEntries(
  ABILITIES.flatMap(a => [[a.abbrPt, a], [a.abbrEn, a]])
)
const BY_NAME = Object.fromEntries(ABILITIES.map(a => [a.name, a]))

export const keyFromAbbr = abbr => BY_ABBR[abbr]?.key ?? null
export const keyFromName = name => BY_NAME[name]?.key ?? null
export const abbrOfKey   = key  => BY_KEY[key]?.abbrPt ?? null
export const nameOfKey   = key  => BY_KEY[key]?.name   ?? null
