import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RulesetBadge } from '../../systems/dnd5e/components/RulesetBadge'

describe('RulesetBadge', () => {
  it('não renderiza nada em ficha 2014 — a ficha fica idêntica ao que era', () => {
    const { container } = render(<RulesetBadge character={{ meta: { ruleset: '2014' } }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não renderiza nada em ficha legada sem o campo', () => {
    const { container } = render(<RulesetBadge character={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra o selo em ficha 2024', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24')).toBeInTheDocument()
  })

  it('explica o selo no title', () => {
    render(<RulesetBadge character={{ meta: { ruleset: '2024' } }} />)
    expect(screen.getByText('5e24').closest('[title]')?.getAttribute('title'))
      .toMatch(/2024/)
  })
})
