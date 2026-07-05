import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiceRollerContext } from '../hooks/useDiceRoller'
import { makeDice } from './helpers/sheetV2TestContext'
import { RollableRow } from '../systems/dnd5e/components/CharacterSheet/v2/RollableRow'

describe('RollableRow', () => {
  it('é um button com aria-label e rola no click', async () => {
    const user = userEvent.setup()
    const roll = vi.fn()
    const openPanel = vi.fn()
    render(
      <DiceRollerContext.Provider value={makeDice({ roll, openPanel })}>
        <RollableRow notation="1d20+5" label="Atletismo" ariaLabel="Rolar Atletismo, bônus +5">
          <span>Atletismo</span><span>+5</span>
        </RollableRow>
      </DiceRollerContext.Provider>
    )
    const row = screen.getByRole('button', { name: 'Rolar Atletismo, bônus +5' })
    await user.click(row)
    expect(roll).toHaveBeenCalledWith('1d20+5', 'Atletismo', { crit: false })
    expect(openPanel).toHaveBeenCalled()
  })
})
