import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterMap } from '../../components/CharacterList/CharacterMap'

const chars = [
  { id: 'a', info: { name: 'Alice', class: 'Mago', level: 5 }, position: { x: 0.5, y: 0.5 } },
]

function mockBoundingRect(el, rect) {
  el.getBoundingClientRect = () => ({
    left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
    width: rect.width, height: rect.height, x: rect.left, y: rect.top,
    toJSON() {},
  })
}

describe('<CharacterMap> drag', () => {
  beforeEach(() => localStorage.clear())

  it('chama onPositionChange com novas coordenadas normalizadas após pointerup', () => {
    const onPositionChange = vi.fn()
    const { container } = render(
      <CharacterMap
        characters={chars}
        onSelect={() => {}}
        onPositionChange={onPositionChange}
      />
    )
    const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
    mockBoundingRect(canvas, { left: 0, top: 0, width: 1000, height: 800 })

    const tokenButton = screen.getByRole('button', { name: /Alice/i })
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 800, clientY: 600, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 800, clientY: 600, pointerId: 1 })

    expect(onPositionChange).toHaveBeenCalledTimes(1)
    const [id, pos] = onPositionChange.mock.calls[0]
    expect(id).toBe('a')
    expect(pos.x).toBeCloseTo(0.8, 1)
    expect(pos.y).toBeCloseTo(0.75, 1)
  })

  it('não dispara onSelect quando houve movimento (drag), só quando foi click puro', () => {
    const onSelect = vi.fn()
    const onPositionChange = vi.fn()
    const { container } = render(
      <CharacterMap
        characters={chars}
        onSelect={onSelect}
        onPositionChange={onPositionChange}
      />
    )
    const canvas = container.querySelector('[data-testid="character-map-canvas"]').parentElement
    mockBoundingRect(canvas, { left: 0, top: 0, width: 1000, height: 800 })

    const tokenButton = screen.getByRole('button', { name: /Alice/i })
    fireEvent.pointerDown(tokenButton, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 800, clientY: 600, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 800, clientY: 600, pointerId: 1 })

    expect(onSelect).not.toHaveBeenCalled()
    expect(onPositionChange).toHaveBeenCalled()
  })
})
