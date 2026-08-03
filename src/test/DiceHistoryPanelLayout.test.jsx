import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockCtx = vi.hoisted(() => ({ value: {} }))
vi.mock('../hooks/useDiceRoller', () => ({
  useDiceRoller: () => mockCtx.value,
}))
vi.mock('../components/DiceRoller/dice3d', () => ({
  isDice3dSupported: () => false,
}))

import { DiceHistoryPanel } from '../components/DiceRoller/DiceHistoryPanel'

function makeCtx(overrides = {}) {
  return {
    history: [], open: true, mode: 'normal', dice3d: false,
    roll: vi.fn(), clearHistory: vi.fn(), togglePanel: vi.fn(),
    openPanel: vi.fn(), setMode: vi.fn(), setDice3d: vi.fn(),
    setDiceAccent: vi.fn(),
    ...overrides,
  }
}

/** O painel é o único elemento com position:fixed vindo do portal. */
function panelEl() {
  return screen.getByText('Rolagens').closest('div[style]')
}

beforeEach(() => {
  mockCtx.value = makeCtx()
})

describe('DiceHistoryPanel — altura', () => {
  /* Sem o piso, em viewport deitado (812×375) os 60vh davam 225px e sobravam
     24px pro histórico — menos que uma entrada. O piso de 340px só age quando
     60vh cai abaixo dele (portanto desktop e retrato ficam idênticos).

     O teto é ABSOLUTO de propósito: com um teto em `vh` o painel estourava o
     topo da tela, porque `vh` não desconta a barra de rolagem horizontal e a
     âncora de baixo custa mais 25px. Medido no browser. */
  it('mistura piso absoluto e teto que desconta a âncora de baixo', () => {
    render(<DiceHistoryPanel />)
    expect(panelEl().style.maxHeight).toBe('min(calc(100vh - 72px), max(60vh, 340px))')
  })
})

describe('DiceHistoryPanel — estado vazio', () => {
  it('aponta o rolador livre logo acima, além do 🎲 da ficha', () => {
    render(<DiceHistoryPanel />)
    expect(screen.getByText(/Nenhuma rolagem ainda/)).toBeInTheDocument()
    expect(screen.getByText(/Role um dado na barra acima/)).toBeInTheDocument()
    expect(screen.getByText(/perícias, salvaguardas e ataques/)).toBeInTheDocument()
  })
})
