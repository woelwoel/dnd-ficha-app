import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mockar useAuth — CharacterList passou a depender do AuthProvider (PR 1 auth Supabase).
// Esses testes não verificam comportamento de logout; basta um stub.
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}))

import { CharacterList } from '../../components/CharacterList'
import { upsertCharacter } from '../../utils/storage'

function seed(id, name, klass) {
  upsertCharacter({
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
  beforeEach(() => localStorage.clear())

  it('renderiza toolbar com brand "Companhia"', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.queryAllByText(/Companhia/i).length).toBeGreaterThan(0)
  })

  it('renderiza EmptyState quando localStorage vazio', () => {
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByText(/Sua história começa aqui/i)).toBeInTheDocument()
  })

  it('renderiza tokens quando há personagens', () => {
    seed('a', 'Alice', 'Mago')
    seed('b', 'Bob', 'Guerreiro')
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.queryAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Bob').length).toBeGreaterThan(0)
  })

  it('toggla entre modo Mapa e Lista', async () => {
    seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    render(<CharacterList onSelect={() => {}} onCreate={() => {}} />)
    expect(screen.getByRole('region', { name: /Mapa da campanha/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lista/i }))
    expect(screen.queryByRole('region', { name: /Mapa da campanha/i })).not.toBeInTheDocument()
    expect(screen.queryAllByText('Alice').length).toBeGreaterThan(0)
  })

  it('CTA "Recrutar" chama onCreate', async () => {
    seed('a', 'Alice', 'Mago')
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CharacterList onSelect={() => {}} onCreate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /Recrutar/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('pointerdown+pointerup no token chama onSelect com ID', () => {
    seed('a', 'Alice', 'Mago')
    const onSelect = vi.fn()
    render(<CharacterList onSelect={onSelect} onCreate={() => {}} />)
    const buttons = screen.getAllByRole('button', { name: /Alice/i })
    const tokenButton = buttons[0]
    fireEvent.pointerDown(tokenButton, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 100, clientY: 100, pointerId: 1 })
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})
