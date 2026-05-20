import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mockar useAuth — CharacterList passou a depender do AuthProvider (PR 1 auth Supabase).
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
import { upsertCharacter, loadCharacterById } from '../../utils/storage'

async function seed(id, name, klass, level = 3) {
  await upsertCharacter({
    id,
    meta: {
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: '1.0',
      schemaVersion: 3,
    },
    info: { name, race: 'humano', class: klass, level, alignment: '', multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: {
      maxHp: 20,
      currentHp: 20,
      tempHp: 0,
      armorClass: 12,
      speed: 30,
      hitDice: { pool: { d6: { total: 1, used: 0 } } },
      attacks: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [],
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, abilitiesByClass: {}, usedSlots: {}, pactSlotsUsed: 0, spellbook: [], spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  })
}

function mockMapRect(container, rect = { left: 0, top: 0, width: 1000, height: 800 }) {
  const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
  canvas.getBoundingClientRect = () => ({
    left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
    width: rect.width, height: rect.height, x: rect.left, y: rect.top, toJSON() {},
  })
}

describe('E2E — CharacterList Mapa', () => {
  beforeEach(() => {
    localStorage.clear()
    store.rows = []
  })

  it('fluxo: criar → ver token → arrastar → posição persiste', async () => {
    await seed('e2e-1', 'Heitor', 'Guerreiro')
    const { container, unmount } = render(
      <CharacterList onSelect={() => {}} onCreate={() => {}} />
    )

    // Aguardar carga async antes de medir o canvas (que só renderiza após).
    expect((await screen.findAllByText('Heitor')).length).toBeGreaterThan(0)
    mockMapRect(container)

    const buttons = screen.getAllByRole('button', { name: /Heitor/i })
    const tokenButton = buttons[0]
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 900, clientY: 720, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 900, clientY: 720, pointerId: 1 })

    const reloaded = await loadCharacterById('e2e-1')
    expect(reloaded.position.x).toBeCloseTo(0.9, 1)
    expect(reloaded.position.y).toBeCloseTo(0.9, 1)

    unmount()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect((await screen.findAllByText('Heitor')).length).toBeGreaterThan(0)
    const stillThere = await loadCharacterById('e2e-1')
    expect(stillThere.position.x).toBeCloseTo(0.9, 1)
  })

  it('fluxo: toggle Mapa → Lista persiste em localStorage', async () => {
    await seed('e2e-2', 'Lyra', 'Maga')
    const user = userEvent.setup()
    const { unmount } = render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)

    await user.click(await screen.findByRole('button', { name: /Lista/i }))
    expect(localStorage.getItem('dnd-ficha:char-list-view')).toBe('list')

    unmount()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.queryByRole('region', { name: /Mapa da campanha/i })).not.toBeInTheDocument()
    expect((await screen.findAllByText('Lyra')).length).toBeGreaterThan(0)
  })

  it('fluxo: estado vazio mostra CTA e dispara onCreate', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)

    expect(await screen.findByText(/Sua história começa aqui/i)).toBeInTheDocument()
    const ctas = screen.getAllByRole('button', { name: /Recrutar/i })
    await user.click(ctas[0])
    expect(onCreate).toHaveBeenCalled()
  })
})
