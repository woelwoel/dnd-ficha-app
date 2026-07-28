import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonsterGroupPanel } from '../systems/dnd5e/components/Encounter/MonsterGroupPanel'
import { emptyEncounterState, addNpc } from '../systems/dnd5e/domain/encounter'

const GOBLIN = { index: 'goblin', name: 'Goblin', hit_points: 7, hit_points_roll: '2d6', dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }

vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick(GOBLIN)}>stub-add-goblin</button>
    : null,
}))

function setup(initial = emptyEncounterState()) {
  const onChange = vi.fn()
  const utils = render(<MonsterGroupPanel value={initial} onChange={onChange} />)
  return { onChange, ...utils }
}

describe('MonsterGroupPanel', () => {
  it('adiciona monstro pelo bestiário e avisa o pai', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.combatants.map(c => c.name)).toEqual(['Goblin'])
  })

  it('lista os monstros já escolhidos com HP e CA', () => {
    setup(addNpc(emptyEncounterState(), GOBLIN))
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText(/7 PV · CA 15/)).toBeInTheDocument()
  })

  it('remover avisa o pai sem o monstro', async () => {
    const { onChange } = setup(addNpc(emptyEncounterState(), GOBLIN))
    await userEvent.click(screen.getByRole('button', { name: /remover goblin/i }))
    expect(onChange.mock.calls.at(-1)[0].combatants).toEqual([])
  })

  it('rolar HP é opção do momento de adicionar', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByLabelText(/rolar HP/i))
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    const npc = onChange.mock.calls.at(-1)[0].combatants[0]
    expect(npc.maxHp).toBeGreaterThanOrEqual(2)
    expect(npc.maxHp).toBeLessThanOrEqual(12)
  })
})
