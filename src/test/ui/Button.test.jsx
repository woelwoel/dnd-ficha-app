import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../components/ui/Button'

describe('<Button>', () => {
  it('renderiza children com role=button', () => {
    render(<Button onClick={() => {}}>Salvar</Button>)
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument()
  })

  it('dispara onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('aplica classe distinta para variant="gold"', () => {
    render(<Button variant="gold">G</Button>)
    // Variant "gold" usa gradiente dourado (amber-300 → amber-400) pra CTAs heróicos.
    expect(screen.getByRole('button').className).toMatch(/bg-gradient-to-b/)
    expect(screen.getByRole('button').className).toMatch(/amber-300/)
  })

  it('aplica classe distinta para variant="ghost"', () => {
    render(<Button variant="ghost">H</Button>)
    expect(screen.getByRole('button').className).toMatch(/border/)
  })

  it('renderiza disabled quando disabled=true', () => {
    render(<Button disabled>X</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('passa type="button" por padrão (evita submit acidental)', () => {
    render(<Button>X</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
