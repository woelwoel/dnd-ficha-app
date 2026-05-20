import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
import { upsertCharacter, loadCharacters } from '../../utils/storage'
import { clearStorage } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — CharacterList (Tomo dos Heróis)

   Cobre o ciclo: vazio → criar (callback) → exclui → estado limpo.
   ────────────────────────────────────────────────────────────────────*/

function makeCharacter(id, name, classIndex = 'mago', level = 1) {
  return {
    id,
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      schemaVersion: 2,
    },
    info: { name, race: 'humano', class: classIndex, level, alignment: '' },
    attributes: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
    combat: {
      maxHp: 8, currentHp: 8, tempHp: 0, armorClass: 12, speed: 30,
      hitDice: { pool: { d6: { total: 1, used: 0 } } },
      attacks: [], deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  }
}

describe('CharacterList E2E', () => {
  beforeEach(() => {
    clearStorage()
    store.rows = []
  })

  it('mostra estado vazio com placeholder e botão "Inscrever Novo Herói"', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText(/Tomo dos Heróis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Inscrever Novo Herói/ })).toBeInTheDocument()
  })

  it('botão "Inscrever Novo Herói" dispara callback onCreate', async () => {
    const onCreate = vi.fn()
    const user = userEvent.setup()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Inscrever Novo Herói/ }))
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it('renderiza fichas salvas e dispara onSelect ao clicar', async () => {
    const char = makeCharacter('test-id-1', 'Gandalf', 'mago', 5)
    await upsertCharacter(char)
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<CharacterList onSelect={onSelect} onCreate={() => {}} />)
    expect(screen.getByText('Gandalf')).toBeInTheDocument()
    expect(screen.getByText(/mago · Nível 5/i)).toBeInTheDocument()
    await user.click(screen.getByText('Gandalf'))
    expect(onSelect).toHaveBeenCalledWith('test-id-1')
  })

  it('confirma exclusão antes de remover do tomo', async () => {
    await upsertCharacter(makeCharacter('test-id-2', 'Frodo', 'ladino', 3))
    const user = userEvent.setup()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    // Botão "×" só aparece em hover, mas RTL não simula hover de CSS pseudo-classes.
    // O botão existe no DOM mesmo invisível — clica direto.
    const removeBtn = screen.getByTitle(/Riscar do tomo/i)
    await user.click(removeBtn)
    // Aparece confirmação "Riscar?" + botões Sim/Não
    expect(screen.getByText(/Riscar\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sim$/ })).toBeInTheDocument()
    // Cancelar mantém a ficha
    await user.click(screen.getByRole('button', { name: /^Não$/ }))
    expect(screen.getByText('Frodo')).toBeInTheDocument()
    // Re-confirma e dessa vez exclui
    await user.click(screen.getByTitle(/Riscar do tomo/i))
    await user.click(screen.getByRole('button', { name: /^Sim$/ }))
    expect(screen.queryByText('Frodo')).toBeNull()
    expect(loadCharacters()).toHaveLength(0)
  })

  it('lista persiste entre re-renders (localStorage)', async () => {
    await upsertCharacter(makeCharacter('id-a', 'Aragorn', 'guerreiro', 10))
    await upsertCharacter(makeCharacter('id-b', 'Legolas', 'patrulheiro', 8))
    const { unmount } = render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText('Aragorn')).toBeInTheDocument()
    expect(screen.getByText('Legolas')).toBeInTheDocument()
    unmount()
    // Remount carrega de novo do localStorage
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText('Aragorn')).toBeInTheDocument()
    expect(screen.getByText('Legolas')).toBeInTheDocument()
  })
})
