import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../../hooks/useTheme'

const KEY = 'dnd-ficha:theme'

function mockMatchMedia(prefersDark) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: prefersDark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.head.querySelector('meta[name="theme-color"]')?.remove()
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = '#3b2a1a'
  document.head.appendChild(meta)
})

describe('useTheme', () => {
  it('modo auto segue o SO (claro)', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('modo auto segue o SO (escuro)', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggle alterna, persiste e atualiza a meta theme-color', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.head.querySelector('meta[name="theme-color"]').content).toBe('#201812')

    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem(KEY)).toBe('light')
    expect(document.head.querySelector('meta[name="theme-color"]').content).toBe('#3b2a1a')
  })

  it('preferência salva vence o SO', () => {
    mockMatchMedia(true) // SO pede escuro…
    localStorage.setItem(KEY, 'light') // …mas o usuário fixou claro
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })
})
