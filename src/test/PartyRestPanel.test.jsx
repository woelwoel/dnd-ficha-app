import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const api = vi.hoisted(() => ({ calls: [], results: {} }))

vi.mock('../lib/dmWrites', () => ({
  dmApplyCombatState: vi.fn(),
  dmSaveCharacter: vi.fn(async (id, data, v) => {
    api.calls.push({ id, data, v })
    return api.results[id] ?? { ok: true, version: v + 1 }
  }),
}))

const { PartyRestPanel } = await import('../systems/dnd5e/components/Encounter/PartyRestPanel')

function doc(id, name, currentHp) {
  return {
    id, version: 3,
    info: { name, level: 3, class: 'Guerreiro' },
    combat: {
      maxHp: 20, currentHp, tempHp: 4, conditions: [],
      hitDice: { pool: { d10: { total: 3, used: 2 } } },
      deathSaves: { successes: 1, failures: 2 },
      classFeatureUses: [],
      turnState: { actionUsed: true, bonusUsed: false, reactionUsed: false, movementUsed: 3 },
      activeEffects: [{ id: 'bless', name: 'Bênção', mods: {} }],
    },
    spellcasting: { usedSlots: { 1: 2 }, pactSlotsUsed: 1 },
  }
}

const docs = { a: doc('a', 'Ana', 5), b: doc('b', 'Bruno', 11) }

beforeEach(() => { api.calls = []; api.results = {} })

describe('PartyRestPanel', () => {
  it('descanso longo salva cada ficha com HP cheio e recursos recuperados', async () => {
    const onRested = vi.fn()
    render(<PartyRestPanel docs={docs} onRested={onRested} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    for (const call of api.calls) {
      expect(call.v).toBe(3)
      expect(call.data.combat.currentHp).toBe(20)
      expect(call.data.combat.tempHp).toBe(0)
      expect(call.data.combat.activeEffects).toEqual([])
      expect(call.data.spellcasting.usedSlots).toEqual({})
      expect(call.data.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
    }
    expect(await screen.findByText(/2 fichas descansaram/i)).toBeInTheDocument()
    expect(onRested).toHaveBeenCalled()
  })

  it('descanso curto NÃO gasta dados de vida nem cura', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso curto/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    const ana = api.calls.find(c => c.id === 'a')
    expect(ana.data.combat.currentHp).toBe(5)
    expect(ana.data.combat.hitDice.pool.d10).toEqual({ total: 3, used: 2 })
    expect(ana.data.combat.turnState).toEqual({ actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 })
  })

  it('uma ficha falhando não impede as outras e o erro aparece', async () => {
    api.results.a = { ok: false, reason: 'conflict' }
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
    expect(await screen.findByText(/1 ficha descansou/i)).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('sem fichas o painel não oferece botão', () => {
    render(<PartyRestPanel docs={{}} onRested={() => {}} />)
    expect(screen.queryByRole('button', { name: /descanso longo/i })).toBeNull()
  })
})
