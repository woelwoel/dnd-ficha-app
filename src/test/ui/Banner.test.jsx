import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Banner } from '../../components/ui/Banner'

describe('<Banner>', () => {
  it('renderiza texto do banner', () => {
    render(<Banner>⚜ Companhia do Vale ⚜</Banner>)
    expect(screen.getByText(/Companhia do Vale/i)).toBeInTheDocument()
  })

  it('aplica role="heading" implícito para acessibilidade', () => {
    render(<Banner>X</Banner>)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
  })

  it('contém SVG decorativo das fitas', () => {
    const { container } = render(<Banner>X</Banner>)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
