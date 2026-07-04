import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav, MOBILE_SECTIONS } from '../systems/dnd5e/components/CharacterSheet/v2/BottomNav'

describe('BottomNav', () => {
  it('renderiza as 5 seções e marca a ativa', () => {
    render(<BottomNav active="ficha" onChange={() => {}} />)
    expect(screen.getAllByRole('tab')).toHaveLength(MOBILE_SECTIONS.length)
    expect(screen.getByRole('tab', { name: 'Ficha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clique muda a seção', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BottomNav active="ficha" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Magias' }))
    expect(onChange).toHaveBeenCalledWith('magias')
  })

  it('navega com as setas (roving tabindex)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BottomNav active="ficha" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Ficha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('acoes')
  })
})
