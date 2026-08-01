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

  // As variantes deixaram de carregar utilitários de cor do Tailwind: aqueles
  // atravessavam a ponte, que achata cor por utilitário e fazia `bg-ink-500` e
  // `border-parchment-600` chegarem no escuro como a MESMA superfície — a
  // hierarquia existia no código e não aparecia na tela.
  it('omitir variant dá o primário, que é onde mora a hierarquia das telas', () => {
    render(<Button>P</Button>)
    expect(screen.getByRole('button').className).toMatch(/\bui-btn--primary\b/)
  })

  it('trata "gold" como apelido de primário', () => {
    render(<Button variant="gold">G</Button>)
    expect(screen.getByRole('button').className).toMatch(/\bui-btn--primary\b/)
  })

  it('aplica classe distinta para variant="ghost"', () => {
    render(<Button variant="ghost">H</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toMatch(/\bui-btn\b/)
    expect(cls).not.toMatch(/ui-btn--primary/)
  })

  it('aplica variant="danger" para ação destrutiva', () => {
    render(<Button variant="danger">D</Button>)
    expect(screen.getByRole('button').className).toMatch(/\bui-btn--danger\b/)
  })

  it('variant="quiet" não vira caixa nem herda o padding do tamanho', () => {
    render(<Button variant="quiet" size="lg">Q</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toMatch(/\bui-btn--quiet\b/)
    expect(cls).not.toMatch(/\bui-btn\b(?!--)/)
    expect(cls).not.toMatch(/px-/)
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
