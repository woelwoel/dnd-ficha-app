import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KnownBeastsPanel } from '../systems/dnd5e/components/CharacterSheet/KnownBeastsPanel'

const BEASTS_FIXTURE = {
  beasts: [
    { index: 'wolf', name: 'Lobo', nameEn: 'Wolf', cr: 0.25, crLabel: '1/4', hp: 11, ac: 13,
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' } } },
    { index: 'eagle', name: 'Águia', nameEn: 'Eagle', cr: 0, crLabel: '0', hp: 3, ac: 12,
      speed: { walk: { ft: 10, m: 3, label: 'caminhar' }, fly: { ft: 60, m: 18, label: 'voar' } } },
  ],
}

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(BEASTS_FIXTURE) }))
})

function makeChar(knownBeasts = []) {
  return { info: { class: 'druida', level: 4 }, combat: { knownBeasts } }
}

describe('<KnownBeastsPanel>', () => {
  it('lista bestas e marca uma não conhecida ao clicar', async () => {
    const user = userEvent.setup()
    const onToggleKnownBeast = vi.fn()
    render(
      <KnownBeastsPanel druidaLevel={4} character={makeChar([])} onToggleKnownBeast={onToggleKnownBeast} />
    )
    await user.click(screen.getByRole('button', { name: /bestas conhecidas/i }))
    const wolfToggle = await screen.findByRole('button', { name: /Lobo/ })
    await user.click(wolfToggle)
    expect(onToggleKnownBeast).toHaveBeenCalledWith('wolf')
  })

  it('mostra contagem de conhecidas', async () => {
    const user = userEvent.setup()
    render(
      <KnownBeastsPanel druidaLevel={4} character={makeChar(['wolf'])} onToggleKnownBeast={() => {}} />
    )
    await user.click(screen.getByRole('button', { name: /bestas conhecidas/i }))
    expect(await screen.findByText(/1 conhecida/i)).toBeInTheDocument()
  })
})
