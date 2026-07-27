import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupPanel } from '../systems/dnd5e/components/Encounter/SetupPanel'

vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick({ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] })}>stub-add-goblin</button>
    : null,
}))

const party = [
  { characterId: 'a', name: 'Ana',   initiativeBonus: 2 },
  { characterId: 'b', name: 'Bruno', initiativeBonus: 0 },
]

function setup(props = {}) {
  const onStart = vi.fn()
  const utils = render(
    <SetupPanel party={party} onStart={onStart} rng={() => 0.5} {...props} />,
  )
  return { onStart, ...utils }
}

describe('SetupPanel', () => {
  it('lista a companhia com todos marcados', () => {
    setup()
    expect(screen.getByLabelText('Ana')).toBeChecked()
    expect(screen.getByLabelText('Bruno')).toBeChecked()
  })

  it('desmarcar tira o PJ do combate montado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByLabelText('Bruno'))
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.combatants.map(c => c.name)).toEqual(['Ana'])
  })

  it('adiciona monstro pelo bestiário e mostra na lista da cena', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Goblin 2')).toBeInTheDocument()
  })

  it('rolar iniciativa entrega o state já iniciado e ordenado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.started).toBe(true)
    expect(state.round).toBe(1)
    // d20 = 11 pra todos → Ana (+2) na frente de Bruno (+0)
    expect(state.combatants.map(c => c.name)).toEqual(['Ana', 'Bruno'])
    expect(state.activeId).toBe(state.combatants[0].id)
  })

  it('sem ninguém na cena o botão fica desabilitado', async () => {
    setup({ party: [] })
    expect(screen.getByRole('button', { name: /rolar iniciativa/i })).toBeDisabled()
  })
})
