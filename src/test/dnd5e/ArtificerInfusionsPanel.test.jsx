import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArtificerInfusionsPanel } from '../../systems/dnd5e/components/CharacterSheet/ArtificerInfusionsPanel'

const catalog = [
  { index: 'a', name: 'Arma Aprimorada', prereq: 2, itemType: 'arma', desc: 'desc A', source: 'tasha' },
  { index: 'b', name: 'Bota Veloz', prereq: 2, itemType: 'botas', desc: 'desc B', source: 'tasha' },
]
const base = {
  catalog, artificerLevel: 2, activeSources: ['phb', 'tasha'],
  inventoryItems: [{ id: 'i1', name: 'Espada' }],
}

describe('ArtificerInfusionsPanel', () => {
  it('mostra cap de conhecidas e permite adicionar', () => {
    const onChange = vi.fn()
    render(<ArtificerInfusionsPanel value={{ known: [], active: [] }} onChange={onChange} {...base} />)
    expect(screen.getByText(/0\s*\/\s*4/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Arma Aprimorada/i }))
    expect(onChange).toHaveBeenCalledWith({ known: ['a'], active: [] })
  })

  it('no cap de conhecidas, bloqueia adicionar', () => {
    const onChange = vi.fn()
    const cat5 = [...catalog,
      { index: 'c', name: 'C', prereq: 2, desc: 'c', source: 'tasha' },
      { index: 'd', name: 'D', prereq: 2, desc: 'd', source: 'tasha' },
      { index: 'e', name: 'E', prereq: 2, desc: 'e', source: 'tasha' }]
    render(<ArtificerInfusionsPanel value={{ known: ['a', 'b', 'c', 'd'], active: [] }} onChange={onChange} {...base} catalog={cat5} />)
    expect(screen.getByRole('button', { name: /Adicionar E/i })).toBeDisabled()
  })

  it('atribui infusão conhecida a um item (ativa)', () => {
    const onChange = vi.fn()
    render(<ArtificerInfusionsPanel value={{ known: ['a'], active: [] }} onChange={onChange} {...base} />)
    fireEvent.change(screen.getByLabelText(/Item para Arma Aprimorada/i), { target: { value: 'i1' } })
    expect(onChange).toHaveBeenCalledWith({ known: ['a'], active: [{ infusion: 'a', itemId: 'i1' }] })
  })

  it('readOnly desabilita ações', () => {
    render(<ArtificerInfusionsPanel value={{ known: ['a'], active: [] }} onChange={() => {}} {...base} readOnly />)
    expect(screen.getByRole('button', { name: /Adicionar Bota Veloz/i })).toBeDisabled()
  })
})
