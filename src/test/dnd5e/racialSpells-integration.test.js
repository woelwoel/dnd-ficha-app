import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildCharacterWithSubclassSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const SRD = JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8'))
const guerreiro = { index: 'guerreiro', hit_die: 10 }

describe('build do wizard injeta magia racial', () => {
  it('guerreiro drow nv5 nasce com as três magias do traço', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Zaknafein', class: 'guerreiro', level: 5,
      race: 'elfo', subrace: 'elfo-negro-drow',
      baseAttributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
      savingThrows: ['str', 'con'],
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, SRD)
    const raciais = c.spellcasting.spells.filter(s => s.source === 'race')
    expect(raciais.map(s => s.index)).toEqual(['globos-de-luz', 'fogo-das-fadas', 'escuridao'])
    expect(raciais.every(s => s.ability === 'cha')).toBe(true)
    expect(raciais.every(s => s.sourceLabel === 'Magia Drow')).toBe(true)
  })

  it('humano não ganha nada', () => {
    const draft = {
      ...INITIAL_DRAFT_V2, name: 'Bob', class: 'guerreiro', level: 5, race: 'humano',
      baseAttributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 8 },
      savingThrows: ['str', 'con'],
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, SRD)
    expect(c.spellcasting.spells.filter(s => s.source === 'race')).toEqual([])
  })
})
