import { describe, it, expect, beforeEach } from 'vitest'
import { isThemeV2Enabled } from '../theme/flag'

function makeStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  }
}

describe('isThemeV2Enabled (tema global v2 é o padrão)', () => {
  let storage
  beforeEach(() => { storage = makeStorage() })

  it('sem query param e sem storage, LIGADO por padrão', () => {
    expect(isThemeV2Enabled('', storage)).toBe(true)
  })

  it('?theme=parchment persiste o opt-out', () => {
    expect(isThemeV2Enabled('?theme=parchment', storage)).toBe(false)
    expect(isThemeV2Enabled('', storage)).toBe(false) // opt-out lembrado
  })

  it('?theme=v2 liga e limpa o opt-out', () => {
    storage.setItem('themeParchment', '1')
    expect(isThemeV2Enabled('?theme=v2', storage)).toBe(true)
    expect(isThemeV2Enabled('', storage)).toBe(true) // opt-out foi limpo
  })
})
