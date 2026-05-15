import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from '../../components/ui/Chip'

describe('<Chip>', () => {
  it('renderiza children como botão com aria-pressed', () => {
    render(<Chip active={false} onClick={() => {}}>Mago</Chip>)
    const btn = screen.getByRole('button', { name: /Mago/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('aria-pressed=true quando active=true', () => {
    render(<Chip active onClick={() => {}}>Mago</Chip>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('dispara onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>X</Chip>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('aplica visual distinto quando ativo', () => {
    const { rerender } = render(<Chip active={false}>X</Chip>)
    const inactive = screen.getByRole('button').className
    rerender(<Chip active>X</Chip>)
    const active = screen.getByRole('button').className
    expect(active).not.toBe(inactive)
  })
})
