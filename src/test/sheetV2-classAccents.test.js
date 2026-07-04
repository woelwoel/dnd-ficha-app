import { describe, it, expect } from 'vitest'
import { classAccentOf, CLASS_ACCENTS } from '../systems/dnd5e/components/CharacterSheet/v2/classAccents'

describe('classAccentOf', () => {
  it('cobre as 13 classes com hex válido', () => {
    expect(Object.keys(CLASS_ACCENTS)).toHaveLength(13)
    for (const hex of Object.values(CLASS_ACCENTS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('usa os índices em português do JSON de classes', () => {
    // character.info.class guarda o índice pt (ver phb-classes-pt.json / tasha-classes-pt.json)
    for (const idx of [
      'artifice', 'barbaro', 'bardo', 'bruxo', 'clerigo', 'druida',
      'feiticeiro', 'guerreiro', 'ladino', 'mago', 'monge', 'paladino', 'patrulheiro',
    ]) {
      expect(CLASS_ACCENTS[idx]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('resolve classe conhecida e cai no fallback teal', () => {
    expect(classAccentOf('mago')).toBe(CLASS_ACCENTS.mago)
    expect(classAccentOf('classe-inexistente')).toBe('#4fc7ab')
    expect(classAccentOf(undefined)).toBe('#4fc7ab')
  })
})
