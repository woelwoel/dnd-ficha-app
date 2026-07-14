import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SourcePicker } from '../../systems/dnd5e/components/SourcePicker'

describe('SourcePicker', () => {
  it('PHB aparece sempre marcado e travado', () => {
    render(<SourcePicker value={['phb']} onChange={() => {}} />)
    const phb = screen.getByLabelText(/Livro do Jogador/i)
    expect(phb).toBeChecked()
    expect(phb).toBeDisabled()
  })
  it('ligar Tasha emite ["phb","tasha"]', () => {
    const onChange = vi.fn()
    render(<SourcePicker value={['phb']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Tasha/i))
    expect(onChange).toHaveBeenCalledWith(['phb', 'tasha'])
  })
  it('desligar Tasha emite ["phb"]', () => {
    const onChange = vi.fn()
    render(<SourcePicker value={['phb', 'tasha']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/Tasha/i))
    expect(onChange).toHaveBeenCalledWith(['phb'])
  })
  it('PHB mostra "sempre ativo"; as demais mostram a abreviação (TCE/XGE)', () => {
    render(<SourcePicker value={['phb']} onChange={() => {}} />)
    expect(screen.getByText(/sempre ativo/i)).toBeInTheDocument()
    expect(screen.getByText('TCE')).toBeInTheDocument()
    expect(screen.getByText('XGE')).toBeInTheDocument()
  })
})
