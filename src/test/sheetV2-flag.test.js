import { describe, it, expect, beforeEach } from 'vitest'
import { isSheetV2Enabled } from '../systems/dnd5e/components/CharacterSheet/v2/flag'

function makeStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  }
}

describe('isSheetV2Enabled (soft cut: v2 é o padrão)', () => {
  let storage
  beforeEach(() => { storage = makeStorage() })

  it('sem query param e sem storage, LIGADO por padrão (soft cut)', () => {
    expect(isSheetV2Enabled('', storage)).toBe(true)
  })

  it('?sheetV2=0 persiste o opt-out', () => {
    expect(isSheetV2Enabled('?sheetV2=0', storage)).toBe(false)
    expect(isSheetV2Enabled('', storage)).toBe(false) // opt-out lembrado
  })

  it('?sheetV2=1 liga e limpa o opt-out', () => {
    storage.setItem('sheetV2Off', '1')
    expect(isSheetV2Enabled('?sheetV2=1', storage)).toBe(true)
    expect(isSheetV2Enabled('', storage)).toBe(true) // opt-out foi limpo
  })
})
