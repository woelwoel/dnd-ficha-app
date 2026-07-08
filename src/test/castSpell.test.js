import { describe, it, expect, vi } from 'vitest'
import { executeCastPlan } from '../systems/dnd5e/components/CharacterSheet/castSpell'

// roll fake determinístico: d20 devolve o próximo valor da fila; dano devolve total 7.
function makeRoll(d20Queue = [10]) {
  const queue = [...d20Queue]
  const calls = []
  const roll = vi.fn((notation, label, opts = {}) => {
    calls.push({ notation, label, opts })
    if (/^1d20/.test(notation)) {
      const v = queue.shift() ?? 10
      return { notation, sides: 20, rolls: [v], modifier: 0, total: v, count: 1, mode: opts.mode ?? 'normal' }
    }
    return { notation, sides: 6, rolls: [7], modifier: 0, total: 7, count: 1, mode: 'normal' }
  })
  return { roll, calls }
}

const dmgStep = (over = {}) => ({
  kind: 'damage', notation: '2d6', label: 'X · dano', critLabel: 'X · dano CRÍTICO', critable: true, ...over,
})

describe('executeCastPlan', () => {
  it('ataque normal → dano normal', () => {
    const { roll, calls } = makeRoll([12])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls).toHaveLength(2)
    expect(calls[1]).toMatchObject({ notation: '2d6', label: 'X · dano', opts: {} })
  })

  it('nat 20 → dano com crit e critLabel', () => {
    const { roll, calls } = makeRoll([20])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls[1]).toMatchObject({ label: 'X · dano CRÍTICO', opts: { crit: true } })
  })

  it('nat 1 → dano pulado', () => {
    const { roll, calls } = makeRoll([1])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'X · ataque' }, dmgStep()], roll)
    expect(calls).toHaveLength(1)
  })

  it('beams: cada raio resolve o proprio critico', () => {
    const { roll, calls } = makeRoll([1, 20])
    executeCastPlan([
      { kind: 'attack', notation: '1d20+6', label: 'X · ataque · raio 1/2' },
      dmgStep({ label: 'X · dano · raio 1/2', critLabel: 'X · dano CRÍTICO · raio 1/2' }),
      { kind: 'attack', notation: '1d20+6', label: 'X · ataque · raio 2/2' },
      dmgStep({ label: 'X · dano · raio 2/2', critLabel: 'X · dano CRÍTICO · raio 2/2' }),
    ], roll)
    expect(calls.map(c => c.label)).toEqual([
      'X · ataque · raio 1/2', 'X · ataque · raio 2/2', 'X · dano CRÍTICO · raio 2/2',
    ])
  })

  it('dano sem critable (salvaguarda) rola direto, sem d20', () => {
    const { roll, calls } = makeRoll()
    executeCastPlan([dmgStep({ critable: false })], roll)
    expect(calls).toHaveLength(1)
    expect(calls[0].opts).toEqual({})
  })

  it('mode adv propaga so pros ataques', () => {
    const { roll, calls } = makeRoll([15])
    executeCastPlan([{ kind: 'attack', notation: '1d20+6', label: 'a' }, dmgStep()], roll, { mode: 'adv' })
    expect(calls[0].opts).toEqual({ mode: 'adv', category: 'attack' })
    expect(calls[1].opts).toEqual({})
  })

  it('heal acumula healTotal', () => {
    const { roll } = makeRoll()
    const { healTotal } = executeCastPlan([{ kind: 'heal', notation: '2d8+3', label: 'cura' }], roll)
    expect(healTotal).toBe(7)
  })
})
