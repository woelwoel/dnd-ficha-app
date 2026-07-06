import { describe, it, expect, beforeEach } from 'vitest'
import { applyThemeV2 } from '../theme/applyTheme'

describe('applyThemeV2', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('theme-v2')
    document.head.querySelector('meta[name="theme-color"]')?.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#3b2a1a'
    document.head.appendChild(meta)
  })

  it('liga por padrão: classe no <html> e meta escura', () => {
    expect(applyThemeV2()).toBe(true)
    expect(document.documentElement.classList.contains('theme-v2')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#0f141a')
  })

  it('com opt-out persistido, não aplica a classe nem mexe no meta', () => {
    window.localStorage.setItem('themeParchment', '1')
    expect(applyThemeV2()).toBe(false)
    expect(document.documentElement.classList.contains('theme-v2')).toBe(false)
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#3b2a1a')
  })
})
