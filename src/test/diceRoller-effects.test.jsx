import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DiceRollerProvider } from '../context/DiceRollerContext'
import { useDiceRoller } from '../hooks/useDiceRoller'

const wrapper = ({ children }) => <DiceRollerProvider>{children}</DiceRollerProvider>

function makeResolver(overrides = {}) {
  return vi.fn(() => ({ extraDice: ['1d4'], advantage: null, labelSuffix: ' · Bênção +1d4', onApplied: vi.fn(), ...overrides }))
}

describe('roll() com resolver de efeitos', () => {
  it('sem category: resolver NAO e consultado', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const resolver = makeResolver()
    act(() => result.current.setRollEffectsResolver(resolver))
    act(() => { result.current.roll('1d20+5', 'X') })
    expect(resolver).not.toHaveBeenCalled()
  })

  it('com category: estende notacao, sufixa label e chama onApplied', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const onApplied = vi.fn()
    const resolver = makeResolver({ onApplied })
    act(() => result.current.setRollEffectsResolver(resolver))
    let entry
    act(() => { entry = result.current.roll('1d20+5', 'Salvaguarda — SAB', { category: 'save', ability: 'wis' }) })
    expect(resolver).toHaveBeenCalledWith('save', 'wis')
    expect(entry.notation).toBe('1d20+5+1d4')
    expect(entry.groups).toHaveLength(2)
    expect(entry.label).toBe('Salvaguarda — SAB · Bênção +1d4')
    expect(onApplied).toHaveBeenCalledTimes(1)
  })

  it('resolver retorna null → rolagem normal', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => null))
    let entry
    act(() => { entry = result.current.roll('1d20+5', 'X', { category: 'attack' }) })
    expect(entry.notation).toBe('1d20+5')
  })

  it('matriz de vantagem: efeito adv sem gesto → adv; efeito adv + Alt(dis) → normal', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ extraDice: [], advantage: 'adv', labelSuffix: '', onApplied: () => {} })))
    let a, b
    act(() => { a = result.current.roll('1d20+5', 'X', { category: 'save' }) })
    expect(a.mode).toBe('adv')
    act(() => { b = result.current.roll('1d20+5', 'X', { category: 'save', mode: 'dis' }) })
    expect(b.mode).toBe('normal')
  })

  it('gesto adv + efeito adv → adv (nao empilha)', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ extraDice: [], advantage: 'adv', labelSuffix: '', onApplied: () => {} })))
    let e
    act(() => { e = result.current.roll('1d20+5', 'X', { category: 'save', mode: 'adv' }) })
    expect(e.mode).toBe('adv')
    expect(e.allRolls).toHaveLength(2)
  })

  it('setRollEffectsResolver(null) desliga', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    const resolver = makeResolver()
    act(() => result.current.setRollEffectsResolver(resolver))
    act(() => result.current.setRollEffectsResolver(null))
    act(() => { result.current.roll('1d20', 'X', { category: 'attack' }) })
    expect(resolver).not.toHaveBeenCalled()
  })

  it('aplica flatMod negativo na notação', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: -4 })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(1)
  })

  it('soma flatMod COM os riders de dado, sem substituir', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({
      extraDice: ['1d4'], flatMod: -2,
    })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(3)
    expect(out.groups).toHaveLength(2)
    expect(out.groups[1].sides).toBe(4)
  })

  it('flatMod 0 não muda a notação', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: 0 })))
    let out
    act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
    expect(out.modifier).toBe(5)
  })

  it('ignora flatMod em notação sem dado (número puro)', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    act(() => result.current.setRollEffectsResolver(() => ({ flatMod: -4 })))
    let out
    act(() => { out = result.current.roll('7', 'Fixo', { category: 'check' }) })
    expect(out.total).toBe(7)
  })

  it('ignora flatMod que não seja número finito, em vez de quebrar a rolagem', () => {
    const { result } = renderHook(() => useDiceRoller(), { wrapper })
    for (const ruim of ['−4', '-4', NaN, Infinity, null, undefined]) {
      act(() => result.current.setRollEffectsResolver(() => ({ flatMod: ruim })))
      let out
      act(() => { out = result.current.roll('1d20+5', 'Teste', { category: 'check' }) })
      expect(out).not.toBeNull()
      expect(out.modifier).toBe(5)
    }
  })
})
