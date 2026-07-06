import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockCtx = vi.hoisted(() => ({ value: {} }))
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => mockCtx.value,
}))

const mockSupported = vi.hoisted(() => ({ fn: vi.fn(() => true) }))
vi.mock('../components/DiceRoller/dice3d', () => ({
  isDice3dSupported: () => mockSupported.fn(),
}))

import { DiceHistoryPanel } from '../components/DiceRoller/DiceHistoryPanel'

function makeCtx(overrides = {}) {
  return {
    history: [], open: true, mode: 'normal', dice3d: true,
    roll: vi.fn(), clearHistory: vi.fn(), togglePanel: vi.fn(),
    openPanel: vi.fn(), setMode: vi.fn(), setDice3d: vi.fn(),
    setDiceAccent: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockSupported.fn.mockReturnValue(true)
})

describe('DiceHistoryPanel — toggle 3D', () => {
  it('ligado: botão pressionado; clique desliga', async () => {
    const setDice3d = vi.fn()
    mockCtx.value = makeCtx({ dice3d: true, setDice3d })
    render(<DiceHistoryPanel />)
    const btn = screen.getByRole('button', { name: 'Desativar dados 3D' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(btn)
    expect(setDice3d).toHaveBeenCalledWith(false)
  })

  it('desligado: clique liga', async () => {
    const setDice3d = vi.fn()
    mockCtx.value = makeCtx({ dice3d: false, setDice3d })
    render(<DiceHistoryPanel />)
    const btn = screen.getByRole('button', { name: 'Ativar dados 3D' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(btn)
    expect(setDice3d).toHaveBeenCalledWith(true)
  })

  it('sem suporte (WebGL/reduced-motion): toggle nem aparece', () => {
    mockSupported.fn.mockReturnValue(false)
    mockCtx.value = makeCtx()
    render(<DiceHistoryPanel />)
    expect(screen.queryByRole('button', { name: /dados 3D/ })).toBeNull()
  })
})
