import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BestiaryModal } from '../systems/dnd5e/components/Bestiary/BestiaryModal'

const GOBLIN = {
  index: 'goblin', name: 'Goblin', size: 'Small', type: 'humanoid',
  challenge_rating: 0.25, hit_points: 7, hit_points_roll: '2d6',
  dexterity: 14, xp: 50, armor_class: [{ value: 15 }],
  speed: { walk: '30 ft.' }, strength: 8, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8,
}

beforeEach(() => {
  global.fetch = vi.fn((url) =>
    Promise.resolve({ json: () => Promise.resolve(String(url).includes('-pt') ? [] : [GOBLIN]) }))
})

describe('BestiaryModal onPick', () => {
  it('sem onPick não mostra botão de adicionar', async () => {
    render(<BestiaryModal isOpen onClose={() => {}} />)
    await userEvent.click(await screen.findByText('Goblin'))
    expect(screen.queryByRole('button', { name: /adicionar ao combate/i })).toBeNull()
  })

  it('com onPick, o botão chama de volta com o monstro e o modal fica aberto', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<BestiaryModal isOpen onClose={onClose} onPick={onPick} />)
    await userEvent.click(await screen.findByText('Goblin'))
    const btn = await screen.findByRole('button', { name: /adicionar ao combate/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(2))
    expect(onPick.mock.calls[0][0]).toMatchObject({ index: 'goblin' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
