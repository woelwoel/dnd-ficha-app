import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter as render } from '../utils/renderWithRouter'

// Mockar useAuth — CharacterList passou a depender do AuthProvider (PR 1 auth Supabase).
// Esses testes não verificam comportamento de logout; basta um stub.
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}))

// Mock do storage Supabase — backend em memória controlado pelos testes.
const store = vi.hoisted(() => ({ rows: [] }))
vi.mock('../../utils/storage', () => ({
  loadCharacters: async () => [...store.rows],
  loadCharacterById: async (id) => store.rows.find(c => c.id === id) ?? null,
  upsertCharacter: async (c) => {
    const idx = store.rows.findIndex(r => r.id === c.id)
    if (idx >= 0) store.rows[idx] = c
    else store.rows.push(c)
    return { ok: true }
  },
  saveCharacterVersioned: async (c) => {
    const idx = store.rows.findIndex(r => r.id === c.id)
    if (idx >= 0) store.rows[idx] = c
    else store.rows.push(c)
    return { ok: true, version: 1 }
  },
  deleteCharacter: async (id) => {
    store.rows = store.rows.filter(c => c.id !== id)
    return { ok: true }
  },
  updateCharacterPosition: async (id, position) => {
    const r = store.rows.find(c => c.id === id)
    if (r) r.position = position
    return { ok: true }
  },
  touchCharacterLastOpened: async () => ({ ok: true }),
  exportAllCharacters: async () => ({ app: 'dnd-ficha-app', version: '1.0', exportedAt: '', count: store.rows.length, characters: [...store.rows] }),
  importAllCharacters: async () => ({ ok: true, imported: 0, invalid: 0, total: 0 }),
}))

import { CharacterList } from '../../components/CharacterList'
import { upsertCharacter } from '../../utils/storage'

async function seed(id, name, klass) {
  await upsertCharacter({
    id,
    meta: {
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: '1.0',
      schemaVersion: 2,
    },
    info: { name, race: 'humano', class: klass, level: 3, alignment: '' },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: {
      maxHp: 20,
      currentHp: 20,
      tempHp: 0,
      armorClass: 12,
      speed: 30,
      hitDice: { pool: { d6: { total: 1, used: 0 } } },
      attacks: [],
      deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  })
}

describe('<CharacterList>', () => {
  beforeEach(() => {
    localStorage.clear()
    store.rows = []
  })

  it('renderiza toolbar com brand "Companhia"', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.queryAllByText(/Companhia/i).length).toBeGreaterThan(0)
  })

  it('renderiza EmptyState quando localStorage vazio', async () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(await screen.findByText(/Sua história começa aqui/i)).toBeInTheDocument()
  })

  it('renderiza tokens quando há personagens', async () => {
    await seed('a', 'Alice', 'Mago')
    await seed('b', 'Bob', 'Guerreiro')
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Bob').length).toBeGreaterThan(0)
  })

  it('toggla entre modo Mapa e Lista', async () => {
    await seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(await screen.findByRole('region', { name: /Mapa da campanha/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lista/i }))
    expect(screen.queryByRole('region', { name: /Mapa da campanha/i })).not.toBeInTheDocument()
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0)
  })

  it('CTA "Recrutar" chama onCreate', async () => {
    await seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Recrutar/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('pointerdown+pointerup no token chama onSelect com ID', async () => {
    await seed('a', 'Alice', 'Mago')
    const onSelect = vi.fn()
    render(<CharacterList onSelect={onSelect} onCreate={() => {}} />)
    const buttons = await screen.findAllByRole('button', { name: /Alice/i })
    const tokenButton = buttons[0]
    fireEvent.pointerDown(tokenButton, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 100, clientY: 100, pointerId: 1 })
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('a'))
  })
})
