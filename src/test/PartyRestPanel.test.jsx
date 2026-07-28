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

/** Os dois descansos confirmam antes de escrever — dispara os dois passos. */
async function descansoLongo() {
  await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
  await userEvent.click(screen.getByRole('button', { name: /^descansar$/i }))
}

async function descansoCurto() {
  await userEvent.click(screen.getByRole('button', { name: /descanso curto/i }))
  await userEvent.click(screen.getByRole('button', { name: /^descansar$/i }))
}

describe('PartyRestPanel', () => {
  it('descanso longo salva cada ficha com HP cheio e recursos recuperados', async () => {
    const onRested = vi.fn()
    render(<PartyRestPanel docs={docs} onRested={onRested} />)
    await descansoLongo()
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
    await descansoCurto()
    await waitFor(() => expect(api.calls).toHaveLength(2))
    const ana = api.calls.find(c => c.id === 'a')
    expect(ana.data.combat.currentHp).toBe(5)
    expect(ana.data.combat.hitDice.pool.d10).toEqual({ total: 3, used: 2 })
    expect(ana.data.combat.turnState).toEqual({ actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 })
  })

  it('uma ficha falhando não impede as outras e o erro aparece', async () => {
    api.results.a = { ok: false, reason: 'conflict' }
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await descansoLongo()
    await waitFor(() => expect(api.calls).toHaveLength(2))
    expect(await screen.findByText(/1 ficha descansou/i)).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('cancelar a confirmação não escreve em ficha nenhuma', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    expect(screen.getByText(/não há como desfazer/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(api.calls).toHaveLength(0)
    expect(screen.queryByText(/não há como desfazer/i)).not.toBeInTheDocument()
  })

  it('a confirmação nomeia quem vai ser afetado e avisa dos efeitos ativos', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    expect(screen.getByText(/Ana, Bruno/)).toBeInTheDocument()
    expect(screen.getByText(/efeitos ativos removidos/i)).toBeInTheDocument()
  })

  it('descanso curto também confirma, e o aviso é o do curto (não o do longo)', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso curto/i }))
    // Nada foi escrito só por abrir o diálogo.
    expect(api.calls).toHaveLength(0)
    expect(screen.getByText(/descanso curto da companhia\?/i)).toBeInTheDocument()
    expect(screen.getByText(/não gasta dado de vida e não cura PV/i)).toBeInTheDocument()
    // O texto do LONGO não pode aparecer no diálogo do curto.
    expect(screen.queryByText(/efeitos ativos removidos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PV cheio/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^descansar$/i }))
    await waitFor(() => expect(api.calls).toHaveLength(2))
  })

  it('cancelar o curto não escreve nada', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso curto/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(api.calls).toHaveLength(0)
  })

  it('abrir o curto depois de cancelar o longo não confunde os dois', async () => {
    render(<PartyRestPanel docs={docs} onRested={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /descanso longo/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    await descansoCurto()
    await waitFor(() => expect(api.calls).toHaveLength(2))
    // Se o tipo tivesse vazado, o curto teria zerado o HP temporário e curado.
    const ana = api.calls.find(c => c.id === 'a')
    expect(ana.data.combat.currentHp).toBe(5)
    expect(ana.data.combat.tempHp).toBe(4)
  })

  it('sem fichas o painel não oferece botão', () => {
    render(<PartyRestPanel docs={{}} onRested={() => {}} />)
    expect(screen.queryByRole('button', { name: /descanso longo/i })).toBeNull()
  })
})
