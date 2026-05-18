import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { matchesFilters, EMPTY_FILTERS, countActiveFilters } from '../../utils/spellFilters'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Filtros de Magia

   Como o FilterPanel não é exportado e o SpellPicker depende de muito
   estado (classData, slots, useClassSpells), validamos:
   1. Integração engine — fluxo realista combinando matchesFilters +
      countActiveFilters como o usuário faria.
   2. Harness de UI — replica a assinatura {filters, onChange} num
      componente mínimo, validando que a contagem se comporta correta
      em diferentes transições de estado.
   ────────────────────────────────────────────────────────────────────*/

describe('Filtros de Magia — engine integrada', () => {
  it('matchesFilters + countActiveFilters trabalham juntos em fluxo realista', () => {
    // Estado inicial: zero
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)

    // Usuário seleciona Evocação
    const f1 = { ...EMPTY_FILTERS, schools: new Set(['evocação']) }
    expect(countActiveFilters(f1)).toBe(1)

    // Adiciona "concentração=não"
    const f2 = { ...f1, concentration: 'no' }
    expect(countActiveFilters(f2)).toBe(2)

    // Bola de Fogo (Evocação, concentração=false) deve passar
    expect(matchesFilters({
      school: 'evocação', concentration: false, ritual: false,
      components: 'V, S, M', casting_time: '1 ação',
    }, f2)).toBe(true)

    // Hexar (Encantamento, concentração=true) NÃO passa
    expect(matchesFilters({
      school: 'encantamento', concentration: true, ritual: false,
      components: 'V, S, M', casting_time: '1 ação bônus',
    }, f2)).toBe(false)
  })
})

function PanelHarness() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  return (
    <>
      <div data-testid="count">{countActiveFilters(filters)}</div>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, schools: new Set([...filters.schools, 'evocação']) })}
      >Add Evocação</button>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, concentration: 'no' })}
      >Concentração não</button>
      <button
        type="button"
        onClick={() => setFilters({
          schools: new Set(),
          concentration: 'any',
          ritual: 'any',
          components: { v: 'any', s: 'any', m: 'any' },
          castingTimes: new Set(),
        })}
      >Limpar</button>
    </>
  )
}

describe('Fluxo de filtros (harness)', () => {
  beforeEach(() => {})
  afterEach(() => vi.restoreAllMocks())

  it('contagem incrementa a cada filtro adicionado e zera ao limpar', async () => {
    const user = userEvent.setup()
    render(<PanelHarness />)

    expect(screen.getByTestId('count').textContent).toBe('0')

    await user.click(screen.getByText('Add Evocação'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    await user.click(screen.getByText('Concentração não'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))

    await user.click(screen.getByText('Limpar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
  })
})
