import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Estado controlável do fake da lib (hoisted pro vi.mock).
const fake = vi.hoisted(() => ({
  rollCalls: [],
  constructCount: 0,
  lastConfig: null,
  rollBehavior: () => Promise.resolve({}),
  initBehavior: () => Promise.resolve(),
}))

vi.mock('@3d-dice/dice-box-threejs', () => ({
  default: class FakeDiceBox {
    constructor(selector, config) {
      fake.constructCount += 1
      fake.lastConfig = config
    }
    initialize() { return fake.initBehavior() }
    roll(notation) { fake.rollCalls.push(notation); return fake.rollBehavior(notation) }
    clearDice() {}
  },
}))

import {
  DICE3D_SIDES, enqueueDice3d, isDice3dSupported,
  setDice3dAccent, __resetDice3dForTests,
} from '../components/DiceRoller/dice3d'

beforeEach(() => {
  __resetDice3dForTests()
  fake.rollCalls.length = 0
  fake.constructCount = 0
  fake.lastConfig = null
  fake.rollBehavior = () => Promise.resolve({})
  fake.initBehavior = () => Promise.resolve()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isDice3dSupported', () => {
  it('é false no jsdom (sem WebGL)', () => {
    expect(isDice3dSupported()).toBe(false)
  })
})

describe('DICE3D_SIDES', () => {
  it('cobre os dados padrão de D&D', () => {
    expect([...DICE3D_SIDES].sort((a, b) => a - b)).toEqual([4, 6, 8, 10, 12, 20, 100])
  })
})

describe('enqueueDice3d', () => {
  it('anima com a notação forçada e resolve {animated: true}', async () => {
    const res = await enqueueDice3d({ sides: 20, values: [12, 5], label: 'Teste', total: 17 })
    expect(res).toEqual({ animated: true })
    expect(fake.rollCalls).toEqual(['2d20@12,5'])
  })

  it('mostra o balão de resultado após os dados pararem', async () => {
    await enqueueDice3d({ sides: 20, values: [15], label: 'Atletismo', total: 20 })
    const toast = document.querySelector('.dice3d-toast')
    expect(toast).not.toBeNull()
    expect(toast.getAttribute('aria-live')).toBe('polite')
    expect(toast.textContent).toContain('Atletismo')
    expect(toast.textContent).toContain('20')
    expect(toast.classList.contains('dice3d-toast-visible')).toBe(true)
  })

  it('FIFO: a segunda rolagem só anima depois da primeira parar', async () => {
    let resolveFirst
    fake.rollBehavior = () => new Promise(r => { resolveFirst = r })
    const p1 = enqueueDice3d({ sides: 20, values: [12], label: 'a', total: 12 })
    const p2 = enqueueDice3d({ sides: 6, values: [3, 4], label: 'b', total: 7 })
    await vi.waitFor(() => expect(fake.rollCalls).toEqual(['1d20@12']))
    expect(fake.rollCalls).toHaveLength(1) // a segunda ainda não rolou
    fake.rollBehavior = () => Promise.resolve({})
    resolveFirst({})
    await p1
    await p2
    expect(fake.rollCalls[1]).toBe('2d6@3,4')
  })

  it('timeout de segurança: resolve mesmo se onRollComplete nunca disparar', async () => {
    vi.useFakeTimers()
    fake.rollBehavior = () => new Promise(() => {}) // nunca resolve
    const p = enqueueDice3d({ sides: 20, values: [9], label: 'x', total: 9 })
    await vi.advanceTimersByTimeAsync(5000)
    await expect(p).resolves.toEqual({ animated: true })
  })

  it('falha de init: resolve {animated: false} e não re-tenta na sessão', async () => {
    fake.initBehavior = () => Promise.reject(new Error('boom'))
    const r1 = await enqueueDice3d({ sides: 20, values: [4], label: 'x', total: 4 })
    expect(r1).toEqual({ animated: false })
    const r2 = await enqueueDice3d({ sides: 20, values: [8], label: 'y', total: 8 })
    expect(r2).toEqual({ animated: false })
    expect(fake.constructCount).toBe(1) // não tentou instanciar de novo
    expect(fake.rollCalls).toHaveLength(0)
  })

  it('accent da classe vira theme_customColorset; troca de accent recria a instância', async () => {
    setDice3dAccent('#e8b04c')
    await enqueueDice3d({ sides: 20, values: [11], label: 'x', total: 11 })
    expect(fake.constructCount).toBe(1)
    expect(fake.lastConfig.theme_customColorset.background).toBe('#e8b04c')

    setDice3dAccent(null) // saiu da ficha → colorset padrão
    await enqueueDice3d({ sides: 20, values: [7], label: 'y', total: 7 })
    expect(fake.constructCount).toBe(2)
    expect(fake.lastConfig.theme_customColorset.background).toBe('#3b2a1a')
  })
})
