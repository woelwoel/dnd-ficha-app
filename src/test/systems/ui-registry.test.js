import { describe, it, expect } from 'vitest'
import { getLazyWizard, getLazySheet } from '../../systems/ui-registry'

describe('ui-registry', () => {
  it('devolve componente lazy pro dnd5e', () => {
    expect(getLazyWizard('dnd5e')).toBeTruthy()
    expect(getLazySheet('dnd5e')).toBeTruthy()
  })
  it('memoiza (mesma referência entre chamadas)', () => {
    expect(getLazyWizard('dnd5e')).toBe(getLazyWizard('dnd5e'))
  })
  it('devolve null pra sistema sem UI', () => {
    expect(getLazyWizard('xpto')).toBeNull()
  })
})
