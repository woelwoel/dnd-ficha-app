import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { getClassIconKey, ClassIcon, CLASS_KEYS } from '../utils/class-icons'

describe('getClassIconKey', () => {
  it('mapeia nomes em PT (case-insensitive) para chaves canônicas', () => {
    expect(getClassIconKey('Guerreiro')).toBe('guerreiro')
    expect(getClassIconKey('mago')).toBe('mago')
    expect(getClassIconKey('CLÉRIGO')).toBe('clerigo')
    expect(getClassIconKey('Patrulheiro')).toBe('patrulheiro')
  })

  it('mapeia substrings (multiclass strings tipo "Guerreiro 3 / Mago 2")', () => {
    expect(getClassIconKey('Guerreiro 3 / Mago 2')).toBe('guerreiro')
    expect(getClassIconKey('Mago 5 / Clérigo 1')).toBe('mago')
  })

  it('volta fallback para classes desconhecidas ou vazias', () => {
    expect(getClassIconKey('')).toBe('fallback')
    expect(getClassIconKey(null)).toBe('fallback')
    expect(getClassIconKey('Necromante')).toBe('fallback')
  })

  it('exporta lista CLASS_KEYS com 12 classes + fallback', () => {
    expect(CLASS_KEYS).toHaveLength(13)
    expect(CLASS_KEYS).toContain('guerreiro')
    expect(CLASS_KEYS).toContain('fallback')
  })
})

describe('<ClassIcon>', () => {
  it('renderiza um SVG com viewBox 0 0 32 32', () => {
    const { container } = render(<ClassIcon classKey="guerreiro" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('viewBox')).toBe('0 0 32 32')
  })

  it('aceita size e color via props', () => {
    const { container } = render(<ClassIcon classKey="mago" size={48} color="#ff0000" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
    expect(svg.getAttribute('color')).toBe('#ff0000')
  })

  it('renderiza um fallback quando classKey é desconhecido', () => {
    const { container } = render(<ClassIcon classKey="aaaa-inexistente" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('aceita o nome cru de classe e converte internamente', () => {
    const { container } = render(<ClassIcon classKey="Guerreiro" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
