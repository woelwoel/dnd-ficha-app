import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceBadge } from '../../systems/dnd5e/components/SourceBadge'

describe('SourceBadge', () => {
  it('não renderiza nada pro básico (phb)', () => {
    const { container } = render(<SourceBadge source="phb" />)
    expect(container).toBeEmptyDOMElement()
  })
  it('mostra a sigla pro Tasha', () => {
    render(<SourceBadge source="tasha" />)
    expect(screen.getByText('TCE')).toBeInTheDocument()
  })
  it('source desconhecida não quebra (não renderiza)', () => {
    const { container } = render(<SourceBadge source="xyz" />)
    expect(container).toBeEmptyDOMElement()
  })
})
