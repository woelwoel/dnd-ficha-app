import { describe, it, expect, vi } from 'vitest'
import { getLazyEncounter } from '../systems/ui-registry'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('registro de UI do sistema', () => {
  it('expõe a tela de combate do dnd5e', () => {
    expect(getLazyEncounter('dnd5e')).toBeTruthy()
  })

  it('sistema desconhecido não tem tela de combate', () => {
    expect(getLazyEncounter('daggerheart')).toBeNull()
  })

  it('memoiza o lazy (referência estável entre chamadas)', () => {
    expect(getLazyEncounter('dnd5e')).toBe(getLazyEncounter('dnd5e'))
  })
})
