import { describe, it, expect, vi } from 'vitest'
import { getLazyEncounterLibrary } from '../systems/ui-registry'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('registro de UI — biblioteca de encontros', () => {
  it('expõe a tela do dnd5e', () => {
    expect(getLazyEncounterLibrary('dnd5e')).toBeTruthy()
  })

  it('sistema desconhecido não tem a tela', () => {
    expect(getLazyEncounterLibrary('daggerheart')).toBeNull()
  })

  it('memoiza o lazy', () => {
    expect(getLazyEncounterLibrary('dnd5e')).toBe(getLazyEncounterLibrary('dnd5e'))
  })
})
