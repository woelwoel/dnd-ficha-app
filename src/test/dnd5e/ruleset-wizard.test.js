import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { INITIAL_DRAFT_V2, useDraft } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

/** Draft mínimo que `buildCharacter` aceita. */
function draft(overrides = {}) {
  return {
    ...INITIAL_DRAFT_V2,
    name: 'Teste', class: 'mago', level: 1, race: 'humano',
    baseAttributes: { str: 8, dex: 14, con: 12, int: 15, wis: 10, cha: 13 },
    ...overrides,
  }
}

const classData = { hit_die: 6, index: 'mago', name: 'Mago' }

describe('ruleset no draft do wizard', () => {
  it('o draft inicial nasce em 2014', () => {
    expect(INITIAL_DRAFT_V2.ruleset).toBe('2014')
  })

  it('ruleset fica FORA de settings — settings é o que se liga e desliga', () => {
    expect(INITIAL_DRAFT_V2.settings.ruleset).toBeUndefined()
  })
})

describe('buildCharacter carimba o ruleset', () => {
  it('grava 2024 quando o draft escolheu 2024', () => {
    const char = buildCharacter(draft({ ruleset: '2024' }), classData, [])
    expect(char.meta.ruleset).toBe('2024')
  })

  it('grava 2014 por padrão', () => {
    expect(buildCharacter(draft(), classData, []).meta.ruleset).toBe('2014')
  })

  it('SOBREVIVE à escada de migração — build grava schemaVersion 2', () => {
    // Regressão do risco real: build-character grava schemaVersion 2 hard-coded,
    // então a ficha 2024 sobe v2→v3→v4→v5 no primeiro parse. Se migrateV4ToV5
    // sobrescrevesse, a escolha do jogador sumiria aqui.
    const char = buildCharacter(draft({ ruleset: '2024' }), classData, [])
    expect(char.meta.schemaVersion).toBeLessThan(5)
    expect(parseCharacter(char).meta.ruleset).toBe('2024')
  })
})

describe('useDraft carrega o ruleset escolhido no setup', () => {
  // Este é o elo que liga o CampaignSetupModal ao documento final. Sem ele o
  // seletor funciona, o payload sai certo, e mesmo assim a ficha nasce 2014.
  const settings = { ...INITIAL_DRAFT_V2.settings }

  it('aplica initialRuleset 2024 no draft', () => {
    const { result } = renderHook(() => useDraft({ initialSettings: settings, initialRuleset: '2024' }))
    expect(result.current.draft.ruleset).toBe('2024')
  })

  it('sem initialRuleset, o draft fica em 2014', () => {
    const { result } = renderHook(() => useDraft({ initialSettings: settings }))
    expect(result.current.draft.ruleset).toBe('2014')
  })

  it('ignora valor inválido em vez de gravá-lo', () => {
    const { result } = renderHook(() => useDraft({ initialSettings: settings, initialRuleset: '2077' }))
    expect(result.current.draft.ruleset).toBe('2014')
  })

  it('o ruleset do draft não vaza para settings', () => {
    const { result } = renderHook(() => useDraft({ initialSettings: settings, initialRuleset: '2024' }))
    expect(result.current.draft.settings.ruleset).toBeUndefined()
  })
})
