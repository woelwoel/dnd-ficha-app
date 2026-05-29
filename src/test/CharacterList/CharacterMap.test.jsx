import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterMap } from '../../components/CharacterList/CharacterMap'

const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, position: { x: 0.2, y: 0.3 } },
  { id: 'b', info: { name: 'Bob',   class: 'Guerreiro', level: 3 }, position: { x: 0.7, y: 0.6 } },
]

describe('<CharacterMap>', () => {
  it('renderiza o banner com nome de campanha', () => {
    render(<CharacterMap characters={chars} campaignName="⚜ Teste ⚜" onSelect={() => {}} />)
    expect(screen.getByText(/Teste/)).toBeInTheDocument()
  })

  it('renderiza um token para cada personagem', () => {
    render(<CharacterMap characters={chars} onSelect={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('aplica a classe .map-canvas no canvas (background-image vem do CSS)', () => {
    // Sprint K #31: background-image foi movido de inline style pra classe
    // .map-canvas em src/index.css (espelha MAP_BACKGROUND_URL do config).
    // O JSDOM não carrega o CSS importado, então conferimos a classe.
    const { container } = render(<CharacterMap characters={chars} onSelect={() => {}} />)
    const mapEl = container.querySelector('[data-testid="character-map-canvas"]')
    expect(mapEl).toHaveClass('map-canvas')
  })

  it('tem region landmark com aria-label', () => {
    render(<CharacterMap characters={chars} onSelect={() => {}} />)
    expect(screen.getByRole('region', { name: /Mapa da campanha/i })).toBeInTheDocument()
  })

  it('chama onSelect quando token recebe pointerDown+pointerUp na mesma posição (click puro)', () => {
    const onSelect = vi.fn()
    const { container } = render(<CharacterMap characters={chars} onSelect={onSelect} />)
    const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON() {},
    })
    const tokenButton = screen.getByRole('button', { name: /Alice/i })
    fireEvent.pointerDown(tokenButton, { clientX: 200, clientY: 240, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 200, clientY: 240, pointerId: 1 })
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('auto-posiciona quando position é null/undefined', () => {
    const minimal = [{ id: 'x', info: { name: 'X', class: 'Mago', level: 1 } }]
    render(<CharacterMap characters={minimal} onSelect={() => {}} />)
    expect(screen.getByText('X')).toBeInTheDocument() // não quebra
  })
})
