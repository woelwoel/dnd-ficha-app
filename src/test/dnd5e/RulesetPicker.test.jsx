import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesetPicker } from '../../systems/dnd5e/components/RulesetPicker'

describe('RulesetPicker', () => {
  it('mostra as duas opções com o rótulo em PT-BR', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeInTheDocument()
  })

  it('marca a opção do valor atual', () => {
    render(<RulesetPicker value="2024" onChange={() => {}} />)
    expect(screen.getByLabelText(/D&D 5e \(2024\)/)).toBeChecked()
    expect(screen.getByLabelText(/D&D 5e \(2014\)/)).not.toBeChecked()
  })

  it('avisa o chamador ao trocar', async () => {
    const onChange = vi.fn()
    render(<RulesetPicker value="2014" onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    expect(onChange).toHaveBeenCalledWith('2024')
  })

  it('deixa claro que a escolha é definitiva', () => {
    render(<RulesetPicker value="2014" onChange={() => {}} />)
    expect(screen.getByText(/não dá para trocar depois|imutável|definitiv/i)).toBeInTheDocument()
  })
})
