import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttributeBox } from '../systems/dnd5e/components/CharacterSheet/AttributeBox'
import { DiceRollerProvider } from '../context/DiceRollerContext'

function renderBox(props) {
  return render(
    <DiceRollerProvider>
      <AttributeBox abbr="FOR" name="Força" mode="manual" {...props} />
    </DiceRollerProvider>
  )
}

describe('AttributeBox — edição manual', () => {
  it('permite aumentar acima de 20 (teto absoluto 30)', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    renderBox({ value: 20, onChange })
    await user.click(screen.getByRole('button', { name: /Aumentar Força/i }))
    expect(onChange).toHaveBeenCalledWith(21)
  })

  it('não passa de 30', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    renderBox({ value: 30, onChange })
    await user.click(screen.getByRole('button', { name: /Aumentar Força/i }))
    expect(onChange).toHaveBeenCalledWith(30)
  })

  it('o input aceita até 30', () => {
    renderBox({ value: 18, onChange: vi.fn() })
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '30')
  })
})
