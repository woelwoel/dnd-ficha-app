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

describe('isSheetV2Enabled', () => {
  let storage
  beforeEach(() => { storage = makeStorage() })

  it('liga com ?sheetV2=1 e persiste no storage', () => {
    expect(isSheetV2Enabled('?sheetV2=1', storage)).toBe(true)
    expect(storage.getItem('sheetV2')).toBe('1')
  })

  it('desliga com ?sheetV2=0 e limpa o storage', () => {
    storage.setItem('sheetV2', '1')
    expect(isSheetV2Enabled('?sheetV2=0', storage)).toBe(false)
    expect(storage.getItem('sheetV2')).toBe(null)
  })

  it('sem query param, lê do storage', () => {
    storage.setItem('sheetV2', '1')
    expect(isSheetV2Enabled('', storage)).toBe(true)
  })

  it('sem query param e sem storage, desligado', () => {
    expect(isSheetV2Enabled('', storage)).toBe(false)
  })
})
