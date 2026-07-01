import { describe, it, expect } from 'vitest'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'
import { parseCharacterDispatch, migrateCharacterDispatch } from '../../utils/characterCodec'

const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }

// Réplica de validateForSave (storage.js, não exportado).
function validate(character) {
  const migrated = migrateCharacterDispatch(character)
  const stamped = { ...migrated, meta: { ...(migrated?.meta ?? {}), version: '1.0' } }
  return parseCharacterDispatch(stamped)
}

describe('deslocamento fracionário (metros) valida', () => {
  it('anão (25 pés = 7,5 m) → combat.speed 7.5 e ficha válida', () => {
    // O RaceBlock do anão grava draft.speed = 7.5 (25 pés em metros).
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Durin', class: 'guerreiro', level: 1, race: 'anao',
      baseAttributes: { str: 15, dex: 12, con: 15, int: 10, wis: 12, cha: 8 },
      savingThrows: ['str', 'con'],
      speed: 7.5,
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.combat.speed).toBe(7.5)
    const r = validate(c)
    if (!r.success) console.log('ERROS:', JSON.stringify(r.error.issues, null, 2))
    expect(r.success).toBe(true)
  })

  it('deslocamento de 10,5 m (35 pés) também valida', () => {
    const draft = {
      ...INITIAL_DRAFT_V2,
      name: 'Ágil', class: 'guerreiro', level: 1, race: 'humano',
      baseAttributes: { str: 12, dex: 15, con: 13, int: 10, wis: 10, cha: 10 },
      savingThrows: ['str', 'con'],
      speed: 10.5,
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.combat.speed).toBe(10.5)
    expect(validate(c).success).toBe(true)
  })
})
